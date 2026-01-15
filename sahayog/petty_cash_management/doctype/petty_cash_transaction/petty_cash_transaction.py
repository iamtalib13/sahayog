# import frappe
# from frappe import _
# from frappe.model.document import Document

# class PettyCashTransaction(Document):

#     def before_insert(self):
#         # If the user is not an HO Manager, auto-set their branch
#         if "HO Petty Cash Manager" not in frappe.get_roles():
#             # FIX: Fetch 'sahayog_branch' (SOL ID) instead of standard 'branch'
#             emp_branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "sahayog_branch")
            
#             if emp_branch:
#                 self.branch = emp_branch

#     # def before_save(self):
#     #     # Fetch branch details
#     #     if self.branch:
#     #         # We use the ID (1108) to fetch the Name (Thane) for display
#     #         # ignore_permissions=True ensures this works even if user has restrictions
#     #         branch_name = frappe.db.get_value("Sahayog Branch", self.branch, "branch_name")
#     #         if branch_name:
#     #             self.branch_name = branch_name


#     def before_save(self):
#         # Fetch branch details using the unique SOL ID (self.branch)
#         if self.branch:
#             # FIX: We fetch the field "branch" because that is what contains "THANE BRANCH"
#             # We do NOT fetch "branch_name" because that column does not exist.
#             branch_label = frappe.db.get_value("Sahayog Branch", self.branch, "branch")
            
#             if branch_label:
#                 self.branch_name = branch_label

#     def validate(self):
#         # 1. Check existence IGNORING PERMISSIONS
#         # We use count() to bypass permission queries. 
#         # Since self.branch is now "1108" (from sahayog_branch), this will match your Account ID.
#         account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
        
#         if not account_exists:
#             frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found! Please ask Administrator to create it.").format(self.branch))

#         # 2. Fetch the wallet ignoring permissions for calculation
#         wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
#         wallet.check_permission = lambda: None # Forceful bypass
        
#         # Validations
#         if self.transaction_type == "Expense":
#             self.validate_expense(wallet)
        
#         # Set current balance for display
#         self.current_branch_balance = wallet.get_current_balance()

#     def validate_expense(self, wallet):
#         current_balance = wallet.get_current_balance()
        
#         if current_balance < self.amount:
#             frappe.throw(_("Insufficient balance. Available: ₹{0}").format(current_balance))
        
#         # Check category-wise monthly limit
#         branch_type = frappe.db.get_value("Branch Petty Cash Account", {"branch": self.branch}, "branch_type")
#         category = frappe.get_doc("Expense Category", self.expense_category)
        
#         limit = category.metro_limit if branch_type == "Metro" else category.non_metro_limit
        
#         from frappe.utils import getdate, get_first_day, get_last_day
#         first_day = get_first_day(self.transaction_date)
#         last_day = get_last_day(self.transaction_date)
        
#         # Use Administrator context to sum all previous transactions accurately
#         spent = frappe.db.sql("""
#             SELECT COALESCE(SUM(amount), 0)
#             FROM `tabPetty Cash Transaction`
#             WHERE branch = %s 
#               AND expense_category = %s
#               AND transaction_date BETWEEN %s AND %s
#               AND docstatus = 1
#               AND name != %s
#         """, (self.branch, self.expense_category, first_day, last_day, self.name))[0][0]
        
#         if (spent + self.amount) > limit:
#             frappe.throw(_(
#                 "Category limit exceeded! {0} limit for {1} is ₹{2}. Already spent: ₹{3}"
#             ).format(branch_type, self.expense_category, limit, spent))
    
#     def on_submit(self):
#         self.update_wallet()
#         self.approved_by = frappe.session.user
    
#     def on_cancel(self):
#         self.update_wallet()

#     def update_wallet(self):
#         if frappe.flags.in_test: return
        
#         wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
#         wallet.flags.ignore_permissions = True
        
#         wallet.current_balance = wallet.get_current_balance()
#         if self.transaction_type == "Fund Allocation" and self.docstatus == 1:
#             wallet.last_funded_on = self.transaction_date
            
#         wallet.save(ignore_permissions=True)



import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_first_day, get_last_day

class PettyCashTransaction(Document):

    def before_insert(self):
        # Auto-set branch for non-HO users
        if "HO Petty Cash Manager" not in frappe.get_roles():
            emp_branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "sahayog_branch")
            if emp_branch:
                self.branch = emp_branch
        

    def before_insert(self):
        emp_branch = frappe.db.get_value(
            "Employee",
            {"user_id": frappe.session.user, "status": "Active"},
            "sahayog_branch"
        )
        if emp_branch:
            self.branch = emp_branch

    def before_save(self):
        # Fetch branch name
        if self.branch:
            branch_label = frappe.db.get_value("Sahayog Branch", self.branch, "branch")
            if branch_label:
                self.branch_name = branch_label
        
        # Calculate Total Amount from Child Table if Expense
        if self.transaction_type == "Expense":
            # Auto-calculate total from items table
            total_expense = sum(item.amount for item in self.items)
            self.amount = total_expense

    def validate(self):
        # 1. Check existence IGNORING PERMISSIONS
        account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
        
        if not account_exists:
            frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found! Please ask Administrator to create it.").format(self.branch))

        # 2. Fetch the wallet ignoring permissions for balance check
        wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        wallet.check_permission = lambda: None # Forceful bypass
        
        # 3. Validations
        if self.transaction_type == "Expense":
            self.validate_expense(wallet)
        
        # 4. Set current balance for display (UI purpose only)
        self.current_branch_balance = wallet.get_current_balance()

    def validate_expense(self, wallet):
        # A. Check Total Balance
        current_balance = wallet.get_current_balance()
        
        # If editing an existing doc, add back the current doc's amount to balance to avoid double counting
        if not self.is_new():
             current_balance += self.db_get("amount") or 0

        if current_balance < self.amount:
            frappe.throw(_("Insufficient balance. Available: ₹{0}, Required: ₹{1}").format(current_balance, self.amount))
        
        # B. Check Category Limits (Loop through Child Table)
        branch_type = frappe.db.get_value("Branch Petty Cash Account", {"branch": self.branch}, "branch_type")
        
        # Create a dictionary to sum up expenses by category in this current transaction
        # Example: { 'Stationary': 500, 'Tea': 200 }
        current_tx_categories = {}
        for item in self.items:
            current_tx_categories.setdefault(item.expense_category, 0)
            current_tx_categories[item.expense_category] += item.amount
            
        # Now validate each category total against the monthly limit
        for category_name, tx_amount in current_tx_categories.items():
            self.check_category_limit(category_name, tx_amount, branch_type)

    def check_category_limit(self, category_name, tx_amount, branch_type):
        category_doc = frappe.get_doc("Expense Category", category_name)
        limit = category_doc.metro_limit if branch_type == "Metro" else category_doc.non_metro_limit
        
        # Get already spent amount for this category in current month
        first_day = get_first_day(self.transaction_date)
        last_day = get_last_day(self.transaction_date)
        
        # Query: Sum amounts from Child Table of *submitted* transactions
        spent_sql = """
            SELECT COALESCE(SUM(child.amount), 0)
            FROM `tabPetty Cash Transaction Item` child
            JOIN `tabPetty Cash Transaction` parent ON child.parent = parent.name
            WHERE parent.branch = %s 
              AND child.expense_category = %s
              AND parent.transaction_date BETWEEN %s AND %s
              AND parent.docstatus = 1
              AND parent.name != %s
        """
        spent = frappe.db.sql(spent_sql, (self.branch, category_name, first_day, last_day, self.name))[0][0]
        
        if (spent + tx_amount) > limit:
            frappe.throw(_(
                "Limit exceeded for {0}! {1} limit is ₹{2}. Already spent: ₹{3}. Current Transaction: ₹{4}"
            ).format(category_name, branch_type, limit, spent, tx_amount))

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
