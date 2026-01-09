import frappe
from frappe.model.document import Document

class BranchPettyCashAccount(Document):
    def before_save(self):
        # Auto-set monthly limit based on branch type
        if self.branch_type == "Metro":
            self.monthly_limit = 25000
        else:
            self.monthly_limit = 15000
    
    def get_current_balance(self):
        # Calculate from all transactions
        balance = frappe.db.sql("""
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'Fund Allocation' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0)
            FROM `tabPetty Cash Transaction`
            WHERE branch = %s AND docstatus = 1
        """, self.branch)[0][0]
        
        return balance or 0
