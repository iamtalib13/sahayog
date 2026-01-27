import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor

def db_connection():
    try:
        creds = frappe.get_single("Finacle Settings")
        return psycopg2.connect(
            host=creds.host, port=creds.port, user=creds.user,
            password=creds.get_password("password"), database=creds.database_name
        )
    except Exception as e:
        print(f"DB Connection Failed: {e}")
        return None

@frappe.whitelist()
def sync_all_branches():
    """Called automatically by the Scheduler."""
    branches = frappe.get_all("Branch Petty Cash Account", filters={"status": "Active"}, pluck="branch")
    print(f"--- Starting Bulk Sync for {len(branches)} Branches ---")
    for branch in branches:
        fetch_finacle_balance(branch)
    print("--- Bulk Sync Completed ---")

@frappe.whitelist()
def fetch_finacle_balance(branch=None):
    # If called without argument (e.g. from bench execute), run all
    if not branch:
        return sync_all_branches()

    try:
        # 1. Get Wallet Info
        wallet = frappe.db.get_value("Branch Petty Cash Account", {"branch": branch}, ["name", "gl_sub_code"], as_dict=True)
        if not wallet or not wallet.gl_sub_code:
            print(f"Skipping {branch}: No Wallet or GL Code found.")
            return

        # 2. Connect & Fetch
        conn = db_connection()
        if not conn: return

        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            sql = "SELECT clr_bal_amt FROM tbaadm.gam WHERE del_flg = 'N' AND foracid = %s"
            cursor.execute(sql, (wallet.gl_sub_code,))
            result = cursor.fetchone()

        conn.close()

        # 3. Update Database
        if result:
            balance = float(result.get('clr_bal_amt', 0.0))
            
            # FORCE UPDATE via SQL + COMMIT
            frappe.db.sql("""
                UPDATE `tabBranch Petty Cash Account`
                SET current_balance = %s
                WHERE name = %s
            """, (balance, wallet.name))
            
            frappe.db.commit() # <--- CRITICAL: Ensures data is written to disk
            
            print(f"✅ Synced {branch}: New Balance ₹{balance}")
            return balance
        else:
            print(f"⚠️ Account {wallet.gl_sub_code} not found in Finacle.")

    except Exception as e:
        print(f"❌ Error syncing {branch}: {str(e)}")
        if frappe.request: frappe.throw(str(e))
