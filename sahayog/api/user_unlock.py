import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor
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
            "branch manager" in designation
            or "branch operation manager" in designation
            or "branch opration manager" in designation  # typo handling
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
def get_locked_flg(account_number=None, user_id=None):
    """
    Get lock flag.
    - If account_number is provided -> check external finfadm.user_creds (is_locked_flg = 'Y'/'N')
    - If user_id is provided -> check internal User doctype (enabled flag / login_after)
    Returns: {"status":"success"/"error", "locked": True/False, "message": "..."}
    """
    try:

        if account_number:
            # external DB check
            conn = db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            sql = "SELECT is_locked_flg FROM finfadm.user_creds WHERE user_id = %s;"
            cursor.execute(sql, (account_number,))
            row = cursor.fetchone()
            cursor.close()
            conn.close()

            if not row:
                return {"status": "error", "message": _("Account not found in external DB")}
            locked = row.get("is_locked_flg") == "Y"
            return {"status": "success", "locked": locked}

        elif user_id:
            # internal Frappe User check
            # Check if user exists
            user_doc = frappe.db.get_value("User", user_id, ["enabled", "login_after"], as_dict=True)
            if not user_doc:
                return {"status": "error", "message": _("User not found")}
            # Decide locked: if enabled == 0 OR login_after is set to future -> treat as locked
            enabled = user_doc.get("enabled")
            login_after = user_doc.get("login_after")
            locked = (enabled == 0) or (login_after is not None)
            return {"status": "success", "locked": locked}
        else:
            return {"status": "error", "message": _("account_number or user_id required")}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get Locked Flag Error")
        return {"status": "error", "message": f"Error checking lock: {str(e)}"}


@frappe.whitelist(allow_guest=False)
def unlock_user(account_number=None, user_id=None):
    """
    Unlock user.
    - If account_number provided: update finfadm.user_creds is_locked_flg = 'N' in external DB
    - If user_id provided: update internal User (enabled=1, login_after=None)
    Only System Manager / Administrator allowed.
    Returns: {"status":"success"/"error", "message":"..."}
    """
    try:


        if account_number:
            # Update external database
            conn = db_connection()
            cursor = conn.cursor()
            sql = "UPDATE finfadm.user_creds SET is_locked_flg = 'N', num_pwd_attempts = 0 WHERE user_id = %s;"
            cursor.execute(sql, (account_number,))
            if cursor.rowcount == 0:
                # nothing updated -> account not found
                cursor.close()
                conn.close()
                return {"status": "error", "message": _("Account not found in external DB")}
            conn.commit()
            cursor.close()
            conn.close()
            return {"status": "success", "message": _("External account unlocked successfully.")}

        elif user_id:
            # Update internal Frappe User bypassing permission checks
            if not frappe.db.exists("User", user_id):
                return {"status": "error", "message": _("User not found")}

            # Set fields bypassing doc permissions
            # Use db.set_value with update_modified=False to avoid permission issues
            frappe.db.set_value("User", user_id, "enabled", 1, update_modified=False)
            frappe.db.set_value("User", user_id, "login_after", None, update_modified=False)
            frappe.db.commit()
            return {"status": "success", "message": _("User unlocked successfully.")}

        else:
            return {"status": "error", "message": _("account_number or user_id required")}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Unlock User Error")
        return {"status": "error", "message": f"Error unlocking user: {str(e)}"}
