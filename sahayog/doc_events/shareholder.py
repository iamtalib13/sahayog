import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import math

# =====================================================================
# CONFIGURABLE VARIABLES
# =====================================================================

LAST_SERIES_NUMBER = 609051
DEFAULT_SHARE_RATE = 10.0
DEFAULT_TRANSFER_TYPE = "Issue"
DEFAULT_SHARE_TYPE = "Equity"
DEFAULT_EQUITY_ACCOUNT = "Shareholders Funds - S"
DEFAULT_ASSET_ACCOUNT = "Cash - S"

# =====================================================================

def autoname(doc, method):
    """
    Auto-generate document name using CIF
    Only set name if CIF exists (prevents blank record creation)
    """
    if hasattr(doc, 'cif') and doc.cif:
        doc.name = doc.cif


def before_insert(doc, method):
    """
    Final validation before inserting document
    Ensure CIF exists before allowing insert
    """
    if not hasattr(doc, 'cif') or not doc.cif:
        frappe.throw(_("CIF is required before creating Shareholder record"))
    
    # Set name and title based on CIF
    doc.name = doc.cif
    doc.title = doc.cif


def before_save(doc, method):
    """
    Hook method for before_save event (if called from hooks.py)
    This method is required if you have doc_events hook configured
    """
    # Set title equal to CIF for consistency
    if hasattr(doc, 'cif') and doc.cif:
        doc.title = doc.cif


def db_connection():
    """
    Establish connection to external PostgreSQL database
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
        frappe.throw(f"Database Connection Error: {str(e)}")


def get_next_share_number():
    """
    Get the next available share number
    """
    try:
        last_transfer = frappe.db.sql("""
            SELECT to_no 
            FROM `tabShare Transfer` 
            WHERE to_no IS NOT NULL 
            ORDER BY to_no DESC 
            LIMIT 1
        """, as_dict=True)
        
        if last_transfer and last_transfer[0].get('to_no'):
            database_last_number = int(last_transfer[0]['to_no'])
            actual_last_number = max(database_last_number, LAST_SERIES_NUMBER)
            return actual_last_number + 1
        else:
            return LAST_SERIES_NUMBER + 1
            
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error getting next share number")
        return LAST_SERIES_NUMBER + 1


@frappe.whitelist()
def get_shareholder(account_number):
    """
    Fetch shareholder details from external database
    """
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

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
              AND g.entity_cre_flg = 'Y'
              AND g.del_flg = 'N'
            GROUP BY g.cif_id, g.foracid, g.acct_name, g.sol_id, s.sol_desc, t.deposit_amount;
        """

        cursor.execute(sql_query, (account_number,))
        result = cursor.fetchall()

        cursor.close()
        conn.close()

        return result

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Shareholder Data Fetch Error")
        frappe.throw(f"Error fetching shareholder: {str(e)}")

def create_share_transfer(shareholder_cif, deposit_amount, sol_id=None, account_number=None):
    """
    Create and submit Share Transfer record
    """
    try:
        no_of_shares = math.floor(deposit_amount / DEFAULT_SHARE_RATE)
        
        if no_of_shares <= 0:
            return {
                "success": False,
                "error": f"Deposit amount is insufficient. Minimum required: ₹{DEFAULT_SHARE_RATE}"
            }
        
        actual_amount = no_of_shares * DEFAULT_SHARE_RATE
        from_no = get_next_share_number()
        to_no = from_no + no_of_shares - 1
        
        # Create Share Transfer document
        share_transfer_doc = frappe.new_doc("Share Transfer")
        
        share_transfer_doc.transfer_type = DEFAULT_TRANSFER_TYPE
        share_transfer_doc.date = datetime.now().date()
        share_transfer_doc.to_shareholder = shareholder_cif
        share_transfer_doc.equity_or_liability_account = DEFAULT_EQUITY_ACCOUNT
        share_transfer_doc.asset_account = DEFAULT_ASSET_ACCOUNT
        share_transfer_doc.share_type = DEFAULT_SHARE_TYPE
        share_transfer_doc.no_of_shares = no_of_shares
        share_transfer_doc.rate = DEFAULT_SHARE_RATE
        share_transfer_doc.amount = actual_amount
        share_transfer_doc.from_no = from_no
        share_transfer_doc.to_no = to_no
        
        # ✅ New fields
        share_transfer_doc.sol_id = sol_id
        share_transfer_doc.account_number = account_number
        
        # Insert and submit the document
        share_transfer_doc.insert()
        share_transfer_doc.submit()
        
        return {
            "success": True,
            "share_transfer_name": share_transfer_doc.name,
            "no_of_shares": no_of_shares,
            "from_no": from_no,
            "to_no": to_no,
            "amount": actual_amount,
            "sol_id": sol_id,
            "account_number": account_number,
            "status": "Submitted"
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
    Main function to create Shareholder + Share Transfer record
    Rules:
    - Shareholder created only once per CIF
    - Multiple Share Transfers allowed for same CIF
    - Each account_number must be unique in Share Transfer
    """
    try:
        # Step 1: Fetch data from external database
        shareholder_data = get_shareholder(account_number)
        
        if not shareholder_data or len(shareholder_data) == 0:
            return {
                "success": False,
                "error": "No shareholder data found for this account number."
            }
        
        data = shareholder_data[0]
        cif_id = data.get("cif_id")
        
        if not cif_id:
            return {
                "success": False,
                "error": "CIF not found in external database for this account number."
            }

        # Step 2: Ensure this account_number is unique in Share Transfer
        existing_transfer = frappe.db.exists("Share Transfer", {"account_number": account_number})
        if existing_transfer:
            return {
                "success": False,
                "error": f"Share Transfer already exists for Account Number {account_number} (Doc: {existing_transfer})"
            }

        # Step 3: Check if Shareholder exists
        existing_shareholder = frappe.db.exists("Shareholder", cif_id)
        if not existing_shareholder:
            # Create new Shareholder only once per CIF
            shareholder_doc = frappe.new_doc("Shareholder")
            shareholder_doc.cif = cif_id
            shareholder_doc.sol_id = data.get("sol_id")
            shareholder_doc.sol_desc = data.get("sol_desc")
            shareholder_doc.customer_name = data.get("acct_name")
            shareholder_doc.address = data.get("full_address")
            
            shareholder_doc.insert()
            shareholder_name = shareholder_doc.name
        else:
            # Use existing shareholder
            shareholder_name = existing_shareholder

        # Step 4: Create new Share Transfer (with unique account_number)
        share_transfer_result = create_share_transfer(
            shareholder_name,
            float(data.get("deposit_amount", 0)),
            sol_id=data.get("sol_id"),
            account_number=account_number
        )
        
        # Step 5: Commit if successful
        if share_transfer_result.get("success"):
            frappe.db.commit()
            return {
                "success": True,
                "shareholder_name": shareholder_name,
                "share_transfer_name": share_transfer_result.get("share_transfer_name"),
                "no_of_shares": share_transfer_result.get("no_of_shares"),
                "from_no": share_transfer_result.get("from_no"),
                "to_no": share_transfer_result.get("to_no"),
                "amount": share_transfer_result.get("amount"),
                "sol_id": share_transfer_result.get("sol_id"),
                "account_number": share_transfer_result.get("account_number"),
                "message": f"Share Transfer created successfully for CIF {cif_id}, Account {account_number}"
            }
        else:
            frappe.db.rollback()
            return {
                "success": False,
                "error": f"Share Transfer creation failed: {share_transfer_result.get('error')}"
            }
        
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Shareholder Creation Error")
        return {
            "success": False,
            "error": f"Error creating shareholder/share transfer record: {str(e)}"
        }

@frappe.whitelist()
def get_current_series_info():
    """
    Utility function for debugging
    """
    try:
        next_number = get_next_share_number()
        
        return {
            "success": True,
            "configured_last_series": LAST_SERIES_NUMBER,
            "configured_rate": DEFAULT_SHARE_RATE,
            "next_available_from": next_number
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting series info: {str(e)}"
        }
