import frappe
import psycopg2
from psycopg2.extras import RealDictCursor
from frappe.utils import flt

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
    frappe.db.sql("""
        UPDATE `tabBranch Petty Cash Account`
        SET unsettled_cash = 0, last_synced_transaction_id = '0'
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

            # Fetch ALL withdrawals since start (or since Jan 1 2026 if your SQL filters that)
            # Note: Ensure your SQL query here matches exactly what 'sync_finacle_withdrawals' uses
            # We fetch EVERYTHING > 0
            sql = """
                SELECT h.tran_id, h.tran_amt
                FROM tbaadm.gam g
                JOIN tbaadm.htd h ON g.acid = h.acid
                WHERE g.foracid = %s AND h.part_tran_type = 'D' 
                  AND h.del_flg = 'N' AND h.tran_id > '0'
                ORDER BY h.tran_id ASC
            """
            cursor.execute(sql, (w.gl_sub_code,))
            transactions = cursor.fetchall()

            if not transactions: continue

            total_withdrawal_amount = 0.0
            highest_id = '0'

            for tx in transactions:
                amount = flt(tx['tran_amt'])
                total_withdrawal_amount += amount
                
                # Track highest ID
                if str(tx['tran_id']) > str(highest_id):
                    highest_id = str(tx['tran_id'])
            
            # 3. Calculate Expenses to Deduct
            # We have Total Withdrawals (Cash In). Now we need Total Expenses (Cash Out).
            total_expenses = frappe.db.sql("""
                SELECT COALESCE(SUM(amount), 0)
                FROM `tabPetty Cash Transaction`
                WHERE branch = %s AND transaction_type = 'Expense' AND docstatus = 1
            """, w.branch)[0][0]

            # 4. Final Balance Calculation
            final_unsettled_cash = total_withdrawal_amount - flt(total_expenses)

            # 5. Update the Branch Record
            # We set the calculated cash AND the highest ID so the cron doesn't fetch these again
            frappe.db.set_value("Branch Petty Cash Account", w.name, {
                "unsettled_cash": final_unsettled_cash,
                "last_synced_transaction_id": highest_id
            })
            
            print(f"✅ Rebuilt {w.branch}: W/D: {total_withdrawal_amount} - Exp: {total_expenses} = Bal: {final_unsettled_cash}")

    finally:
        conn.close()
        frappe.db.commit()
