# import frappe
# import psycopg2
# from psycopg2.extras import RealDictCursor
# from frappe.utils import flt
# # Import the fixed balance fetcher
# from sahayog.petty_cash_management.api.branch_petty_cash_account_balance_fetch import fetch_finacle_balance

# def db_connection():
#     try:
#         creds = frappe.get_single("Finacle Settings")
#         return psycopg2.connect(
#             host=creds.host, port=creds.port, user=creds.user,
#             password=creds.get_password("password"), database=creds.database_name
#         )
#     except Exception:
#         return None

# @frappe.whitelist()
# def sync_finacle_withdrawals():
#     wallets = frappe.get_all("Branch Petty Cash Account", 
#         filters={"status": "Active"}, 
#         fields=["name", "branch", "gl_sub_code", "last_synced_transaction_id"]
#     )
    
#     conn = db_connection()
#     if not conn: return

#     try:
#         cursor = conn.cursor(cursor_factory=RealDictCursor)

#         for w in wallets:
#             if not w.gl_sub_code: continue

#             # Fetch New Withdrawals
#             last_id = w.last_synced_transaction_id or '0'
#             sql = """
#                 SELECT h.tran_id, h.tran_amt, h.part_tran_type
#                 FROM tbaadm.gam g
#                 JOIN tbaadm.htd h ON g.acid = h.acid
#                 WHERE g.foracid = %s AND h.part_tran_type = 'D' 
#                   AND h.del_flg = 'N' AND h.tran_id > %s
#                 ORDER BY h.tran_id ASC
#             """
#             cursor.execute(sql, (w.gl_sub_code, last_id))
#             transactions = cursor.fetchall()

#             if not transactions: continue

#             # Process Withdrawals
#             doc = frappe.get_doc("Branch Petty Cash Account", w.name)
#             highest_id = last_id

#             for tx in transactions:
#                 amount = flt(tx['tran_amt'])
#                 doc.update_unsettled_cash(amount, "Withdrawal") # Updates Unsettled Cash
#                 print(f"💸 Withdrawal Detected: {w.branch} | ₹{amount}")
#                 if str(tx['tran_id']) > str(highest_id):
#                     highest_id = str(tx['tran_id'])

#             # Save Last ID
#             frappe.db.set_value("Branch Petty Cash Account", w.name, "last_synced_transaction_id", highest_id)
#             frappe.db.commit()

#             # [TRIGGER] Update Current Balance immediately
#             fetch_finacle_balance(w.branch)

#     finally:
#         conn.close()


import frappe
from frappe import _
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt, getdate
# Import the fixed balance fetcher
from sahayog.petty_cash_management.api.branch_petty_cash_account_balance_fetch import fetch_finacle_balance

def db_connection():
    try:
        creds = frappe.get_single("Finacle Settings")
        return psycopg2.connect(
            host=creds.host, port=creds.port, user=creds.user,
            password=creds.get_password("password"), database=creds.database_name
        )
    except Exception:
        return None

@frappe.whitelist()
def sync_finacle_withdrawals():
    wallets = frappe.get_all("Branch Petty Cash Account", 
        filters={"status": "Active"}, 
        fields=["name", "branch", "gl_sub_code", "last_synced_transaction_id"]
    )
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for w in wallets:
            if not w.gl_sub_code: continue

            # Fetch New Withdrawals
            last_id = w.last_synced_transaction_id or '0'
            sql = """
                SELECT h.tran_id, h.tran_amt, h.part_tran_type, h.tran_date
                FROM tbaadm.gam g
                JOIN tbaadm.dtd h ON g.acid = h.acid
                WHERE g.foracid = %s AND h.part_tran_type = 'D' 
                  AND h.del_flg = 'N' AND h.tran_id > %s
                ORDER BY h.tran_id ASC
            """
            cursor.execute(sql, (w.gl_sub_code, last_id))
            transactions = cursor.fetchall()

            if not transactions: continue

            # Process Withdrawals
            doc = frappe.get_doc("Branch Petty Cash Account", w.name)
            highest_id = last_id
            
            withdrawals_processed = False

            for tx in transactions:
                # 1. SAFETY CHECK: Check if this transaction ID already exists in our system
                # This prevents double-entry even if the 'last_synced_transaction_id' fails to update
                exists = frappe.db.exists("Petty Cash Transaction", {
                    "finacle_tran_id": str(tx['tran_id']),
                    "transaction_type": "Cash Withdrawal", 
                    "branch": w.branch
                })
                if exists: 
                    # If it exists, we still want to ensure our highest_id tracker moves forward
                    if str(tx['tran_id']) > str(highest_id):
                        highest_id = str(tx['tran_id'])
                    continue

                amount = flt(tx['tran_amt'])
                
                # 2. Update Unsettled Cash (The Balance)
                doc.update_unsettled_cash(amount, "Withdrawal")
                
                # 3. Create the Transaction Record
                create_withdrawal_entry(w, tx)
                
                print(f"💸 Withdrawal Detected & Logged: {w.branch} | ₹{amount}")
                withdrawals_processed = True

            # 4. Update the tracker ID reliably
            # Since SQL sorts ASC, the last item in the list is always the highest ID.
            if transactions:
                # We use the absolute last ID from the fetch to ensure we don't fetch these again
                final_tx_id = str(transactions[-1]['tran_id'])
                frappe.db.set_value("Branch Petty Cash Account", w.name, "last_synced_transaction_id", final_tx_id)
            
            if withdrawals_processed:
                frappe.db.commit()
                # [TRIGGER] Update Current Balance immediately
                fetch_finacle_balance(w.branch)

    finally:
        conn.close()

def create_withdrawal_entry(wallet, tx):
    amount = flt(tx['tran_amt'])
    # Ensure 'Cash Withdrawal' is a valid option in 'transaction_type' field in Doctype
    doc = frappe.get_doc({
        "doctype": "Petty Cash Transaction",
        "transaction_type": "Cash Withdrawal", 
        "branch": wallet.branch,
        "transaction_date": getdate(tx['tran_date']),
        "amount": amount,
        "approval_status": "Posted", # Or whatever status implies 'Done'
        "finacle_tran_id": str(tx['tran_id']),
        "reference_number": str(tx['tran_id']),
        "posted_to_finacle": 1,
        "remarks": "Auto-synced Withdrawal from Finacle"
    })
    doc.insert(ignore_permissions=True)
    doc.submit()

