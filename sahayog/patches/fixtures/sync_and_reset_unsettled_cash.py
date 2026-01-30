import frappe
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt, getdate

def db_connection():
    try:
        creds = frappe.get_single("Finacle Settings")
        return psycopg2.connect(
            host=creds.host, port=creds.port, user=creds.user,
            password=creds.get_password("password"), database=creds.database_name
        )
    except Exception:
        return None

def execute():
    frappe.logger().info("--- Starting Unsettled Cash Reset ---")
    
    # 1. Reset Fields for ALL Branches
    # Note: We also reset 'last_synced_date' to a safe past date
    frappe.db.sql("""
        UPDATE `tabBranch Petty Cash Account`
        SET unsettled_cash = 0, 
            last_synced_transaction_id = '0',
            last_synced_date = '2025-01-01'
    """)
    frappe.db.commit()
    print("✅ All Branch Unsettled Cash & Sync IDs reset to 0.")

    # 2. Re-calculate Balance from Scratch
    wallets = frappe.get_all("Branch Petty Cash Account", filters={"status": "Active"}, fields=["name", "branch", "gl_sub_code"])
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for w in wallets:
            if not w.gl_sub_code: continue

            # Fetch ALL withdrawals since start using UNION (HTD + DTD)
            sql = """
                SELECT tran_id, tran_amt, tran_date 
                FROM (
                    SELECT h.tran_id, h.tran_amt, h.tran_date
                    FROM tbaadm.gam g
                    JOIN tbaadm.htd h ON g.acid = h.acid
                    WHERE g.foracid = %s AND h.part_tran_type = 'D' AND h.del_flg = 'N'
                    
                    UNION ALL
                    
                    SELECT d.tran_id, d.tran_amt, d.tran_date
                    FROM tbaadm.gam g
                    JOIN tbaadm.dtd d ON g.acid = d.acid
                    WHERE g.foracid = %s AND d.part_tran_type = 'D' AND d.del_flg = 'N'
                ) as combined
                ORDER BY tran_date ASC, tran_id ASC
            """
            
            # Pass gl_sub_code twice for the two parts of the UNION
            cursor.execute(sql, (w.gl_sub_code, w.gl_sub_code))
            transactions = cursor.fetchall()

            if not transactions: continue

            total_withdrawal_amount = 0.0
            
            # Trackers for the final update
            highest_id = '0'
            highest_date = '2025-01-01'

            for tx in transactions:
                amount = flt(tx['tran_amt'])
                total_withdrawal_amount += amount
                
                # Logic to find the absolute latest Date and ID
                tx_date = getdate(tx['tran_date'])
                tx_id = str(tx['tran_id'])

                if str(tx_date) > str(highest_date):
                    highest_date = tx_date
                    highest_id = tx_id
                elif str(tx_date) == str(highest_date):
                    if (tx_id.isdigit() and str(highest_id).isdigit()):
                         if int(tx_id) > int(highest_id): highest_id = tx_id
                    elif tx_id > str(highest_id):
                         highest_id = tx_id
            
            # 3. Calculate Expenses to Deduct
            total_expenses = frappe.db.sql("""
                SELECT COALESCE(SUM(amount), 0)
                FROM `tabPetty Cash Transaction`
                WHERE branch = %s AND transaction_type = 'Expense' AND docstatus = 1
            """, w.branch)[0][0]

            # 4. Final Balance Calculation
            final_unsettled_cash = total_withdrawal_amount - flt(total_expenses)

            # 5. Update the Branch Record
            frappe.db.set_value("Branch Petty Cash Account", w.name, {
                "unsettled_cash": final_unsettled_cash,
                "last_synced_transaction_id": highest_id,
                "last_synced_date": highest_date
            })
            
            print(f"✅ Rebuilt {w.branch}: Withdrawals({total_withdrawal_amount}) - Expenses({total_expenses}) = Bal: {final_unsettled_cash}")

    finally:
        conn.close()
        frappe.db.commit()
