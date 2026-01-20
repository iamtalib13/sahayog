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

        # 3. Auto-set branch (Restored "HO Petty Cash Manager" check)
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

            # [STRICT] Validate Wallet Balance and Category Limits
            self.validate_expense(wallet)
        
        # 4. Set current balance for display (UI purpose only)
        self.current_branch_balance = wallet.get_current_balance()
    
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
        # A. Check Total Wallet Balance
        current_balance = wallet.get_current_balance()
        if current_balance < self.amount:
            frappe.throw(_("Insufficient Branch Wallet Balance. Available: ₹{0}, Required: ₹{1}").format(current_balance, self.amount))
        
        # B. Check Category Limits
        branch_type = frappe.db.get_value("Branch Petty Cash Account", {"branch": self.branch}, "branch_type")
        
        # 1. Sum up current transaction items by category
        current_tx_categories = {}
        for item in self.items:
            current_tx_categories.setdefault(item.expense_category, 0.0)
            current_tx_categories[item.expense_category] += flt(item.amount)
            
        # 2. Validate each category total
        for category_id, tx_amount in current_tx_categories.items():
            self.check_category_limit(category_id, tx_amount, branch_type)

    def check_category_limit(self, category_id, tx_amount, branch_type):
        # Fetch Category Config
        category_doc = frappe.get_doc("Expense Category", category_id)
        limit = category_doc.metro_limit if branch_type == "Metro" else category_doc.non_metro_limit
        
        # Unlimited check
        if limit <= 0: return

        # Fetch Already Spent (Submitted Docs Only)
        first_day = get_first_day(self.transaction_date)
        last_day = get_last_day(self.transaction_date)
        
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
        already_spent = frappe.db.sql(spent_sql, (self.branch, category_id, first_day, last_day, self.name or "New"))[0][0]
        
        # Calculate Remaining BEFORE this transaction
        remaining = flt(limit) - flt(already_spent)
        
        # STRICT Check: If the amount being spent NOW is greater than what is left
        if tx_amount > remaining:
            readable_name = category_doc.category_name
            frappe.throw(_(
                "Limit Exceeded for Category: <b>{0}</b><br>"
                "Monthly Limit: ₹{1}<br>"
                "Already Spent: ₹{2}<br>"
                "Remaining: ₹{3}<br>"
                "You are trying to spend: ₹{4}"
            ).format(readable_name, limit, already_spent, remaining, tx_amount))

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
    
    # If unlimited, return a high number
    if limit <= 0:
        return 999999999 

    # 3. Calculate Already Spent
    first_day = get_first_day(transaction_date)
    last_day = get_last_day(transaction_date)

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


@frappe.whitelist()
def get_branch_balance(branch):
    """
    Returns the current wallet balance for the branch using direct SQL.
    """
    if not branch:
        return 0.0
        
    # [FIX] Use SQL to ensure we find the record even if permissions or caching act up
    balance = frappe.db.sql("""
        SELECT current_balance 
        FROM `tabBranch Petty Cash Account` 
        WHERE branch = %s 
        LIMIT 1
    """, branch)
    
    # If a record is found, return the balance; otherwise return 0.0
    return flt(balance[0][0]) if balance else 0.0
