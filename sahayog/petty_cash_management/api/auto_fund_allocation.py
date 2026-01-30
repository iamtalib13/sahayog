import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt, getdate

# Reuse your existing connection function
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
def sync_fund_allocations_from_finacle():
    # 1. Fetch Branches with SEPARATE Fund Tracker Fields
    wallets = frappe.get_all("Branch Petty Cash Account", filters={"status": "Active"}, 
        fields=["name", "branch", "gl_sub_code", "last_synced_fund_id", "last_synced_fund_date"])
    
    print(f"--- Starting Fund Sync for {len(wallets)} Branches ---")
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for wallet in wallets:
            if not wallet.gl_sub_code: continue

            # Defaults
            last_id = wallet.last_synced_fund_id or '0'
            last_date = wallet.last_synced_fund_date or '2020-01-01'

            # 2. UNION Query (History + Daily) for CREDITS ('C')
            # Same robust logic as withdrawals, but for 'C' (Credit)
            sql = """
                SELECT tran_id, tran_date, tran_amt, part_tran_type
                FROM (
                    SELECT h.tran_id, h.tran_date, h.tran_amt, h.part_tran_type
                    FROM tbaadm.gam g
                    JOIN tbaadm.htd h ON g.acid = h.acid
                    WHERE g.foracid = %s 
                      AND h.part_tran_type = 'C' AND h.del_flg = 'N' AND g.entity_cre_flg = 'Y'
                      AND (h.tran_date > %s OR (h.tran_date = %s AND h.tran_id > %s))
                    
                    UNION ALL
                    
                    SELECT d.tran_id, d.tran_date, d.tran_amt, d.part_tran_type
                    FROM tbaadm.gam g
                    JOIN tbaadm.dtd d ON g.acid = d.acid
                    WHERE g.foracid = %s 
                      AND d.part_tran_type = 'C' AND d.del_flg = 'N' AND g.entity_cre_flg = 'Y'
                      AND (d.tran_date > %s OR (d.tran_date = %s AND d.tran_id > %s))
                ) as combined
                ORDER BY tran_date ASC, tran_id ASC
            """
            
            args = (
                wallet.gl_sub_code, last_date, last_date, last_id,
                wallet.gl_sub_code, last_date, last_date, last_id
            )
            
            cursor.execute(sql, args)
            transactions = cursor.fetchall()

            if not transactions: continue

            funds_found = False
            
            # Trackers
            highest_id = last_id
            highest_date = last_date

            for tx in transactions:
                tx_date = getdate(tx['tran_date'])
                tx_id = str(tx['tran_id'])

                # 1. Duplication Check
                exists = frappe.db.exists("Petty Cash Transaction", {
                    "finacle_tran_id": tx_id,
                    "transaction_type": "Fund Allocation",
                    "branch": wallet.branch
                })

                # 2. Update Trackers (Always move forward)
                is_newer_date = str(tx_date) > str(highest_date)
                is_same_date_higher_id = (str(tx_date) == str(highest_date)) and (
                    int(tx_id) > int(highest_id) if (tx_id.isdigit() and str(highest_id).isdigit()) else tx_id > str(highest_id)
                )

                if is_newer_date or is_same_date_higher_id:
                    highest_date = tx_date
                    highest_id = tx_id

                if exists: continue
                
                # 3. Create Fund Entry
                create_fund_entry(wallet, tx)
                funds_found = True

            # 4. Save Trackers
            frappe.db.set_value("Branch Petty Cash Account", wallet.name, {
                "last_synced_fund_id": highest_id,
                "last_synced_fund_date": highest_date
            })

            if funds_found:
                frappe.db.commit()
                # Assuming you have a function to update balance if needed (Funds usually increase bank bal, not cash in hand directly unless withdrawn)
                # fetch_finacle_balance(wallet.branch) 

    finally:
        conn.close()

def create_fund_entry(wallet, tx):
    amount = flt(tx['tran_amt'])
    doc = frappe.get_doc({
        "doctype": "Petty Cash Transaction",
        "transaction_type": "Fund Allocation",
        "branch": wallet.branch,
        "transaction_date": getdate(tx['tran_date']),
        "amount": amount,
        "approval_status": "Posted",
        "finacle_tran_id": str(tx['tran_id']),
        "finacle_transaction_id": str(tx['tran_id']),
        "posted_to_finacle": 1
    })
    doc.insert(ignore_permissions=True)
    doc.submit()
    print(f"💰 New Fund Detected: {wallet.branch} | ₹{amount}")
