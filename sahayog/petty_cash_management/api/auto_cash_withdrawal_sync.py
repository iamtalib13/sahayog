import frappe
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt, getdate
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
    """
    Syncs Cash Withdrawals from Finacle (Debits) to Portal.
    - Range: 01-Jan-2026 onwards
    - Logic: Creates 'Cash Withdrawal' transaction if not exists.
    - Effect: Increases Unsettled Cash (Liability).
    """
    wallets = frappe.get_all("Branch Petty Cash Account", 
        filters={"status": "Active"}, 
        fields=["name", "branch", "gl_sub_code"]
    )
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for w in wallets:
            if not w.gl_sub_code: continue

            # 1. Fetch Withdrawals from Jan 1, 2026
            # We fetch ALL transactions (no limit) to ensure we catch up on history
            sql = """
                SELECT h.tran_id, h.tran_amt, h.tran_date, h.part_tran_type
                FROM tbaadm.gam g
                JOIN tbaadm.htd h ON g.acid = h.acid
                WHERE g.foracid = %s 
                  AND h.part_tran_type = 'D' 
                  AND h.del_flg = 'N' 
                  AND h.tran_date >= '2026-01-01'
                ORDER BY h.tran_date ASC, h.tran_id ASC
            """
            cursor.execute(sql, (w.gl_sub_code,))
            transactions = cursor.fetchall()

            if not transactions: continue

            # 2. Process Withdrawals
            processed_any = False
            
            for tx in transactions:
                tran_id = str(tx['tran_id'])
                amount = flt(tx['tran_amt'])
                
                # --- CRITICAL CHECK: DUPLICATE PREVENTION ---
                # Check if we already created a transaction for this ID
                exists = frappe.db.exists("Petty Cash Transaction", {
                    "finacle_tran_id": tran_id,
                    "transaction_type": "Cash Withdrawal",
                    "branch": w.branch
                })
                
                if exists:
                    continue # Skip this transaction, it's already accounted for!

                # Create New Transaction Record
                try:
                    doc = frappe.get_doc({
                        "doctype": "Petty Cash Transaction",
                        "transaction_type": "Cash Withdrawal",
                        "branch": w.branch,
                        "transaction_date": getdate(tx['tran_date']),
                        "amount": amount,
                        "approval_status": "Posted",
                        "finacle_tran_id": tran_id,
                        "posted_to_finacle": 1,
                        "remarks": f"Auto-synced withdrawal (ID: {tran_id})"
                    })
                    doc.insert(ignore_permissions=True)
                    doc.submit() # This triggers on_submit -> updates unsettled_cash
                    
                    print(f"💸 Withdrawal Synced: {w.branch} | ₹{amount} | ID: {tran_id}")
                    processed_any = True
                    
                except Exception as e:
                    print(f"Error creating doc for {w.branch}: {str(e)}")
                    frappe.log_error(f"Withdrawal Sync Error {w.branch}", str(e))

            if processed_any:
                frappe.db.commit()
                # Update Balance to stay in sync
                fetch_finacle_balance(w.branch)

    finally:
        conn.close()
