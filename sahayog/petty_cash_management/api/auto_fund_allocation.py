import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt, getdate
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
def sync_fund_allocations_from_finacle():
    branches = frappe.get_all("Branch Petty Cash Account", filters={"status": "Active"}, fields=["name", "branch", "gl_sub_code"])
    print(f"--- Starting Fund Sync for {len(branches)} Branches ---")
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for wallet in branches:
            if not wallet.gl_sub_code: continue

            # Fetch New Credits
            sql = """
                SELECT h.tran_id, h.tran_date, h.tran_amt, h.tran_particular
                FROM tbaadm.gam g
                JOIN tbaadm.dtd h ON g.acid = h.acid
                WHERE g.del_flg = 'N' AND h.del_flg = 'N' AND g.entity_cre_flg = 'Y'
                  AND g.foracid = %s AND h.part_tran_type = 'C'
                ORDER BY h.tran_date DESC, h.tran_id DESC LIMIT 5
            """
            cursor.execute(sql, (wallet.gl_sub_code,))
            transactions = cursor.fetchall()

            if not transactions: continue

            funds_found = False
            for tx in transactions:
                exists = frappe.db.exists("Petty Cash Transaction", {
                    "finacle_tran_id": str(tx['tran_id']),
                    "transaction_type": "Fund Allocation",
                    "branch": wallet.branch
                })
                if exists: continue
                
                # Create Fund Entry
                create_fund_entry(wallet, tx)
                funds_found = True

            if funds_found:
                frappe.db.commit()
                # [TRIGGER] Update Balance immediately
                fetch_finacle_balance(wallet.branch)

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
