import frappe
from frappe.model.document import Document

class BranchPettyCashAccount(Document):
    
    def validate(self):
        # 1. Fetch the official Branch Type from the Master (Sahayog Branch)
        # We use the SOL ID (self.branch) to look it up
        actual_branch_type = frappe.db.get_value("Sahayog Branch", self.branch, "branch_type")
        
        # 2. Set the limit
        if actual_branch_type == "Metro":
            self.monthly_limit = 25000
        else:
            self.monthly_limit = 15000
            
    # def get_current_balance(self):
    #     # Calculate from all transactions
    #     balance = frappe.db.sql("""
    #         SELECT 
    #             COALESCE(SUM(CASE WHEN transaction_type = 'Fund Allocation' THEN amount ELSE 0 END), 0) -
    #             COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0)
    #         FROM `tabPetty Cash Transaction`
    #         WHERE branch = %s AND docstatus = 1
    #     """, self.branch)[0][0]
        
    #     return balance or 0

    def get_current_balance(self):
        # 1. Total Funds Allocated (Parent Level)
        total_funds = frappe.db.sql("""
            SELECT COALESCE(SUM(amount), 0)
            FROM `tabPetty Cash Transaction`
            WHERE branch = %s AND transaction_type = 'Fund Allocation' AND docstatus = 1
        """, self.branch)[0][0]

        # 2. Total Expenses (Child Table Level)
        total_expenses = frappe.db.sql("""
            SELECT COALESCE(SUM(child.amount), 0)
            FROM `tabPetty Cash Transaction Item` child
            JOIN `tabPetty Cash Transaction` parent ON child.parent = parent.name
            WHERE parent.branch = %s 
            AND parent.transaction_type = 'Expense' 
            AND parent.docstatus = 1
        """, self.branch)[0][0]
        
        return (total_funds - total_expenses) or 0

