import frappe
from frappe import _
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
    except Exception as e:
        frappe.log_error(f"Finacle DB Connect Error: {str(e)}", "Petty Cash Sync")
        return None



# Sync Cash Withdrawals from Finacle to Frappe by calculating Unsettled Cash directly on the Wallet.
# @frappe.whitelist()
# def sync_finacle_withdrawals():
#     """
#     [OPTIMIZED] Calculates Unsettled Cash by aggregating Finacle Withdrawals 
#     vs Frappe Expenses. Does NOT create 'Cash Withdrawal' records to save storage.
#     """
    
#     # 1. Fetch Active Wallets
#     wallets = frappe.get_all("Branch Petty Cash Account", 
#         filters={"status": "Active"}, 
#         fields=["name", "branch", "gl_sub_code"]
#     )
    
#     conn = db_connection()
#     if not conn: return

#     try:
#         cursor = conn.cursor(cursor_factory=RealDictCursor)

#         for w in wallets:
#             if not w.gl_sub_code: continue

#             # --- STEP 1: FETCH TOTAL WITHDRAWALS FROM FINACLE (SUM 'D') ---
#             # We fetch the SUM of all time Debit transactions.
#             # Adjust '2024-04-01' to your project's Go-Live Date if needed to limit history.
#             go_live_date = '2025-01-01' 
            
#             sql_finacle = """
#                 SELECT SUM(tran_amt) as total_withdrawal
#                 FROM (
#                     SELECT h.tran_amt
#                     FROM tbaadm.gam g
#                     JOIN tbaadm.htd h ON g.acid = h.acid
#                     WHERE g.foracid = %s 
#                       AND h.part_tran_type = 'D' 
#                       AND h.del_flg = 'N'
#                       AND h.tran_date >= %s
                    
#                     UNION ALL
                    
#                     SELECT d.tran_amt
#                     FROM tbaadm.gam g
#                     JOIN tbaadm.dtd d ON g.acid = d.acid
#                     WHERE g.foracid = %s 
#                       AND d.part_tran_type = 'D' 
#                       AND d.del_flg = 'N'
#                       AND d.tran_date >= %s
#                 ) as combined
#             """
            
#             # Pass gl_sub_code and date twice (once for HTD, once for DTD)
#             cursor.execute(sql_finacle, (w.gl_sub_code, go_live_date, w.gl_sub_code, go_live_date))
#             result = cursor.fetchone()
            
#             total_withdrawals_finacle = flt(result['total_withdrawal']) if result else 0.0


#             # --- STEP 2: FETCH TOTAL EXPENSES FROM FRAPPE (SUM 'Expense') ---
#             # We assume physical cash is gone as soon as Expense is Submitted.
#             # We filter for Submitted docs (docstatus=1) of type 'Expense'.
            
#             total_expenses_frappe = frappe.db.sql("""
#                 SELECT COALESCE(SUM(amount), 0)
#                 FROM `tabPetty Cash Transaction`
#                 WHERE branch = %s 
#                   AND transaction_type = 'Expense' 
#                   AND docstatus = 1
#             """, w.branch)[0][0]

#             total_expenses_frappe = flt(total_expenses_frappe)


#                         # ... (after fetching total_expenses_frappe)

#             # --- DEBUG LOGS ---
#             print(f"\n--- SYNC DEBUG: {w.branch} ---")
#             print(f"Finacle Total (Withdrawals): {total_withdrawals_finacle}")
#             print(f"Frappe Total (Expenses):     {total_expenses_frappe}")
#             print(f"Old Unsettled Cash:          {w.unsettled_cash}")
#             print(f"Calculated New Cash:         {total_withdrawals_finacle - total_expenses_frappe}")
#             print("--------------------------------\n")

#             # --- STEP 3: CALCULATE AND UPDATE ---
#             new_unsettled_cash = total_withdrawals_finacle - total_expenses_frappe



#             # --- STEP 3: CALCULATE AND UPDATE ---
#             # Formula: Cash In Hand = (Total Taken from Bank) - (Total Spent)
#             new_unsettled_cash = total_withdrawals_finacle - total_expenses_frappe
            
#             # Update the wallet directly
#             # We use db.set_value to avoid triggering validations/overhead of get_doc().save()
#             frappe.db.set_value("Branch Petty Cash Account", w.name, "unsettled_cash", new_unsettled_cash)
            
#             # (Optional) Print log for debugging
#             # print(f"Synced {w.branch}: W({total_withdrawals_finacle}) - E({total_expenses_frappe}) = {new_unsettled_cash}")

#         frappe.db.commit()

#     except Exception as e:
#         frappe.log_error(f"Sync Error: {str(e)}", "Petty Cash Sync")
    
#     finally:
#         conn.close()



@frappe.whitelist()
def sync_finacle_withdrawals():
    """
    [OPTIMIZED] Calculates Unsettled Cash by aggregating Finacle Withdrawals 
    vs Frappe Expenses. Uses Branch-specific Go-Live dates to support phased rollouts.
    """
    
    # 1. Fetch Active Wallets (Now including go_live_date)
    wallets = frappe.get_all("Branch Petty Cash Account", 
        filters={"status": "Active"}, 
        fields=["name", "branch", "gl_sub_code", "go_live_date", "unsettled_cash"]
    )
    
    conn = db_connection()
    if not conn: return

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for w in wallets:
            if not w.gl_sub_code: continue
            
            # If a branch somehow doesn't have a go_live_date, fallback to April 1st
            branch_go_live_date = w.go_live_date or '2026-04-01'

            # --- STEP 1: FETCH TOTAL WITHDRAWALS FROM FINACLE (SUM 'D') ---
            # Fetch the SUM of all Debit transactions ON or AFTER the branch's specific go-live date.
            sql_finacle = """
                SELECT SUM(tran_amt) as total_withdrawal
                FROM (
                    SELECT h.tran_amt
                    FROM tbaadm.gam g
                    JOIN tbaadm.htd h ON g.acid = h.acid
                    WHERE g.foracid = %s 
                      AND h.part_tran_type = 'D' 
                      AND h.del_flg = 'N'
                      AND h.tran_date >= %s
                    
                    UNION ALL
                    
                    SELECT d.tran_amt
                    FROM tbaadm.gam g
                    JOIN tbaadm.dtd d ON g.acid = d.acid
                    WHERE g.foracid = %s 
                      AND d.part_tran_type = 'D' 
                      AND d.del_flg = 'N'
                      AND d.tran_date >= %s
                ) as combined
            """
            
            # Pass gl_sub_code and branch_go_live_date twice (once for HTD, once for DTD)
            cursor.execute(sql_finacle, (w.gl_sub_code, branch_go_live_date, w.gl_sub_code, branch_go_live_date))
            result = cursor.fetchone()
            
            total_withdrawals_finacle = flt(result['total_withdrawal']) if result else 0.0

            # --- STEP 2: FETCH TOTAL EXPENSES FROM FRAPPE (SUM 'Expense') ---
            # Also filter Frappe expenses to only count those created ON or AFTER the go-live date
            total_expenses_frappe = frappe.db.sql("""
                SELECT COALESCE(SUM(amount), 0)
                FROM `tabPetty Cash Transaction`
                WHERE branch = %s 
                  AND transaction_type = 'Expense' 
                  AND docstatus = 1
                  AND transaction_date >= %s
            """, (w.branch, branch_go_live_date))[0][0]

            total_expenses_frappe = flt(total_expenses_frappe)

            # --- DEBUG LOGS ---
            print(f"\n--- SYNC DEBUG: {w.branch} | GO-LIVE: {branch_go_live_date} ---")
            print(f"Finacle Total (Withdrawals): {total_withdrawals_finacle}")
            print(f"Frappe Total (Expenses):     {total_expenses_frappe}")
            print(f"Old Unsettled Cash:          {w.unsettled_cash}")
            print(f"Calculated New Cash:         {total_withdrawals_finacle - total_expenses_frappe}")
            print("--------------------------------\n")

            # --- STEP 3: CALCULATE AND UPDATE ---
            new_unsettled_cash = total_withdrawals_finacle - total_expenses_frappe
            
            # Update the wallet directly
            frappe.db.set_value("Branch Petty Cash Account", w.name, "unsettled_cash", new_unsettled_cash)

        frappe.db.commit()

    except Exception as e:
        frappe.log_error(f"Sync Error: {str(e)}", "Petty Cash Sync")
    
    finally:
        conn.close()

# bench execute sahayog.petty_cash_management.api.auto_cash_withdrawal_sync.sync_finacle_withdrawals




# Note: Removed 'create_withdrawal_entry' function as it is no longer needed.
