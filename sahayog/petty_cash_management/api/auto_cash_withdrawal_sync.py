import frappe
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt

# Reuse your existing DB connection logic
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
    Runs every 30 mins. Checks Finacle for new Debits (Withdrawals)
    and updates 'Unsettled Cash'.
    """
    # 1. Get Wallets
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

            # 2. Fetch New Debits (Withdrawals)
            # We look for transactions NEWER than the last one we saw
            sql = """
                SELECT h.tran_id, h.tran_amt, h.part_tran_type
                FROM tbaadm.gam g
                JOIN tbaadm.htd h ON g.acid = h.acid
                WHERE g.foracid = %s
                  AND h.part_tran_type = 'D'  -- 👈 DEBITS ONLY
                  AND h.del_flg = 'N'
                  AND h.tran_id > %s          -- 👈 ONLY NEW TRANSACTIONS
                ORDER BY h.tran_id ASC
            """
            
            # Default last_id to '0' if None
            last_id = w.last_synced_transaction_id or '0'
            
            cursor.execute(sql, (w.gl_sub_code, last_id))
            transactions = cursor.fetchall()

            if not transactions: continue

            # 3. Process each withdrawal
            doc = frappe.get_doc("Branch Petty Cash Account", w.name)
            highest_id = last_id

            for tx in transactions:
                amount = flt(tx['tran_amt'])
                
                # Update the Unsettled Cash bucket
                doc.update_unsettled_cash(amount, "Withdrawal")
                
                print(f"💸 Withdrawal Detected: {w.branch} | ₹{amount}")
                
                # Keep track of the highest ID processed
                if str(tx['tran_id']) > str(highest_id):
                    highest_id = str(tx['tran_id'])

            # Update the tracker ID so we don't process these again
            frappe.db.set_value("Branch Petty Cash Account", w.name, 
                "last_synced_transaction_id", highest_id)
            
            frappe.db.commit()

    finally:
        conn.close()
