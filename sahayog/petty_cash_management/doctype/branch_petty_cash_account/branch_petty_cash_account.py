import frappe
from frappe.model.document import Document
from sahayog.petty_cash_management.permissions import get_user_allowed_branches # [NEW IMPORT]
from frappe.utils import flt

class BranchPettyCashAccount(Document):
    
    def validate(self):
        actual_branch_type = frappe.db.get_value("Sahayog Branch", self.branch, "branch_type")
        
        if not self.monthly_limit:
            if actual_branch_type == "Metro":
                self.monthly_limit = 25000
            else:
                self.monthly_limit = 15000

         # 2. [NEW] Auto-generate GL Sub Code
        # Logic: Branch Code (e.g., 1001) + Fixed Suffix (01390200001)
        if self.branch:
            account_suffix = "01390200001"
            self.gl_sub_code = f"{self.branch}{account_suffix}"

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
    

    # [NEW] SECURITY CHECK
    def has_permission(self, permtype="read"):
        allowed_branches = get_user_allowed_branches()

        if allowed_branches is None:
            return True

        if self.branch in allowed_branches:
            return True
            
        return False
    
    def update_unsettled_cash(self, amount, transaction_type):
        """
        Updates the Unsettled Cash (Cash-In-Hand) tracker.
        transaction_type: 'Withdrawal' (Finacle Debit) or 'Expense' (Portal Submission)
        """
        current_val = flt(self.unsettled_cash)
        amount = flt(amount)
        
        if transaction_type == "Withdrawal":
            # Money left the bank -> User has cash now -> Unsettled Cash INCREASES
            self.unsettled_cash = current_val + amount
            
        elif transaction_type == "Expense":
            # User submitted bills -> Cash is accounted for -> Unsettled Cash DECREASES
            self.unsettled_cash = current_val - amount
        
        # Validation: Negative Cash in Hand logic
        if self.unsettled_cash < 0:
            frappe.msgprint(f"Note: Unsettled Cash is negative ({self.unsettled_cash}). This implies a reimbursement claim is pending.")

        # Save ignoring permissions (System update)
        self.save(ignore_permissions=True)
        
        # Check for Hoarding
        self.check_cash_hoarding()

    def check_cash_hoarding(self):
        """Alert HO if branch is holding too much cash without bills"""
        THRESHOLD = 2000 # Configurable limit (e.g., ₹2000)
        
        if self.unsettled_cash > THRESHOLD:
            # OPTIONAL: Send a system notification or email
            # frappe.sendmail(recipients="ho_manager@sahayog.com", subject="Cash Hoarding Alert", ...)
            print(f"⚠️ ALERT: Branch {self.branch} is holding ₹{self.unsettled_cash} (Limit: ₹{THRESHOLD})")