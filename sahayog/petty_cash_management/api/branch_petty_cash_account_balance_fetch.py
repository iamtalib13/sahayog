import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor

# --- 1. Database Connection ---
def db_connection():
    """Connect to external PostgreSQL (Finacle)."""
    try:
        creds = frappe.get_single("Finacle Settings")
        conn = psycopg2.connect(
            host=creds.host,
            port=creds.port,
            user=creds.user,
            password=creds.get_password("password"),
            database=creds.database_name
        )
        return conn
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PostgreSQL Connection Failed")
        # Only throw error if a User is clicking the button
        if frappe.request:
            frappe.throw(_("Database Connection Error: {0}").format(str(e)))
        return None

# --- 2. Scheduler Logic (The Loop) ---
def sync_all_branches():
    """Called automatically by the Scheduler."""
    # Fetch all Active branches
    branches = frappe.get_all("Branch Petty Cash Account", filters={"status": "Active"}, pluck="branch")
    
    print(f"--- Starting Bulk Sync for {len(branches)} Branches ---")
    
    for branch in branches:
        try:
            # We call the main function for each branch individually
            fetch_finacle_balance(branch)
        except Exception as e:
            # Log error but continue to next branch so one failure doesn't stop the job
            print(f"Failed to sync branch {branch}: {str(e)}")
            frappe.log_error(f"Failed to sync branch {branch}: {str(e)}", "Daily Balance Sync Error")

    print("--- Bulk Sync Completed ---")

# --- 3. Main API (Handles Both Button & Scheduler) ---
@frappe.whitelist()
def fetch_finacle_balance(branch=None):
    """
    If 'branch' is passed -> Updates single branch (Button Click)
    If 'branch' is None   -> Updates ALL branches (Scheduler)
    """
    
    # CASE A: Scheduler called this without arguments
    if not branch:
        return sync_all_branches()

    # CASE B: Button Click or Single Sync
    conn = None
    try:
        # 1. Get Wallet Document Name & GL Code
        # We use db.get_value to find the document name from the Branch ID
        wallet_name = frappe.db.get_value("Branch Petty Cash Account", {"branch": branch}, "name")
        
        if not wallet_name:
            if frappe.request: frappe.throw(_("Branch Petty Cash Account not found for branch: {0}").format(branch))
            return

        gl_code = frappe.db.get_value("Branch Petty Cash Account", wallet_name, "gl_sub_code")

        if not gl_code:
            msg = f"GL Sub Code missing for branch {branch}"
            if frappe.request: frappe.throw(_(msg))
            print(msg)
            return

        # 2. Connect to DB
        conn = db_connection()
        if not conn: return 

        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # 3. The Query
        sql = """
            SELECT clr_bal_amt
            FROM tbaadm.gam
            WHERE del_flg = 'N'
              AND foracid = %s
        """

        # 4. Execute
        cursor.execute(sql, (gl_code,))
        result = cursor.fetchone()

        # 5. Process Result
        if result:
            balance = float(result.get('clr_bal_amt', 0.0))

            # Update the database directly (Bypasses Read-Only / validations)
            frappe.db.set_value("Branch Petty Cash Account", wallet_name, "current_balance", balance)
            frappe.db.commit()
            
            # If User clicked button -> Return value to JS
            if frappe.request:
                 return balance
            else:
                 # If Scheduler -> Just print log
                 print(f"Synced {branch}: ₹{balance}")
                 return balance
        else:
            msg = f"Account {gl_code} not found in Finacle."
            if frappe.request: frappe.msgprint(_(msg))
            print(msg)
            return None

    except Exception as e:
        # If User Interface, throw error to show them
        if frappe.request:
            frappe.throw(_("Error fetching balance: {0}").format(str(e)))
        else:
            # If Scheduler, raise it so sync_all_branches can catch and log it
            raise e 
        
    finally:
        if conn:
            conn.close()
