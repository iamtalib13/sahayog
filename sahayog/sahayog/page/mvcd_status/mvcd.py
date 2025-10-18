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

        if not rows: 
            rows = [
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                {"sol_id": "1000", "sol_desc": "HEAD OFFICE", "acct_name": "TELLER CASH -7", "foracid": "100001110020007", "clr_bal_amt": -2000.0},
                {"sol_id": "1105", "sol_desc": "NAGPUR WEALTH", "acct_name": "TELLER CASH -7", "foracid": "110501110020007", "clr_bal_amt": -202.0},
                {"sol_id": "1001", "sol_desc": "MAIN BRANCH", "acct_name": "TELLER CASH -1", "foracid": "100101110020001", "clr_bal_amt": -1000.0},
                
                
            ]
        
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
        
        if not rows:
            # Return the default data if no rows from query
            rows = [
    {
        "tran_id": "   DG1000",
        "dth_init_sol_id": "1002",
        "sol_desc": "GOREGAON BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH00301"
    },
    {
        "tran_id": "   DG1003",
        "dth_init_sol_id": "1013",
        "sol_desc": "LAKHANI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH02192"
    },
    {
        "tran_id": "   DG1004",
        "dth_init_sol_id": "1016",
        "sol_desc": "KATOL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH04833"
    },
    {
        "tran_id": "   DG1007",
        "dth_init_sol_id": "1055",
        "sol_desc": "AMRAVATI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03849"
    },
    {
        "tran_id": "   DG1020",
        "dth_init_sol_id": "1016",
        "sol_desc": "KATOL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH04833"
    },
    {
        "tran_id": "   DG1030",
        "dth_init_sol_id": "1021",
        "sol_desc": "DEORI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH02055"
    },
    {
        "tran_id": "   DG1034",
        "dth_init_sol_id": "1013",
        "sol_desc": "LAKHANI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH02192"},
    {
        "tran_id": "   DG1048",
        "dth_init_sol_id": "1055",
        "sol_desc": "AMRAVATI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03849"
    },
    {
        "tran_id": "   DG1050",
        "dth_init_sol_id": "1035",
        "sol_desc": "WARDHA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH07038"
    },
    {
        "tran_id": "   DG1057",
        "dth_init_sol_id": "1021",
        "sol_desc": "DEORI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH02055"
    },
    {
        "tran_id": "   DG1062",
        "dth_init_sol_id": "1019",
        "sol_desc": "MORGAON ARJUNI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH01817"
    },
    {
        "tran_id": "   DG1063",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH08215"
    },
    {
        "tran_id": "   DG1064",
        "dth_init_sol_id": "1021",
        "sol_desc": "DEORI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH02055"
    },
    {
        "tran_id": "   DG1065",
        "dth_init_sol_id": "1005",
        "sol_desc": "AMGAON BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH06933"
    },
    {
        "tran_id": "   DG1068",
        "dth_init_sol_id": "1129",
        "sol_desc": "SEAWOOD",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH06333"
    },
    {
        "tran_id": "   DG1069",
        "dth_init_sol_id": "1016",
        "sol_desc": "KATOL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH04833"
    },
    {
        "tran_id": "   DG1070",
        "dth_init_sol_id": "1021",
        "sol_desc": "DEORI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH02055"
    },
    {
        "tran_id": "   DG1081",
        "dth_init_sol_id": "1093",
        "sol_desc": "HINGANGHAT BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH07795"
    },
    {
        "tran_id": "   DG1106",
        "dth_init_sol_id": "1016",
        "sol_desc": "KATOL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH04833"
    },
    {
        "tran_id": "   DG1116",
        "dth_init_sol_id": "1024",
        "sol_desc": "BRHAMPURI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH04111"
    },
    {
        "tran_id": "   DG1125",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07538"
    },
    {
        "tran_id": "   DG1136",
        "dth_init_sol_id": "1002",
        "sol_desc": "GOREGAON BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH00301"
    },
    {
        "tran_id": "   DG1143",
        "dth_init_sol_id": "1018",
        "sol_desc": "PAUNI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH06327"
    },
    {
        "tran_id": "   DG1145",
        "dth_init_sol_id": "1016",
        "sol_desc": "KATOL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH04833"
    },
    {
        "tran_id": "   DG1151",
        "dth_init_sol_id": "1154",
        "sol_desc": "JAYSTAMBH GOLD BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH05601"
    },
    {
        "tran_id": "   DG1159",
        "dth_init_sol_id": "1024",
        "sol_desc": "BRHAMPURI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH04111"
    },
    {
        "tran_id": "   DG1164",
        "dth_init_sol_id": "1041",
        "sol_desc": "UMARKHED BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03805"
    },
    {
        "tran_id": "   DG1166",
        "dth_init_sol_id": "1137",
        "sol_desc": "NERUL",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH09227"
    },
    {
        "tran_id": "   DG1168",
        "dth_init_sol_id": "1002",
        "sol_desc": "GOREGAON BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH00301"
    },
    {
        "tran_id": "   DG1169",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH08215"
    },
    {
        "tran_id": "   DG1170",
        "dth_init_sol_id": "1154",
        "sol_desc": "JAYSTAMBH GOLD BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH05601"
    },
    {
        "tran_id": "   DG1177",
        "dth_init_sol_id": "1222",
        "sol_desc": "AMRAVATI RATHI NAGAR",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH09616"
    },
    {
        "tran_id": "   DG1178",
        "dth_init_sol_id": "1154",
        "sol_desc": "JAYSTAMBH GOLD BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH05601"
    },
    {
        "tran_id": "   DG1179",
        "dth_init_sol_id": "1122",
        "sol_desc": "MILLERS ROAD",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH05091"
    },
    {
        "tran_id": "   DG1180",
        "dth_init_sol_id": "1070",
        "sol_desc": "CHAMORSHI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH02416"
    },
    {
        "tran_id": "   DG1181",
        "dth_init_sol_id": "1088",
        "sol_desc": "PARATWADA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH06712"
    },
    {
        "tran_id": "   DG1182",
        "dth_init_sol_id": "1057",
        "sol_desc": "BULDANA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH03888"
    },
    {
        "tran_id": "   DG1183",
        "dth_init_sol_id": "1197",
        "sol_desc": "BETUL",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07685"
    },
    {
        "tran_id": "   DG1192",
        "dth_init_sol_id": "1088",
        "sol_desc": "PARATWADA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH06712"
    },
    {
        "tran_id": "   DG1193",
        "dth_init_sol_id": "1154",
        "sol_desc": "JAYSTAMBH GOLD BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH05601"
    },
    {
        "tran_id": "   DG1195",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07538"
    },
    {
        "tran_id": "   DG1197",
        "dth_init_sol_id": "1045",
        "sol_desc": "SELOO BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH03630"
    },
    {
        "tran_id": "   DG1207",
        "dth_init_sol_id": "1058",
        "sol_desc": "BHIWAPUR BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07375"
    },
    {
        "tran_id": "   DG1209",
        "dth_init_sol_id": "1013",
        "sol_desc": "LAKHANI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH02192"
    },
    {
        "tran_id": "   DG1211",
        "dth_init_sol_id": "1030",
        "sol_desc": "KURKHEDA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07620"
    },
    {
        "tran_id": "   DG1219",
        "dth_init_sol_id": "1030",
        "sol_desc": "KURKHEDA BRANCH",
        "tran_type": "T",
        "tran_sub_type": "BI",
        "entry_user_id": "SAH02694"
    },
    {
        "tran_id": "   DG1228",
        "dth_init_sol_id": "1136",
        "sol_desc": "BHIWANDI",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH08043"
    },
    {
        "tran_id": "   DG1229",
        "dth_init_sol_id": "1079",
        "sol_desc": "LONAR BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03389"
    },
    {
        "tran_id": "   DG1233",
        "dth_init_sol_id": "1047",
        "sol_desc": "ARNI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH01908"
    },
    {
        "tran_id": "    DG151",
        "dth_init_sol_id": "1040",
        "sol_desc": "DARWAH  BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH04549"
    },
    {
        "tran_id": "    DG386",
        "dth_init_sol_id": "1035",
        "sol_desc": "WARDHA BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH00503"
    },
    {
        "tran_id": "    DG432",
        "dth_init_sol_id": "1035",
        "sol_desc": "WARDHA BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH00503"
    },
    {
        "tran_id": "    DG473",
        "dth_init_sol_id": "1035",
        "sol_desc": "WARDHA BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH00503"
    },
    {
        "tran_id": "    DG490",
        "dth_init_sol_id": "1035",
        "sol_desc": "WARDHA BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH00503"
    },
    {
        "tran_id": "    DG557",
        "dth_init_sol_id": "1088",
        "sol_desc": "PARATWADA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH06712"
    },
    {
        "tran_id": "    DG579",
        "dth_init_sol_id": "1015",
        "sol_desc": "RAMTEK BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH06282"
    },
    {
        "tran_id": "    DG582",
        "dth_init_sol_id": "1068",
        "sol_desc": "RALEGAON BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH09812"
    },
    {
        "tran_id": "    DG608",
        "dth_init_sol_id": "1088",
        "sol_desc": "PARATWADA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH06712"
    },
    {
        "tran_id": "    DG620",
        "dth_init_sol_id": "1040",
        "sol_desc": "DARWAH  BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH04549"
    },
    {
        "tran_id": "    DG629",
        "dth_init_sol_id": "1088",
        "sol_desc": "PARATWADA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH06712"
    },
    {
        "tran_id": "    DG653",
        "dth_init_sol_id": "1083",
        "sol_desc": "GHATANJI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH09476"
    },
    {
        "tran_id": "    DG679",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH08215"
    },
    {
        "tran_id": "    DG690",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH05665"
    },
    {
        "tran_id": "    DG692",
        "dth_init_sol_id": "1084",
        "sol_desc": "NER-PARSOPANT BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03211"
    },
    {
        "tran_id": "    DG694",
        "dth_init_sol_id": "1065",
        "sol_desc": "MUL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH09721"
    },
    {
        "tran_id": "    DG695",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH08215"
    },
    {
        "tran_id": "    DG700",
        "dth_init_sol_id": "1068",
        "sol_desc": "RALEGAON BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH09812"
    },
    {
        "tran_id": "    DG708",
        "dth_init_sol_id": "1084",
        "sol_desc": "NER-PARSOPANT BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03211"
    },
    {
        "tran_id": "    DG713",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH08215"
    },
    {
        "tran_id": "    DG723",
        "dth_init_sol_id": "1065",
        "sol_desc": "MUL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH09721"
    },
    {
        "tran_id": "    DG724",
        "dth_init_sol_id": "1088",
        "sol_desc": "PARATWADA BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH06712"
    },
    {
        "tran_id": "    DG728",
        "dth_init_sol_id": "1083",
        "sol_desc": "GHATANJI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH09476"
    },
    {
        "tran_id": "    DG747",
        "dth_init_sol_id": "1042",
        "sol_desc": "KALAMB BRANCH",
        "tran_type": "T",
        "tran_sub_type": "BI",
        "entry_user_id": "SAH06739"
    },
    {
        "tran_id": "    DG762",
        "dth_init_sol_id": "1083",
        "sol_desc": "GHATANJI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH09476"
    },
    {
        "tran_id": "    DG764",
        "dth_init_sol_id": "1000",
        "sol_desc": "HEAD OFFICE",
        "tran_type": "T",
        "tran_sub_type": "BI",
        "entry_user_id": "SAH05272"
    },
    {
        "tran_id": "    DG768",
        "dth_init_sol_id": "1084",
        "sol_desc": "NER-PARSOPANT BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03211"
    },
    {
        "tran_id": "    DG822",
        "dth_init_sol_id": "1143",
        "sol_desc": "BELAGAVI",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH08006"
    },
    {
        "tran_id": "    DG824",
        "dth_init_sol_id": "1192",
        "sol_desc": "NARSINGPUR",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07947"
    },
    {
        "tran_id": "    DG842",
        "dth_init_sol_id": "1055",
        "sol_desc": "AMRAVATI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03849"
    },
    {
        "tran_id": "    DG843",
        "dth_init_sol_id": "1023",
        "sol_desc": "NAGBHID BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH00581"
    },
    {
        "tran_id": "    DG844",
        "dth_init_sol_id": "1008",
        "sol_desc": "SAONER BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH01006"
    },
    {
        "tran_id": "    DG847",
        "dth_init_sol_id": "1055",
        "sol_desc": "AMRAVATI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03849"
    },
    {
        "tran_id": "    DG853",
        "dth_init_sol_id": "1000",
        "sol_desc": "HEAD OFFICE",
        "tran_type": "T",
        "tran_sub_type": "BI",
        "entry_user_id": "SAH05272"
    },
    {
        "tran_id": "    DG854",
        "dth_init_sol_id": "1143",
        "sol_desc": "BELAGAVI",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH08006"
    },
    {
        "tran_id": "    DG857",
        "dth_init_sol_id": "1192",
        "sol_desc": "NARSINGPUR",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07947"
    },
    {
        "tran_id": "    DG863",
        "dth_init_sol_id": "1055",
        "sol_desc": "AMRAVATI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH03849"
    },
    {
        "tran_id": "    DG867",
        "dth_init_sol_id": "1008",
        "sol_desc": "SAONER BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH01006"
    },
    {
        "tran_id": "    DG872",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07538"
    },
    {
        "tran_id": "    DG873",
        "dth_init_sol_id": "1054",
        "sol_desc": "AKOLA BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH07810"
    },
    {
        "tran_id": "    DG874",
        "dth_init_sol_id": "1182",
        "sol_desc": "TULJAPUR",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH07877"
    },
    {
        "tran_id": "    DG877",
        "dth_init_sol_id": "1000",
        "sol_desc": "HEAD OFFICE",
        "tran_type": "T",
        "tran_sub_type": "BI",
        "entry_user_id": "SAH05272"
    },
    {
        "tran_id": "    DG878",
        "dth_init_sol_id": "1023",
        "sol_desc": "NAGBHID BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH00581"
    },
    {
        "tran_id": "    DG880",
        "dth_init_sol_id": "1034",
        "sol_desc": "NARKHED BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH010003"
    },
    {
        "tran_id": "    DG887",
        "dth_init_sol_id": "1011",
        "sol_desc": "SAKOLI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH00481"
    },
    {
        "tran_id": "    DG891",
        "dth_init_sol_id": "1048",
        "sol_desc": "GONDPIPARI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH02661"
    },
    {
        "tran_id": "    DG915",
        "dth_init_sol_id": "1034",
        "sol_desc": "NARKHED BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH010003"
    },
    {
        "tran_id": "    DG917",
        "dth_init_sol_id": "1137",
        "sol_desc": "NERUL",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH09227"
    },
    {
        "tran_id": "    DG920",
        "dth_init_sol_id": "1024",
        "sol_desc": "BRHAMPURI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH04111"
    },
    {
        "tran_id": "    DG925",
        "dth_init_sol_id": "1219",
        "sol_desc": "KHATIMA",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH08736"
    },
    {
        "tran_id": "    DG928",
        "dth_init_sol_id": "1093",
        "sol_desc": "HINGANGHAT BRANCH",
        "tran_type": "T",
        "tran_sub_type": "BI",
        "entry_user_id": "SAH04587"
    },
    {
        "tran_id": "    DG930",
        "dth_init_sol_id": "1065",
        "sol_desc": "MUL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH09721"
    },
    {
        "tran_id": "    DG931",
        "dth_init_sol_id": "1000",
        "sol_desc": "HEAD OFFICE",
        "tran_type": "T",
        "tran_sub_type": "BI",
        "entry_user_id": "SAH05272"
    },
    {
        "tran_id": "    DG946",
        "dth_init_sol_id": "1114",
        "sol_desc": "CHEMBUR BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH08124"
    },
    {
        "tran_id": "    DG954",
        "dth_init_sol_id": "1011",
        "sol_desc": "SAKOLI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH00481"
    },
    {
        "tran_id": "    DG963",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07538"
    },
    {
        "tran_id": "    DG966",
        "dth_init_sol_id": "1137",
        "sol_desc": "NERUL",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH09227"
    },
    {
        "tran_id": "    DG974",
        "dth_init_sol_id": "1024",
        "sol_desc": "BRHAMPURI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH04111"
    },
    {
        "tran_id": "    DG983",
        "dth_init_sol_id": "1065",
        "sol_desc": "MUL BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH09721"
    },
    {
        "tran_id": "    DG984",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH08215"
    },
    {
        "tran_id": "    DG987",
        "dth_init_sol_id": "1018",
        "sol_desc": "PAUNI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH06327"
    },
    {
        "tran_id": "    DG990",
        "dth_init_sol_id": "1013",
        "sol_desc": "LAKHANI BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH02192"
    },
    {
        "tran_id": "    DG992",
        "dth_init_sol_id": "1034",
        "sol_desc": "NARKHED BRANCH",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH010003"
    },
    {
        "tran_id": "    DG994",
        "dth_init_sol_id": "1001",
        "sol_desc": "MAIN BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH07538"
    },
    {
        "tran_id": "    DG996",
        "dth_init_sol_id": "1143",
        "sol_desc": "BELAGAVI",
        "tran_type": "C",
        "tran_sub_type": "NP",
        "entry_user_id": "SAH08006"
    },
    {
        "tran_id": "    DG999",
        "dth_init_sol_id": "1114",
        "sol_desc": "CHEMBUR BRANCH",
        "tran_type": "C",
        "tran_sub_type": "NR",
        "entry_user_id": "SAH08124"
    },
    {
        "tran_id": "  Y538712",
        "dth_init_sol_id": "1000",
        "sol_desc": "HEAD OFFICE",
        "tran_type": "T",
        "tran_sub_type": "CI",
        "entry_user_id": "SAH01252"
    },
    {
        "tran_id": "  Y538713",
        "dth_init_sol_id": "1004",
        "sol_desc": "BHANDARA BRANCH",
        "tran_type": "T",
        "tran_sub_type": "BI",
        "entry_user_id": "SAH04251"
    }
]

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