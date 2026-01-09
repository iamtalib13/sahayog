import frappe
from frappe import _
from frappe.model.document import Document

class PettyCashTransaction(Document):
    def before_save(self):
        # Fetch branch details
        if self.branch:
            branch_doc = frappe.get_doc("Sahayog Branch", self.branch)
            self.branch_name = branch_doc.branch_name  # Adjust field name
    
    def validate(self):
        if self.transaction_type == "Expense":
            self.validate_expense()
        
        # Show current balance
        account = frappe.get_doc("Branch Petty Cash Account", self.branch)
        self.current_branch_balance = account.get_current_balance()
    
    def validate_expense(self):
        # 1. Check if branch has sufficient balance
        account = frappe.get_doc("Branch Petty Cash Account", self.branch)
        current_balance = account.get_current_balance()
        
        if current_balance < self.amount:
            frappe.throw(_("Insufficient balance. Available: ₹{0}").format(current_balance))
        
        # 2. Check category-wise monthly limit
        branch_type = frappe.db.get_value("Branch Petty Cash Account", self.branch, "branch_type")
        category = frappe.get_doc("Expense Category", self.expense_category)
        
        limit = category.metro_limit if branch_type == "Metro" else category.non_metro_limit
        
        # Get current month's total for this category
        from frappe.utils import getdate, get_first_day, get_last_day
        first_day = get_first_day(self.transaction_date)
        last_day = get_last_day(self.transaction_date)
        
        spent = frappe.db.sql("""
            SELECT COALESCE(SUM(amount), 0)
            FROM `tabPetty Cash Transaction`
            WHERE branch = %s 
              AND expense_category = %s
              AND transaction_date BETWEEN %s AND %s
              AND docstatus = 1
              AND name != %s
        """, (self.branch, self.expense_category, first_day, last_day, self.name))[0][0]
        
        if (spent + self.amount) > limit:
            frappe.throw(_(
                "Category limit exceeded! {0} limit for {1} is ₹{2}. Already spent: ₹{3}"
            ).format(branch_type, self.expense_category, limit, spent))
    
    def on_submit(self):
        # Update branch balance (virtual - calculated from transactions)
        account = frappe.get_doc("Branch Petty Cash Account", self.branch)
        account.current_balance = account.get_current_balance()
        
        if self.transaction_type == "Fund Allocation":
            account.last_funded_on = self.transaction_date
        
        account.save()
        self.approved_by = frappe.session.user
    
    def on_cancel(self):
        # Recalculate balance
        account = frappe.get_doc("Branch Petty Cash Account", self.branch)
        account.current_balance = account.get_current_balance()
        account.save()
