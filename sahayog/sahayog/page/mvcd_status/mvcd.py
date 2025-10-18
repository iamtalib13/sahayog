import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date

@frappe.whitelist()
def check_user_access():

    user = frappe.get_doc("User", frappe.session.user)
    roles = [role.role.lower().strip() for role in user.get("roles")]

    if "system manager" in roles:
        return {"allowed": True}

    employee = frappe.get_all(
        "Employee",
        filters={"user_id": frappe.session.user},
        fields=["designation"],
        limit=1
    )
    if employee:
        designation = (employee[0].designation or "").strip().lower()
        if (
            "branch operation manager" in designation
            or "cluster operation manager" in designation
            or "regional operation manager" in designation
        ):
            return {"allowed": True}

    return {"allowed": False}


def db_connection():
    """
    Connect to external PostgreSQL (Finacle). Uses Finacle Settings single doctype.
    """
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
        # Raise a frappe exception so frontend receives helpful message
        frappe.throw(_("Database Connection Error: {0}").format(str(e)))

@frappe.whitelist()
def test_db_connection():
    """
    Test connection to the external PostgreSQL DB (Finacle) without affecting normal db_connection().
    Returns: {"success": True/False, "message": "..."}
    """
    try:
        # Get credentials
        creds = frappe.get_single("Finacle Settings")
        
        # Attempt connection with a timeout
        conn = psycopg2.connect(
            host=creds.host,
            port=creds.port,
            user=creds.user,
            password=creds.get_password("password"),
            database=creds.database_name,
            connect_timeout=10  # 10 seconds timeout
        )
        conn.close()
        return {"success": True, "message": "Database connection successful!"}
    
    except Exception as e:
        # Log error internally for debugging
        frappe.log_error(frappe.get_traceback(), "DB Test Connection Failed")
        # Return failure to frontend without raising exception
        return {"success": False, "message": f"Database connection failed: {str(e)}"}
    

@frappe.whitelist(allow_guest=False)
def get_mvcd_status(tran_date=None):
    """
    Fetch MVCD Status for the given date (default: today)
    """
    try:
        if not tran_date:
            tran_date = date.today().strftime("%Y-%m-%d")
        
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        sql = """
            SELECT DISTINCT tran_id, a.dth_init_sol_id, b.sol_desc, tran_type, tran_sub_type, entry_user_id
            FROM tbaadm.dtd a, tbaadm.sol b
            WHERE pstd_flg ='N'
              AND a.del_flg ='N'
              AND a.dth_init_sol_id = b.sol_id
              AND tran_date = %s
        """
        cursor.execute(sql, (tran_date,))
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {"status": "success", "data": rows}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MVCD Status Query Error")
        return {"status": "error", "message": str(e)}




@frappe.whitelist(allow_guest=False)
def get_pending_transactions(tran_date=None):
    """
    Fetch MVCD Status for the given date (default: today).
    Returns default data if no records found.
    """
    try:
        if not tran_date:
            tran_date = date.today().strftime("%Y-%m-%d")
            
        
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        sql = """
            SELECT DISTINCT tran_id, a.dth_init_sol_id, b.sol_desc, tran_type, tran_sub_type, entry_user_id
            FROM tbaadm.dtd a, tbaadm.sol b
            WHERE pstd_flg ='N'
              AND a.del_flg ='N'
              AND a.dth_init_sol_id = b.sol_id
              AND tran_date = %s
        """
        cursor.execute(sql, (tran_date,))
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        
        return {"status": "success", "data": rows}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MVCD Status Query Error")
        return {"status": "error", "message": str(e)}





@frappe.whitelist(allow_guest=False)
def get_mvcd_status():
    """
    Fetch Pending Transactions where clr_bal_amt != 0 and bacid in specific list
    """
    try:
        bacid_list = (
            '11002001','11002002','11002003','11002004',
            '11002005','11002006','11002007','11002008'
        )

        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        sql = """
            SELECT a.sol_id, b.sol_desc, a.acct_name, a.foracid, a.clr_bal_amt
            FROM tbaadm.gam a, tbaadm.sol b
            WHERE a.bacid IN %s
              AND a.clr_bal_amt != '0'
              AND a.sol_id = b.sol_id
        """
        cursor.execute(sql, (bacid_list,))
        rows = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {"status": "success", "data": rows}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Pending Transactions Query Error")
        return {"status": "error", "message": str(e)}