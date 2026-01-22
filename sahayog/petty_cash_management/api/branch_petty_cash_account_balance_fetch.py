import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor

# Reuse your existing connection logic
def db_connection():
    """Connect to external PostgreSQL (Finacle/ODS)."""
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
        frappe.throw(_("Database Connection Error: {0}").format(str(e)))

@frappe.whitelist()
def fetch_finacle_balance(branch):
    """
    Fetches the real-time balance from the external Postgres DB
    using the Branch's GL Sub Code.
    """
    conn = None
    try:
        # 1. Get GL Sub Code
        wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": branch})
        
        if not wallet.gl_sub_code:
            frappe.throw(_("GL Sub Code is missing for this branch."))

        gl_code = wallet.gl_sub_code

        # 2. Connect to DB
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # 3. The Query (Adapted for Postgres with %s placeholder)
        sql = """
            SELECT
                g.foracid,
                g.acct_name,
                g.sol_id,
                g.clr_bal_amt
            FROM tbaadm.gam g
            WHERE g.del_flg = 'N'
              AND g.foracid = %s
        """

        # 4. Execute
        cursor.execute(sql, (gl_code,))
        result = cursor.fetchone() # Fetch single record

        # 5. Process Result
        if result:
            # Finacle usually stores balance in 'clr_bal_amt'
            # Convert Decimal/Float to standard float for Python
            balance = float(result.get('clr_bal_amt', 0.0))

            # 1. Update the database directly
            # This bypasses the "Read Only" restriction and saves immediately
            frappe.db.set_value("Branch Petty Cash Account", branch, "current_balance", balance)
            
            # Optional: Commit to ensure it's written (though set_value usually auto-commits)
            frappe.db.commit()
            
            # Optional: Log success for debugging
            # frappe.logger().info(f"Fetched Balance for {gl_code}: {balance}")
            
            return balance
        else:
            frappe.msgprint(_("Account Number <b>{0}</b> not found in the external database.").format(gl_code))
            return None

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Balance Fetch Failed for {branch}")
        frappe.throw(_("Error fetching balance: {0}").format(str(e)))
        
    finally:
        # 6. Clean up connection
        if conn:
            conn.close()
