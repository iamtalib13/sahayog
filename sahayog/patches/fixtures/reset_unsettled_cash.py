import frappe
from sahayog.petty_cash_management.api.auto_cash_withdrawal_sync import sync_finacle_withdrawals

def fix_my_data():
    print("--- Starting Data Cleanup ---")

    # 1. Reset Unsettled Cash to 0 (Start fresh)
    frappe.db.sql("UPDATE `tabBranch Petty Cash Account` SET unsettled_cash = 0")
    
    # 2. Delete any old "Cash Withdrawal" transactions (optional, if you want a clean slate)
    # frappe.db.sql("DELETE FROM `tabPetty Cash Transaction` WHERE transaction_type = 'Cash Withdrawal'")
    
    frappe.db.commit()
    print("✅ Reset Complete. Starting Re-Sync...")

    # 3. Run the NEW Sync Logic
    # This will fetch withdrawals from Finacle.
    # Because we check 'if exists', it will create records for MISSING ones.
    # And because we reset unsettled_cash to 0, submitting these new records
    # will calculate the correct total from scratch.
    sync_finacle_withdrawals()
    
    print("✅ Data Fixed! Unsettled Cash should now be accurate.")

# Run this function
fix_my_data()
