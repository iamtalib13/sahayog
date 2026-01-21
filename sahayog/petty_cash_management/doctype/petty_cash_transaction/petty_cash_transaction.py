import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_first_day, get_last_day, nowdate, flt, getdate

# class PettyCashTransaction(Document):

#     def before_insert(self):
#         # 1. Set Date to Today
#         if not self.transaction_date:
#             self.transaction_date = nowdate()

#         # 2. STRICT ROLE ENFORCEMENT
#         # If user is NOT a Manager, force Type to Expense
#         if "HO Petty Cash Manager" not in frappe.get_roles():
#             self.transaction_type = "Expense"

#         # 3. Auto-set branch (Restored "HO Petty Cash Manager" check)
#         if "HO Petty Cash Manager" not in frappe.get_roles():
#             emp_branch = frappe.db.get_value(
#                 "Employee", 
#                 {"user_id": frappe.session.user, "status": "Active"}, 
#                 "sahayog_branch"
#             )
#             if emp_branch:
#                 self.branch = emp_branch

#     def before_save(self):
#         # 1. Fetch branch name for display
#         if self.branch:
#             branch_label = frappe.db.get_value("Sahayog Branch", self.branch, "branch")
#             if branch_label:
#                 self.branch_name = branch_label
        
#         # 2. Auto-calculate total from items table if Expense
#         if self.transaction_type == "Expense":
#             total_expense = sum(flt(item.amount) for item in self.items)
#             self.amount = total_expense

#     def validate(self):
#         # 1. Check Account Existence (Ignoring Permissions)
#         account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
#         if not account_exists:
#             frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found! Please ask Administrator to create it.").format(self.branch))

#         # 2. Fetch the wallet ignoring permissions for balance check
#         wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
#         wallet.check_permission = lambda: None 
        
#         # 3. Validations for Expense
#         if self.transaction_type == "Expense":
#             # [FIX] Manually enforce mandatory check for items table
#             if not self.items:
#                 frappe.throw(_("At least one expense item is required when Transaction Type is 'Expense'."))
            
#             # [NEW] Validate Bill Dates
#             self.validate_bill_dates()

#             # [STRICT] Validate Wallet Balance and Category Limits
#             self.validate_expense(wallet)
        
#         # 4. Set current balance for display (UI purpose only)
#         self.current_branch_balance = wallet.get_current_balance()
    
#     def validate_bill_dates(self):
#         current_date = getdate(nowdate())
#         for item in self.items:
#             if item.bill_date:
#                 bill_date = getdate(item.bill_date)
#                 if bill_date > current_date:
#                     frappe.throw(
#                         _("Row #{0}: Bill Date ({1}) cannot be in the future. Today is {2}.").format(
#                             item.idx, item.bill_date, current_date
#                         )
#                     )

#     def validate_expense(self, wallet):
#         # A. Check Total Wallet Balance
#         current_balance = wallet.get_current_balance()
#         if current_balance < self.amount:
#             frappe.throw(_("Insufficient Branch Wallet Balance. Available: ₹{0}, Required: ₹{1}").format(current_balance, self.amount))
        
#         # B. Check Category Limits
#         branch_type = frappe.db.get_value("Branch Petty Cash Account", {"branch": self.branch}, "branch_type")
        
#         # 1. Sum up current transaction items by category
#         current_tx_categories = {}
#         for item in self.items:
#             current_tx_categories.setdefault(item.expense_category, 0.0)
#             current_tx_categories[item.expense_category] += flt(item.amount)
            
#         # 2. Validate each category total
#         for category_id, tx_amount in current_tx_categories.items():
#             self.check_category_limit(category_id, tx_amount, branch_type)

#     def check_category_limit(self, category_id, tx_amount, branch_type):
#         # Fetch Category Config
#         category_doc = frappe.get_doc("Expense Category", category_id)
#         limit = category_doc.metro_limit if branch_type == "Metro" else category_doc.non_metro_limit
        
#         # Unlimited check
#         if limit <= 0: return

#         # Fetch Already Spent (Submitted Docs Only)
#         first_day = get_first_day(self.transaction_date)
#         last_day = get_last_day(self.transaction_date)
        
#         spent_sql = """
#             SELECT COALESCE(SUM(child.amount), 0)
#             FROM `tabPetty Cash Transaction Item` child
#             JOIN `tabPetty Cash Transaction` parent ON child.parent = parent.name
#             WHERE parent.branch = %s 
#               AND child.expense_category = %s
#               AND parent.transaction_date BETWEEN %s AND %s
#               AND parent.docstatus = 1
#               AND parent.name != %s
#         """
#         # We pass self.name (or "New") to exclude current doc from the "Already Spent" sum
#         already_spent = frappe.db.sql(spent_sql, (self.branch, category_id, first_day, last_day, self.name or "New"))[0][0]
        
#         # Calculate Remaining BEFORE this transaction
#         remaining = flt(limit) - flt(already_spent)
        
#         # STRICT Check: If the amount being spent NOW is greater than what is left
#         if tx_amount > remaining:
#             readable_name = category_doc.category_name
#             frappe.throw(_(
#                 "Limit Exceeded for Category: <b>{0}</b><br>"
#                 "Monthly Limit: ₹{1}<br>"
#                 "Already Spent: ₹{2}<br>"
#                 "Remaining: ₹{3}<br>"
#                 "You are trying to spend: ₹{4}"
#             ).format(readable_name, limit, already_spent, remaining, tx_amount))

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
from frappe.utils import get_first_day, get_last_day, nowdate, flt, getdate

class PettyCashTransaction(Document):

    def before_insert(self):
        if not self.transaction_date:
            self.transaction_date = nowdate()
        
        # Default Status
        self.approval_status = "Draft"

        if "HO Petty Cash Manager" not in frappe.get_roles():
            self.transaction_type = "Expense"
            emp_branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user, "status": "Active"}, "sahayog_branch")
            if emp_branch:
                self.branch = emp_branch

    def before_save(self):
        if self.branch:
            self.branch_name = frappe.db.get_value("Sahayog Branch", self.branch, "branch")
        
        if self.transaction_type == "Expense":
            total_expense = sum(flt(item.amount) for item in self.items)
            self.amount = total_expense
            
            # Recalculate Limits Breakdown on every save
            self.calculate_limit_breakdown()

    # def validate(self):
    #     # 1. Check Account Existence
    #     account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
    #     if not account_exists:
    #         frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found!").format(self.branch))

    #     wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        
    #     if self.transaction_type == "Expense":
    #         if not self.items:
    #             frappe.throw(_("At least one expense item is required."))
            
    #         self.validate_bill_dates()
            
    #         # [CHANGED] We now perform soft validation (Warning) instead of hard validation (Throw)
    #         self.validate_expense_soft(wallet)
        
    #     self.current_branch_balance = wallet.get_current_balance()
    

    def validate(self):
        # 1. Check Account Existence
        account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
        if not account_exists:
            frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found!").format(self.branch))

        wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        
        if self.transaction_type == "Expense":
            if not self.items:
                frappe.throw(_("At least one expense item is required."))
            
            # [FIX] Calculate breakdown HERE so variables are set before checking
            self.amount = sum(flt(item.amount) for item in self.items) # Ensure amount is set
            self.calculate_limit_breakdown() 

            self.validate_bill_dates()
            
            # Now safe to call because variables are set
            self.validate_expense_soft(wallet)
        
        self.current_branch_balance = wallet.get_current_balance()

    def validate_bill_dates(self):
        current_date = getdate(nowdate())
        for item in self.items:
            if item.bill_date and getdate(item.bill_date) > current_date:
                frappe.throw(_("Row #{0}: Bill Date cannot be in the future.").format(item.idx))

    def calculate_limit_breakdown(self):
        """
        Calculates how much of the expense is within limit and how much exceeds.
        Populates amount_within_limit and amount_exceeding_limit.
        """
        if self.transaction_type != "Expense":
            return

        branch_type = frappe.db.get_value("Branch Petty Cash Account", {"branch": self.branch}, "branch_type")
        
        # Group by category
        current_tx_categories = {}
        for item in self.items:
            current_tx_categories.setdefault(item.expense_category, 0.0)
            current_tx_categories[item.expense_category] += flt(item.amount)

        total_within = 0.0
        total_exceeding = 0.0
        
        first_day = get_first_day(self.transaction_date)
        last_day = get_last_day(self.transaction_date)

        for category_id, tx_amount in current_tx_categories.items():
            # Get Config
            category_doc = frappe.get_doc("Expense Category", category_id)
            limit = category_doc.metro_limit if branch_type == "Metro" else category_doc.non_metro_limit
            
            if limit <= 0:
                # Unlimited
                total_within += tx_amount
                continue

            # Get Spent (excluding this doc)
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
            already_spent = frappe.db.sql(spent_sql, (self.branch, category_id, first_day, last_day, self.name or "New"))[0][0]
            
            remaining_limit = max(flt(limit) - flt(already_spent), 0)

            if tx_amount <= remaining_limit:
                # Fully within limit
                total_within += tx_amount
            else:
                # Split Logic
                can_spend = remaining_limit
                excess = tx_amount - remaining_limit
                
                total_within += can_spend
                total_exceeding += excess

        self.amount_within_limit = total_within
        self.amount_exceeding_limit = total_exceeding

    def validate_expense_soft(self, wallet):
        # 1. Wallet Balance Check (Still Strict for TOTAL amount? Or Partial?)
        # Requirement: "Submit... not deduct". 
        # But if the wallet physically doesn't have money, we probably shouldn't allow even creating the debt.
        # However, for now, let's strictly check if wallet has enough for the *Within Limit* portion at least?
        # Scenario: Wallet has 5000. Bill is 10000. Limit is 2000.
        # We deduct 2000. Wallet has 3000. 
        # For now, let's keep Wallet Balance check strictly for the Amount being Deducted NOW.
        
        # But wait, if we eventually approve, we need the money. 
        # Let's keep Wallet Check strict for the FULL Amount to prevent negative cash later.
        current_balance = wallet.get_current_balance()
        
        # Note: current_balance check is tricky because we haven't deducted anything yet.
        if current_balance < self.amount:
             frappe.throw(_("Insufficient Branch Wallet Balance. Available: ₹{0}, Required: ₹{1}").format(current_balance, self.amount))

        # 2. Notify user if limits exceeded
        if self.amount_exceeding_limit > 0:
            frappe.msgprint(_("Warning: Expenses exceed category limits by ₹{0}. This amount will NOT be deducted until approved by HO.").format(self.amount_exceeding_limit), alert=True)

    def on_submit(self):
        if self.transaction_type == "Expense":
            if self.amount_exceeding_limit > 0:
                # Scenario 2: Exceeding Limit
                self.amount_deducted = self.amount_within_limit
                self.approval_status = "Pending Approval"
                frappe.msgprint(_("Transaction Submitted. ₹{0} deducted. ₹{1} pending HO Approval.").format(self.amount_deducted, self.amount_exceeding_limit))
            else:
                # Scenario 1: Within Limit
                self.amount_deducted = self.amount
                self.approval_status = "Approved" # Skip directly to Approved/Verified flow
                # Actually, requirement says "Verify" is needed for everyone.
                # So lets set it to 'Approved' (meaning Limits are OK), waiting for 'Verify'.
        
        elif self.transaction_type == "Fund Allocation":
            self.amount_deducted = 0 # Allocation adds funds, handled differently in wallet logic usually, or we treat allocation as negative expense? 
            # In your wallet logic: Balance = Sum(Alloc) - Sum(Expense Deducted).
            # So amount_deducted is irrelevant for Fund Allocation.
            self.approval_status = "Posted"

        self.update_wallet()

    def on_cancel(self):
        # Refund whatever was deducted
        self.amount_deducted = 0
        self.approval_status = "Draft"
        self.update_wallet()

    def update_wallet(self):
        # Trigger wallet update (recalculation based on Sum(amount_deducted))
        if frappe.flags.in_test: return
        wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        wallet.flags.ignore_permissions = True
        wallet.current_balance = wallet.get_current_balance() # This calls the new SQL logic
        if self.transaction_type == "Fund Allocation" and self.docstatus == 1:
            wallet.last_funded_on = self.transaction_date
        wallet.save(ignore_permissions=True)

    @frappe.whitelist()
    def ho_approve_limit(self):
        """
        Scenario 2 Step 2: HO Manager approves the excess.
        """
        if "HO Petty Cash Manager" not in frappe.get_roles():
            frappe.throw(_("Only HO Petty Cash Manager can approve limits."))

        if self.docstatus != 1 or self.approval_status != "Pending Approval":
            frappe.throw(_("Document is not pending approval."))

        # Deduct the remaining amount
        self.amount_deducted = self.amount # Now we deduct the full amount
        self.approval_status = "Approved" # Limit is cleared
        
        self.db_set('amount_deducted', self.amount)
        self.db_set('approval_status', 'Approved')
        
        # Update Wallet Balance
        self.update_wallet()
        
        frappe.msgprint(_("Limit Exceedance Approved. Full amount deducted from wallet."))

    @frappe.whitelist()
    def ho_verify_bill(self):
        """
        Scenario 1 & 2 Final Step: HO Manager verifies bills.
        Triggers Future Finacle Logic.
        """
        if "HO Petty Cash Manager" not in frappe.get_roles():
            frappe.throw(_("Only HO Petty Cash Manager can verify."))

        if self.approval_status != "Approved":
             frappe.throw(_("Document must be Approved (Limits Cleared) before Verification."))

        # 1. Update Status
        self.approval_status = "Verified"
        self.db_set('approval_status', 'Verified')
        self.approved_by = frappe.session.user
        self.db_set('approved_by', frappe.session.user)

        # 2. TRIGGER FINACLE (Placeholder)
        # self.trigger_finacle_api()
        
        frappe.msgprint(_("Bills Verified. Ready for Finacle Integration."))




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
