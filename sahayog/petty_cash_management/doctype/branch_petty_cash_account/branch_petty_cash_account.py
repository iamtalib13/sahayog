# import frappe
# from frappe.model.document import Document

# class BranchPettyCashAccount(Document):
    
#     def validate(self):
#         # 1. Fetch the official Branch Type from the Master (Sahayog Branch)
#         # We use the SOL ID (self.branch) to look it up
#         actual_branch_type = frappe.db.get_value("Sahayog Branch", self.branch, "branch_type")
        
#         # 2. Set the limit
#         if actual_branch_type == "Metro":
#             self.monthly_limit = 25000
#         else:
#             self.monthly_limit = 15000
            
#     # def get_current_balance(self):
#     #     # Calculate from all transactions
#     #     balance = frappe.db.sql("""
#     #         SELECT 
#     #             COALESCE(SUM(CASE WHEN transaction_type = 'Fund Allocation' THEN amount ELSE 0 END), 0) -
#     #             COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0)
#     #         FROM `tabPetty Cash Transaction`
#     #         WHERE branch = %s AND docstatus = 1
#     #     """, self.branch)[0][0]
        
#     #     return balance or 0

#     def get_current_balance(self):
#         # 1. Total Funds Allocated (Parent Level)
#         total_funds = frappe.db.sql("""
#             SELECT COALESCE(SUM(amount), 0)
#             FROM `tabPetty Cash Transaction`
#             WHERE branch = %s AND transaction_type = 'Fund Allocation' AND docstatus = 1
#         """, self.branch)[0][0]

#         # 2. Total Expenses (Child Table Level)
#         total_expenses = frappe.db.sql("""
#             SELECT COALESCE(SUM(child.amount), 0)
#             FROM `tabPetty Cash Transaction Item` child
#             JOIN `tabPetty Cash Transaction` parent ON child.parent = parent.name
#             WHERE parent.branch = %s 
#             AND parent.transaction_type = 'Expense' 
#             AND parent.docstatus = 1
#         """, self.branch)[0][0]
        
#         return (total_funds - total_expenses) or 0




# import frappe
# from frappe.model.document import Document

# class BranchPettyCashAccount(Document):
    
#     def validate(self):
#         # 1. Fetch the official Branch Type from the Master
#         actual_branch_type = frappe.db.get_value("Sahayog Branch", self.branch, "branch_type")
        
#         # [FIX] Only apply auto-limit if the user hasn't set one yet (i.e. if it's 0)
#         # or if it is a brand new document and no limit was provided.
#         if not self.monthly_limit:
#             if actual_branch_type == "Metro":
#                 self.monthly_limit = 25000
#             else:
#                 self.monthly_limit = 15000
        
#         # Note: If you manually type 20000 in the UI, self.monthly_limit is 20000.
#         # The 'if not self.monthly_limit' check fails, so it skips the reset.
#         # Your manual value is preserved.

#     def get_current_balance(self):
#         # 1. Total Funds Allocated
#         total_funds = frappe.db.sql("""
#             SELECT COALESCE(SUM(amount), 0)
#             FROM `tabPetty Cash Transaction`
#             WHERE branch = %s AND transaction_type = 'Fund Allocation' AND docstatus = 1
#         """, self.branch)[0][0]

#         # 2. Total Expenses
#         total_expenses = frappe.db.sql("""
#             SELECT COALESCE(SUM(child.amount), 0)
#             FROM `tabPetty Cash Transaction Item` child
#             JOIN `tabPetty Cash Transaction` parent ON child.parent = parent.name
#             WHERE parent.branch = %s 
#             AND parent.transaction_type = 'Expense' 
#             AND parent.docstatus = 1
#         """, self.branch)[0][0]
        
#         return (total_funds - total_expenses) or 0



import frappe
from frappe.model.document import Document

class BranchPettyCashAccount(Document):
    
    def validate(self):
        actual_branch_type = frappe.db.get_value("Sahayog Branch", self.branch, "branch_type")
        
        if not self.monthly_limit:
            if actual_branch_type == "Metro":
                self.monthly_limit = 25000
            else:
                self.monthly_limit = 15000

    def get_current_balance(self):
        # 1. Total Funds Allocated
        total_funds = frappe.db.sql("""
            SELECT COALESCE(SUM(amount), 0)
            FROM `tabPetty Cash Transaction`
            WHERE branch = %s AND transaction_type = 'Fund Allocation' AND docstatus = 1
        """, self.branch)[0][0]

        # 2. Total Expenses (CHANGED: Sum 'amount_deducted' from Parent, not child items)
        # This allows us to partially deduct funds initially, then deduct the rest later.
        total_expenses = frappe.db.sql("""
            SELECT COALESCE(SUM(amount_deducted), 0)
            FROM `tabPetty Cash Transaction`
            WHERE branch = %s 
            AND transaction_type = 'Expense' 
            AND docstatus = 1
        """, self.branch)[0][0]
        
        return (total_funds - total_expenses) or 0
