import frappe
from frappe import _
from frappe.model.document import Document

class PettyCashTransaction(Document):

    def before_insert(self):
        # If the user is not an HO Manager, auto-set their branch
        if "HO Petty Cash Manager" not in frappe.get_roles():
            # FIX: Fetch 'sahayog_branch' (SOL ID) instead of standard 'branch'
            emp_branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "sahayog_branch")
            
            if emp_branch:
                self.branch = emp_branch

    # def before_save(self):
    #     # Fetch branch details
    #     if self.branch:
    #         # We use the ID (1108) to fetch the Name (Thane) for display
    #         # ignore_permissions=True ensures this works even if user has restrictions
    #         branch_name = frappe.db.get_value("Sahayog Branch", self.branch, "branch_name")
    #         if branch_name:
    #             self.branch_name = branch_name


    def before_save(self):
        # Fetch branch details using the unique SOL ID (self.branch)
        if self.branch:
            # FIX: We fetch the field "branch" because that is what contains "THANE BRANCH"
            # We do NOT fetch "branch_name" because that column does not exist.
            branch_label = frappe.db.get_value("Sahayog Branch", self.branch, "branch")
            
            if branch_label:
                self.branch_name = branch_label

    def validate(self):
        # 1. Check existence IGNORING PERMISSIONS
        # We use count() to bypass permission queries. 
        # Since self.branch is now "1108" (from sahayog_branch), this will match your Account ID.
        account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
        
        if not account_exists:
            frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found! Please ask Administrator to create it.").format(self.branch))

        # 2. Fetch the wallet ignoring permissions for calculation
        wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        wallet.check_permission = lambda: None # Forceful bypass
        
        # Validations
        if self.transaction_type == "Expense":
            self.validate_expense(wallet)
        
        # Set current balance for display
        self.current_branch_balance = wallet.get_current_balance()

    def validate_expense(self, wallet):
        current_balance = wallet.get_current_balance()
        
        if current_balance < self.amount:
            frappe.throw(_("Insufficient balance. Available: ₹{0}").format(current_balance))
        
        # Check category-wise monthly limit
        branch_type = frappe.db.get_value("Branch Petty Cash Account", {"branch": self.branch}, "branch_type")
        category = frappe.get_doc("Expense Category", self.expense_category)
        
        limit = category.metro_limit if branch_type == "Metro" else category.non_metro_limit
        
        from frappe.utils import getdate, get_first_day, get_last_day
        first_day = get_first_day(self.transaction_date)
        last_day = get_last_day(self.transaction_date)
        
        # Use Administrator context to sum all previous transactions accurately
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
        self.update_wallet()
        self.approved_by = frappe.session.user
    
    def on_cancel(self):
        self.update_wallet()

    def update_wallet(self):
        if frappe.flags.in_test: return
        
        wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        wallet.flags.ignore_permissions = True
        
        wallet.current_balance = wallet.get_current_balance()
        if self.transaction_type == "Fund Allocation" and self.docstatus == 1:
            wallet.last_funded_on = self.transaction_date
            
        wallet.save(ignore_permissions=True)
