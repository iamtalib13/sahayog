import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_first_day, get_last_day, nowdate, flt, getdate

class PettyCashTransaction(Document):

    def before_insert(self):
        # 1. Set Date to Today
        if not self.transaction_date:
            self.transaction_date = nowdate()

        
        # 2. STRICT ROLE ENFORCEMENT
        # If user is NOT a Manager, force Type to Expense
        if "HO Petty Cash Manager" not in frappe.get_roles():
            self.transaction_type = "Expense"

        # 2. Auto-set branch (Restored "HO Petty Cash Manager" check)
        if "HO Petty Cash Manager" not in frappe.get_roles():
            emp_branch = frappe.db.get_value(
                "Employee", 
                {"user_id": frappe.session.user, "status": "Active"}, 
                "sahayog_branch"
            )
            if emp_branch:
                self.branch = emp_branch

    def before_save(self):
        # 1. Fetch branch name for display
        if self.branch:
            branch_label = frappe.db.get_value("Sahayog Branch", self.branch, "branch")
            if branch_label:
                self.branch_name = branch_label
        
        # 2. Auto-calculate total from items table if Expense
        if self.transaction_type == "Expense":
            total_expense = sum(flt(item.amount) for item in self.items)
            self.amount = total_expense

    # def validate(self):
    #     # 1. Check Account Existence (Ignoring Permissions)
    #     account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
    #     if not account_exists:
    #         frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found! Please ask Administrator to create it.").format(self.branch))

    #     # 2. Fetch the wallet ignoring permissions for balance check
    #     wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
    #     # Forceful bypass as requested
    #     wallet.check_permission = lambda: None 
        
    #     # 3. Validations for Expense
    #     if self.transaction_type == "Expense":
    #         self.validate_expense(wallet)
        
    #     # 4. Set current balance for display (UI purpose only)
    #     self.current_branch_balance = wallet.get_current_balance()


        def validate(self):
            # 1. Check Account Existence (Ignoring Permissions)
            account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
            if not account_exists:
                frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found! Please ask Administrator to create it.").format(self.branch))

            # 2. Fetch the wallet ignoring permissions for balance check
            wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
            wallet.check_permission = lambda: None 
            
            # 3. Validations for Expense
            if self.transaction_type == "Expense":
                # [FIX] Manually enforce mandatory check for items table
                if not self.items:
                    frappe.throw(_("At least one expense item is required when Transaction Type is 'Expense'."))
                
                # [NEW] Validate Bill Dates
                self.validate_bill_dates()

                self.validate_expense(wallet)
            
            # 4. Set current balance for display (UI purpose only)
            self.current_branch_balance = wallet.get_current_balance()
        
        # [NEW METHOD]
        def validate_bill_dates(self):
            current_date = getdate(nowdate())
            
            for item in self.items:
                if item.bill_date:
                    bill_date = getdate(item.bill_date)
                    if bill_date > current_date:
                        frappe.throw(
                            _("Row #{0}: Bill Date ({1}) cannot be in the future. Today is {2}.").format(
                                item.idx, item.bill_date, current_date
                            )
                        )

    def validate_expense(self, wallet):
        # A. Check Total Balance
        current_balance = wallet.get_current_balance()
        
        if current_balance < self.amount:
            frappe.throw(_("Insufficient balance. Available: ₹{0}, Required: ₹{1}").format(current_balance, self.amount))
        
        # B. Check Category Limits (Loop through Child Table)
        branch_type = frappe.db.get_value("Branch Petty Cash Account", {"branch": self.branch}, "branch_type")
        
        # Create a dictionary to sum up expenses by category in this current transaction
        current_tx_categories = {}
        for item in self.items:
            current_tx_categories.setdefault(item.expense_category, 0.0)
            current_tx_categories[item.expense_category] += flt(item.amount)
            
        # Now validate each category total against the monthly limit
        for category_id, tx_amount in current_tx_categories.items():
            self.check_category_limit(category_id, tx_amount, branch_type)

    def check_category_limit(self, category_id, tx_amount, branch_type):
        # 1. Fetch the config document using the ID
        category_doc = frappe.get_doc("Expense Category", category_id)
        
        # 2. Get the READABLE name 
        # Tries to find a readable field; defaults to ID if not found
        readable_name = category_doc.get("expense_category") or category_doc.get("category_name") or category_doc.get("name1") or category_id

        limit = category_doc.metro_limit if branch_type == "Metro" else category_doc.non_metro_limit
        
        # If limit is 0, we treat it as unlimited
        if limit <= 0:
            return

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
        # We pass self.name (or "New") to exclude current doc from the "Already Spent" sum
        spent = frappe.db.sql(spent_sql, (self.branch, category_id, first_day, last_day, self.name or "New"))[0][0]
        
        if (spent + tx_amount) > limit:
            frappe.throw(_(
                "Limit exceeded for {0}! {1} limit is ₹{2}. Already spent: ₹{3}. Current Transaction: ₹{4}"
            ).format(readable_name, branch_type, limit, spent, tx_amount))

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


@frappe.whitelist()
def get_category_limit_status(branch, category, transaction_date, doc_name=None):
    """
    Returns the remaining limit for a specific category and branch for the current month.
    """
    if not branch or not category or not transaction_date:
        return 0

    # 1. Get Branch Type
    branch_type = frappe.db.get_value("Branch Petty Cash Account", {"branch": branch}, "branch_type")
    if not branch_type:
        return 0

    # 2. Get Category Limit
    category_doc = frappe.get_doc("Expense Category", category)
    limit = category_doc.metro_limit if branch_type == "Metro" else category_doc.non_metro_limit
    
    # If unlimited, return a high number or -1 to indicate 'Unlimited'
    if limit <= 0:
        return 999999999 

    # 3. Calculate Already Spent
    first_day = get_first_day(transaction_date)
    last_day = get_last_day(transaction_date)

    # We use sql to sum up committed expenses
    # doc_name is passed to exclude the current document if we are editing it
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
    spent = frappe.db.sql(spent_sql, (branch, category, first_day, last_day, doc_name or "New"))[0][0]

    available = flt(limit) - flt(spent)
    return max(available, 0)
