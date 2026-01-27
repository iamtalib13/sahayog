import frappe
from sahayog.petty_cash_management.api.auto_cash_withdrawal_sync import sync_finacle_withdrawals

def execute():
    frappe.logger().info("--- Starting Unsettled Cash Reset ---")
    
    # 1. Reset Fields for ALL Branches
    frappe.db.sql("""
        UPDATE `tabBranch Petty Cash Account`
        SET 
            unsettled_cash = 0,
            last_synced_transaction_id = '0'
    """)
    
    frappe.db.commit()
    print("✅ All Branch Unsettled Cash & Sync IDs reset to 0.")
    
    # 2. Trigger the Sync to fetch fresh data (Jan 1 2026 onwards)
    print("🔄 Running Sync to fetch latest withdrawals...")
    
    # We call the existing API function we wrote earlier
    # This will fetch all Debits > '0' (since we reset ID) and >= '2026-01-01'
    sync_finacle_withdrawals()
    
    print("✅ Sync Complete. Unsettled Cash is now up to date.")
