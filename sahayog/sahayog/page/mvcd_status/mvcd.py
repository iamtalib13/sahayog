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
def get_mvcd_dashboard_data(tran_date=None, force=False):
    """
    Fetch both MVCD status and pending transactions in a single DB connection,
    caching results to avoid database connection overload.
    """
    try:
        if not tran_date:
            tran_date = date.today().strftime("%Y-%m-%d")
            
        cache_key = f"mvcd_dashboard_data:{tran_date}"
        
        # Check cache unless forced to refresh
        if not frappe.parse_json(force):
            cached_data = frappe.cache().get_value(cache_key)
            if cached_data:
                return cached_data
                
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query 1: MVCD Status (gam table)
        bacid_list = (
            '11002001','11002002','11002003','11002004',
            '11002005','11002006','11002007','11002008'
        )
        mvcd_sql = """
            SELECT a.sol_id, b.sol_desc, a.acct_name, a.foracid, a.clr_bal_amt
            FROM tbaadm.gam a, tbaadm.sol b
            WHERE a.bacid IN %s
              AND a.clr_bal_amt != '0'
              AND a.sol_id = b.sol_id
        """
        cursor.execute(mvcd_sql, (bacid_list,))
        mvcd_data = cursor.fetchall()
        
        # Query 2: Pending Transactions (dtd table)
        trans_sql = """
            SELECT DISTINCT tran_id, a.dth_init_sol_id, b.sol_desc, tran_type, tran_sub_type, entry_user_id
            FROM tbaadm.dtd a, tbaadm.sol b
            WHERE pstd_flg ='N'
              AND a.del_flg ='N'
              AND a.dth_init_sol_id = b.sol_id
              AND tran_date = %s
        """
        cursor.execute(trans_sql, (tran_date,))
        trans_data = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        result = {
            "status": "success",
            "mvcd_data": mvcd_data,
            "trans_data": trans_data
        }
        
        # Cache results for 10 seconds to throttle concurrent request storm
        frappe.cache().set_value(cache_key, result, expires_in_sec=10)
        
        return result
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MVCD Dashboard Data Query Error")
        return {"status": "error", "message": str(e)}


@frappe.whitelist(allow_guest=False)
def get_mvcd_status(tran_date=None):
    """
    Backward-compatible wrapper to fetch MVCD Status.
    """
    res = get_mvcd_dashboard_data(tran_date=tran_date)
    if res.get("status") == "success":
        return {"status": "success", "data": res.get("mvcd_data", [])}
    return res


@frappe.whitelist(allow_guest=False)
def get_pending_transactions(tran_date=None):
    """
    Backward-compatible wrapper to fetch Pending Transactions.
    """
    res = get_mvcd_dashboard_data(tran_date=tran_date)
    if res.get("status") == "success":
        return {"status": "success", "data": res.get("trans_data", [])}
    return res

@frappe.whitelist()
def get_batch_data():
    branches = frappe.get_all("Sahayog Branch", fields=["sol_id", "batch"], filters={"batch": ["is", "set"]})
    batches = {}
    for b in branches:
        if b.batch not in batches:
            batches[b.batch] = []
        batches[b.batch].append(str(b.sol_id))
    return batches