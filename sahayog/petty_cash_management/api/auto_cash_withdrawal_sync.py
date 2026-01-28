import frappe
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt
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
    wallets = frappe.get_all("Branch Petty Cash Account", 
        filters={"status": "Active"}, 
        fields=["name", "branch", "gl_sub_code", "last_synced_transaction_id"]
    )
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for w in wallets:
            if not w.gl_sub_code: continue

            # Fetch New Withdrawals
            last_id = w.last_synced_transaction_id or '0'
            sql = """
                SELECT h.tran_id, h.tran_amt, h.part_tran_type
                FROM tbaadm.gam g
                JOIN tbaadm.htd h ON g.acid = h.acid
                WHERE g.foracid = %s AND h.part_tran_type = 'D' 
                  AND h.del_flg = 'N' AND h.tran_id > %s
                ORDER BY h.tran_id ASC
            """
            cursor.execute(sql, (w.gl_sub_code, last_id))
            transactions = cursor.fetchall()

            if not transactions: continue

            # Process Withdrawals
            doc = frappe.get_doc("Branch Petty Cash Account", w.name)
            highest_id = last_id

            for tx in transactions:
                amount = flt(tx['tran_amt'])
                doc.update_unsettled_cash(amount, "Withdrawal") # Updates Unsettled Cash
                print(f"💸 Withdrawal Detected: {w.branch} | ₹{amount}")
                if str(tx['tran_id']) > str(highest_id):
                    highest_id = str(tx['tran_id'])

            # Save Last ID
            frappe.db.set_value("Branch Petty Cash Account", w.name, "last_synced_transaction_id", highest_id)
            frappe.db.commit()

            # [TRIGGER] Update Current Balance immediately
            fetch_finacle_balance(w.branch)

    finally:
        conn.close()
