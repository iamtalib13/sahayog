import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt, getdate, nowdate

# --- 1. Database Connection ---
def db_connection():
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
        frappe.log_error(f"DB Connection Error: {str(e)}", "Auto Fund Sync")
        return None

# --- 2. Main Scheduler Function ---
@frappe.whitelist()
def sync_fund_allocations_from_finacle():
    """
    Scheduled Job: Loops through all active branches, checks their Mini Statement,
    and auto-creates Fund Allocation entries for new Credits.
    """
    branches = frappe.get_all("Branch Petty Cash Account", filters={"status": "Active"}, fields=["name", "branch", "gl_sub_code"])
    
    print(f"--- Starting Fund Sync for {len(branches)} Branches ---")
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for wallet in branches:
            if not wallet.gl_sub_code:
                continue

            try:
                process_single_branch(wallet, cursor)
                frappe.db.commit() # Commit after each branch to save progress
            except Exception as e:
                frappe.log_error(f"Error syncing branch {wallet.branch}: {str(e)}", "Fund Sync Error")
                conn.rollback() # Rollback SQL transaction if one branch fails

    finally:
        conn.close()
        print("--- Fund Sync Completed ---")

# --- 3. Branch Processing Logic ---
def process_single_branch(wallet, cursor):
    # SQL Query provided by you
    sql = """
        SELECT
            g.foracid,
            h.tran_id,     -- unique ID for deduplication
            h.tran_date,
            h.tran_amt,
            h.part_tran_type,
            h.tran_particular
        FROM tbaadm.gam g
        JOIN tbaadm.dtd h ON g.acid = h.acid
        WHERE g.del_flg = 'N'
          AND h.del_flg = 'N'
          AND g.entity_cre_flg = 'Y'
          AND g.foracid = %s
          AND h.part_tran_type = 'C'  -- 👈 FILTER: ONLY CREDITS (INFLOW)
        ORDER BY
            h.tran_date DESC,
            h.tran_id DESC                 
        LIMIT 5
    """
    
    cursor.execute(sql, (wallet.gl_sub_code,))
    transactions = cursor.fetchall()

    if not transactions:
        return

    for tx in transactions:
        # 1. Deduplication Check
        # We check if a transaction with this ID and Date already exists
        exists = frappe.db.exists("Petty Cash Transaction", {
            "finacle_tran_id": str(tx['tran_id']),
            "transaction_type": "Fund Allocation",
            "branch": wallet.branch
        })

        if exists:
            # We already have this money recorded. Skip.
            continue
        
        # 2. It's New! Create the Record.
        create_fund_entry(wallet, tx)

# --- 4. Creating the Document ---
def create_fund_entry(wallet, tx):
    amount = flt(tx['tran_amt'])
    tx_date = getdate(tx['tran_date'])
    
    # Create the doc
    doc = frappe.get_doc({
        "doctype": "Petty Cash Transaction",
        "transaction_type": "Fund Allocation",
        "branch": wallet.branch,
        "transaction_date": tx_date,
        "amount": amount,
        "status": "Approved", # Auto-approve since it came from Bank
        "approval_status": "Posted", 
        
        # Tracking Fields (Make sure these exist in your DocType)
        "finacle_tran_id": str(tx['tran_id']),
        "finacle_transaction_id": str(tx['tran_id']), # Using your existing field
        "finacle_tran_particular": f"Auto-detected from Finacle: {tx['tran_particular']}",
        "posted_to_finacle": 1 # It's already in Finacle
    })
    
    doc.insert(ignore_permissions=True)
    doc.submit() # Auto-submit so it affects the wallet balance immediately
    
    print(f"💰 New Fund Detected: {wallet.branch} | ₹{amount}")
