import frappe
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import math

# =====================================================================
# CONFIGURABLE VARIABLES - Change these as needed in future
# =====================================================================

# Share numbering configuration
LAST_SERIES_NUMBER = 609051     # Last allocated share number (inclusive) - Change this to update series
DEFAULT_SHARE_RATE = 10.0       # Fixed rate per share - Change this to update rate

# Share transfer default configuration
DEFAULT_TRANSFER_TYPE = "Issue"
DEFAULT_SHARE_TYPE = "Equity"
DEFAULT_EQUITY_ACCOUNT = "Shareholders Funds - S"
DEFAULT_ASSET_ACCOUNT = "Cash - S"

# =====================================================================

def autoname(doc, method):
    """
    Auto-generate document name using CIF
    """
    doc.name = doc.cif

def before_save(doc, method):
    """
    Set document title to CIF value before saving
    This ensures consistent naming convention across documents
    """
    doc.title = doc.cif

def db_connection():
    """
    Establish connection to external PostgreSQL database using credentials
    from Finacle Settings single doctype
    
    Returns:
        psycopg2.connection: Database connection object
        
    Raises:
        frappe.ValidationError: If connection fails
    """
    try:
        # Fetch database credentials from single doctype
        creds = frappe.get_single("Finacle Settings")
        
        # Establish PostgreSQL connection
        conn = psycopg2.connect(
            host=creds.host,
            port=creds.port,
            user=creds.user,
            password=creds.get_password("password"),  # Secure password retrieval
            database=creds.database_name
        )
        return conn
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PostgreSQL Connection Failed")
        frappe.throw(f"Postgres Connection Error: {str(e)}")

def get_next_share_number():
    """
    Get the next available share number based on configured LAST_SERIES_NUMBER
    If database has higher numbers, use database value, otherwise use configured value
    
    Returns:
        int: Next available share number
    """
    try:
        # Get the last Share Transfer record with highest to_no
        last_transfer = frappe.db.sql("""
            SELECT to_no 
            FROM `tabShare Transfer` 
            WHERE to_no IS NOT NULL 
            ORDER BY to_no DESC 
            LIMIT 1
        """, as_dict=True)
        
        if last_transfer and last_transfer[0].get('to_no'):
            database_last_number = int(last_transfer[0]['to_no'])
            
            # Use whichever is higher: database last number or configured last series number
            actual_last_number = max(database_last_number, LAST_SERIES_NUMBER)
            
            return actual_last_number + 1
        else:
            # If no records found, start from configured last series number + 1
            return LAST_SERIES_NUMBER + 1
            
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error getting next share number")
        # Default to configured last series number + 1 if any error
        return LAST_SERIES_NUMBER + 1

@frappe.whitelist()
def get_shareholder(account_number):
    """
    Fetch comprehensive shareholder details from external PostgreSQL database
    
    Args:
        account_number (str): Account number to search for
        
    Returns:
        list: List of dictionaries containing shareholder information
        
    Raises:
        frappe.ValidationError: If database query fails
    """
    try:
        # Establish database connection
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Complex SQL query to fetch shareholder data from multiple tables
        sql_query = """
            SELECT
                g.cif_id,
                g.foracid AS account_number,
                g.acct_name,
                g.sol_id,
                s.sol_desc,
                t.deposit_amount,
                MIN(a.address_line1 || ' ' || a.address_line2) AS full_address
            FROM tbaadm.gam g
            JOIN tbaadm.tam t ON g.acid = t.acid
            JOIN crmuser.address a ON g.cif_id = a.orgkey
            JOIN tbaadm.sol s ON s.sol_id = g.sol_id
            WHERE g.foracid = %s
              AND g.entity_cre_flg = 'Y'  -- Only active entities
              AND g.del_flg = 'N'         -- Exclude deleted records
            GROUP BY g.cif_id, g.foracid, g.acct_name, g.sol_id, s.sol_desc, t.deposit_amount;
        """

        # Execute parameterized query to prevent SQL injection
        cursor.execute(sql_query, (account_number,))
        result = cursor.fetchall()

        # Clean up database resources
        cursor.close()
        conn.close()

        # Return results as list of dictionaries
        return result

    except Exception as e:
        # Log detailed error for debugging
        frappe.log_error(frappe.get_traceback(), "Shareholder Data Fetch Error")
        frappe.throw(f"Error fetching shareholder: {str(e)}")

def create_share_transfer(shareholder_cif, deposit_amount):
    """
    Create Share Transfer record for the shareholder and submit it
    Uses configurable variables for all default values
    
    Args:
        shareholder_cif (str): CIF of the shareholder
        deposit_amount (float): Deposit amount from external database
        
    Returns:
        dict: Success/error message with created record details
    """
    try:
        # Calculate number of shares based on deposit amount and configured rate
        no_of_shares = math.floor(deposit_amount / DEFAULT_SHARE_RATE)
        
        if no_of_shares <= 0:
            return {
                "success": False,
                "error": f"Deposit amount is insufficient to allocate shares. Minimum required: ₹{DEFAULT_SHARE_RATE}"
            }
        
        # Calculate actual amount based on whole shares
        actual_amount = no_of_shares * DEFAULT_SHARE_RATE
        
        # Get next available share numbers
        from_no = get_next_share_number()
        to_no = from_no + no_of_shares - 1  # Continuous series (both inclusive)
        
        # Create new Share Transfer document
        share_transfer_doc = frappe.new_doc("Share Transfer")
        
        # Set fields using configurable variables
        share_transfer_doc.transfer_type = DEFAULT_TRANSFER_TYPE
        share_transfer_doc.date = datetime.now().date()  # Today's date
        share_transfer_doc.to_shareholder = shareholder_cif
        share_transfer_doc.equity_or_liability_account = DEFAULT_EQUITY_ACCOUNT
        share_transfer_doc.asset_account = DEFAULT_ASSET_ACCOUNT
        share_transfer_doc.share_type = DEFAULT_SHARE_TYPE
        share_transfer_doc.no_of_shares = no_of_shares
        share_transfer_doc.rate = DEFAULT_SHARE_RATE
        share_transfer_doc.amount = actual_amount
        share_transfer_doc.from_no = from_no
        share_transfer_doc.to_no = to_no
        
        # Save the document first
        share_transfer_doc.insert()
        
        # Submit the document to make it permanent
        share_transfer_doc.submit()
        
        return {
            "success": True,
            "share_transfer_name": share_transfer_doc.name,
            "no_of_shares": no_of_shares,
            "from_no": from_no,
            "to_no": to_no,
            "amount": actual_amount,
            "status": "Submitted"  # Added status to confirm submission
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Share Transfer Creation Error")
        return {
            "success": False,
            "error": f"Error creating share transfer: {str(e)}"
        }


@frappe.whitelist()
def create_shareholder_record(account_number):
    """
    Fetch shareholder data and create new Shareholder record with Share Transfer
    
    Args:
        account_number (str): Account number to search for
        
    Returns:
        dict: Success/error message with created record details
    """
    try:
        # Fetch shareholder data from external database
        shareholder_data = get_shareholder(account_number)
        
        if not shareholder_data or len(shareholder_data) == 0:
            return {
                "success": False,
                "error": "No shareholder data found for this account number."
            }
        
        # Get first record from results
        data = shareholder_data[0]
        
        # Check if shareholder with this CIF already exists
        existing_shareholder = frappe.db.exists("Shareholder", {"cif": data.get("cif_id")})
        if existing_shareholder:
            return {
                "success": False,
                "error": f"Shareholder with CIF {data.get('cif_id')} already exists: {existing_shareholder}"
            }
        
        # Create new Shareholder document
        shareholder_doc = frappe.new_doc("Shareholder")
        
        # Set required fields as per your requirement
        shareholder_doc.cif = data.get("cif_id")
        shareholder_doc.sol_id = data.get("sol_id")
        shareholder_doc.sol_desc = data.get("sol_desc")
        shareholder_doc.customer_name = data.get("acct_name")
        shareholder_doc.address = data.get("full_address")
        shareholder_doc.account_no = data.get("account_number")
        
        # Save the shareholder document first
        shareholder_doc.insert()
        
        # Create Share Transfer record
        share_transfer_result = create_share_transfer(
            data.get("cif_id"), 
            float(data.get("deposit_amount", 0))
        )
        
        # Commit the transaction only if both records are created successfully
        if share_transfer_result.get("success"):
            frappe.db.commit()
            
            return {
                "success": True,
                "shareholder_name": shareholder_doc.name,
                "share_transfer_name": share_transfer_result.get("share_transfer_name"),
                "no_of_shares": share_transfer_result.get("no_of_shares"),
                "from_no": share_transfer_result.get("from_no"),
                "to_no": share_transfer_result.get("to_no"),
                "amount": share_transfer_result.get("amount"),
                "message": f"Shareholder and Share Transfer created successfully for CIF: {data.get('cif_id')}"
            }
        else:
            # Rollback if share transfer creation failed
            frappe.db.rollback()
            return {
                "success": False,
                "error": f"Shareholder created but Share Transfer failed: {share_transfer_result.get('error')}"
            }
        
    except Exception as e:
        # Rollback in case of error
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Shareholder and Share Transfer Creation Error")
        
        return {
            "success": False,
            "error": f"Error creating shareholder and share transfer: {str(e)}"
        }

# =====================================================================
# UTILITY FUNCTIONS - For debugging and monitoring
# =====================================================================

@frappe.whitelist()
def get_current_series_info():
    """
    Get current series information and next available numbers
    
    Returns:
        dict: Current series status
    """
    try:
        next_number = get_next_share_number()
        
        return {
            "success": True,
            "configured_last_series": LAST_SERIES_NUMBER,
            "configured_rate": DEFAULT_SHARE_RATE,
            "next_available_from": next_number,
            "example_allocation": {
                "if_1_share": {"from_no": next_number, "to_no": next_number},
                "if_5_shares": {"from_no": next_number, "to_no": next_number + 4},
                "if_10_shares": {"from_no": next_number, "to_no": next_number + 9}
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting series info: {str(e)}"
        }
