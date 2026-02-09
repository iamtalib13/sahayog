import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt, getdate, nowdate

# Import the fixed balance fetcher
from sahayog.petty_cash_management.api.branch_petty_cash_account_balance_fetch import fetch_finacle_balance

def db_connection():
    try:
        creds = frappe.get_single("Finacle Settings")
        return psycopg2.connect(
            host=creds.host, port=creds.port, user=creds.user,
            password=creds.get_password("password"), database=creds.database_name
        )
    except Exception:
        return None

@frappe.whitelist()
def sync_finacle_withdrawals():
    # 1. Fetch Wallets with Tracking Data
    wallets = frappe.get_all("Branch Petty Cash Account", 
        filters={"status": "Active"}, 
        fields=["name", "branch", "gl_sub_code", "last_synced_transaction_id", "last_synced_date"]
    )
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for w in wallets:
            if not w.gl_sub_code: continue

            # --- PREPARE QUERY ARGUMENTS ---
            # Default to a safe past date if never synced
            last_date = w.last_synced_date or '2025-01-01'
            last_id = w.last_synced_transaction_id or '0'

            # --- THE ROBUST UNION QUERY ---
            # We filter by date/ID to minimize data transfer, but the 'exists' check in Python is the real safety net.
            # We fetch 'D' (Debit) transactions only.
            sql = """
                SELECT 
                    tran_id, tran_date, tran_amt, part_tran_type, tran_particular
                FROM (
                    SELECT h.tran_id, h.tran_date, h.tran_amt, h.part_tran_type, h.tran_particular
                    FROM tbaadm.gam g
                    JOIN tbaadm.htd h ON g.acid = h.acid
                    WHERE g.foracid = %s 
                      AND h.part_tran_type = 'D' AND h.del_flg = 'N'
                      AND (h.tran_date > %s OR (h.tran_date = %s AND h.tran_id > %s))
                    
                    UNION ALL
                    
                    SELECT d.tran_id, d.tran_date, d.tran_amt, d.part_tran_type, d.tran_particular
                    FROM tbaadm.gam g
                    JOIN tbaadm.dtd d ON g.acid = d.acid
                    WHERE g.foracid = %s 
                      AND d.part_tran_type = 'D' AND d.del_flg = 'N'
                      AND (d.tran_date > %s OR (d.tran_date = %s AND d.tran_id > %s))
                ) as combined
                ORDER BY tran_date ASC, tran_id ASC
            """
            
            # Pass arguments twice (once for HTD, once for DTD)
            args = (
                w.gl_sub_code, last_date, last_date, last_id,
                w.gl_sub_code, last_date, last_date, last_id
            )
            
            cursor.execute(sql, args)
            transactions = cursor.fetchall()

            if not transactions: continue

            # --- PROCESSING ---
            doc = frappe.get_doc("Branch Petty Cash Account", w.name)
            
            updates_made = False
            
            # Initialize trackers with current DB values
            highest_id = last_id
            highest_date = last_date

            for tx in transactions:
                # Convert to Python types for safe comparison
                tx_date = getdate(tx['tran_date'])
                tx_id = str(tx['tran_id'])
                amount = flt(tx['tran_amt'])

                # 1. DUPLICATE CHECK (The Core Safety Mechanism)
                # Check if this exact transaction (ID + Branch) already exists in our system.
                # We check purely by ID logic.
                exists = frappe.db.exists("Petty Cash Transaction", {
                    "finacle_tran_id": tx_id,
                    "branch": w.branch,
                    # We remove 'transaction_type' filter to be extra safe: 
                    # if ANY record exists with this Finacle ID, we skip.
                })

                # 2. UPDATE TRACKERS (Always move forward)
                # We must update our "High Water Mark" even if we skip the transaction (because we already have it).
                # Logic: If Date is newer -> Update. If Date is same but ID is higher -> Update.
                is_newer_date = str(tx_date) > str(highest_date)
                is_same_date_higher_id = (str(tx_date) == str(highest_date)) and (
                    # Handle string vs int comparison safely
                    int(tx_id) > int(highest_id) if (tx_id.isdigit() and str(highest_id).isdigit()) else tx_id > str(highest_id)
                )

                if is_newer_date or is_same_date_higher_id:
                    highest_date = tx_date
                    highest_id = tx_id

                if exists:
                    # Log that we saw it but skipped it
                    # print(f"⚠️ Skipping Duplicate: {tx_id} for {w.branch}")
                    continue

                # 3. APPLY UPDATES (If it doesn't exist)
                # A. Update Balance
                doc.update_unsettled_cash(amount, "Withdrawal")
                
                # B. Create Record
                create_withdrawal_entry(w, tx)
                
                print(f"✅ Synced: {w.branch} | ID: {tx_id} | Amt: {amount} | Date: {tx_date}")
                updates_made = True

            # 4. SAVE NEW CHECKPOINTS
            # We save the highest ID/Date seen in this batch so next cron starts after them.
            frappe.db.set_value("Branch Petty Cash Account", w.name, {
                "last_synced_transaction_id": highest_id,
                "last_synced_date": highest_date
            })
            
            if updates_made:
                frappe.db.commit()
                # Trigger Balance Fetch to sync Finacle Bank Balance too
                fetch_finacle_balance(w.branch)

    finally:
        conn.close()


def create_withdrawal_entry(wallet, tx):
    amount = flt(tx['tran_amt'])
    tx_date = getdate(tx['tran_date'])
    tx_id = str(tx['tran_id'])
    particulars = tx.get('tran_particular', 'Auto-synced Withdrawal')

    new_txn = frappe.get_doc({
        "doctype": "Petty Cash Transaction",
        "transaction_type": "Cash Withdrawal",  # Ensure this option exists in DocType
        "branch": wallet.branch,
        "transaction_date": tx_date,
        "amount": amount,
        "approval_status": "Posted",
        "finacle_tran_id": tx_id,          # This is the key for duplication check
        "reference_number": tx_id,
        "posted_to_finacle": 1,
        "remarks": f"{particulars} (Ref: {tx_id})"
    })
    new_txn.insert(ignore_permissions=True)
    new_txn.submit()
