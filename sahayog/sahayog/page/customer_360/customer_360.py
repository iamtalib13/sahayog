import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor

def db_connection():
    """Connect to external PostgreSQL (Finacle) using Finacle Settings."""
    try:
        creds = frappe.get_single("Finacle Settings")
        
        # Ensure port is an integer, default to 5432 if missing
        port = int(creds.port) if creds.port else 5432
        
        conn = psycopg2.connect(
            host=creds.host,
            port=port,
            user=creds.user,
            password=creds.get_password("password"),
            database=creds.database_name
        )
        return conn
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PostgreSQL Connection Failed")
        frappe.throw(_("Database Connection Error: {0}").format(str(e)))

@frappe.whitelist()
def search_account_by_kyc(search_value, search_type):
    """
    Search Customer Details by KYC Parameter using external Finacle DB.
    """
    
    # 1. Prepare Base Query
    # Note: In PostgreSQL, we use %s for placeholders
    base_query = """
        SELECT DISTINCT
            g.cif_id,
            g.acct_name,
            e.doccode,
            e.docdescr,
            e.referencenumber,
            c.phoneno,
            c.phonenolocalcode
        FROM 
            crmuser.entitydocument e
        JOIN 
            tbaadm.gam g ON e.orgkey = g.cif_id
        JOIN 
            crmuser.cphone c ON g.cif_id = c.phone_b2kid
        WHERE
            {condition}
    """

    condition = ""
    # We clean the input just in case, though parameterized queries are safer.
    # Since the logic requires dynamic column selection, we construct the WHERE clause first.
    
    # 2. Build Dynamic Condition
    # We use a placeholder %s for the value to be safe against injection
    if search_type == "Aadhaar":
        condition = "e.doccode = '2' AND e.referencenumber = %s"

    elif search_type == "PAN":
        condition = "e.doccode = 'PAN' AND e.referencenumber = %s"

    elif search_type == "Driving License":
        condition = "e.doccode IN ('37', 'DL', '102') AND e.referencenumber = %s"

    elif search_type == "Voter ID":
        condition = "e.doccode IN ('36', 'VIC') AND e.referencenumber = %s"

    elif search_type == "Mobile":
        # For mobile, we check two columns. We need to pass the value twice.
        condition = "(c.phoneno = %s OR c.phonenolocalcode = %s)"
        
    else:
        frappe.throw(_("Invalid Search Type"))

    # 3. Finalize Query String
    final_query = base_query.format(condition=condition)
    
    # 4. Prepare Parameters
    # If Mobile, we need the value twice (once for phoneno, once for phonenolocalcode)
    if search_type == "Mobile":
        params = (search_value, search_value)
    else:
        params = (search_value,)

    print(f"\n--- FETCHING FROM FINACLE ({search_type}) ---\nQuery: {final_query}\nParams: {params}")

    # 5. Execute
    data = []
    conn = None
    try:
        conn = db_connection()
        # Use RealDictCursor to get results as dictionary (like as_dict=True)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(final_query, params)
            data = cursor.fetchall()
            
            # Convert RealDictRow to standard dict for JSON serialization
            data = [dict(row) for row in data]

    except Exception as e:
        frappe.log_error(f"Finacle Search Error: {str(e)}", "Finacle Integration")
        frappe.throw(_("Failed to fetch data: {0}").format(str(e)))
    finally:
        if conn:
            conn.close()

    print(f"Records Found: {len(data)}\n")
    return data
