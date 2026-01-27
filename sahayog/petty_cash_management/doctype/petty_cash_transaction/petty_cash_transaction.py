import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_first_day, get_last_day, nowdate, flt, getdate
from sahayog.petty_cash_management.permissions import get_user_allowed_branches # [NEW IMPORT]

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


        if self.transaction_type == "Expense":
            total_expense = sum(flt(item.amount) for item in self.items)
            self.amount = total_expense
            
            # [NEW] Generate GL Codes dynamically
            self.generate_item_gl_codes()

            self.calculate_limit_breakdown()

    def generate_item_gl_codes(self):
        if not self.branch or not self.items:
            return

        # 1. Collect all Category IDs from the child table rows
        # 'item.expense_category' stores the ID (e.g., '1004'), not the name
        category_ids = [item.expense_category for item in self.items if item.expense_category]
        
        # 2. Fetch Suffixes for these IDs
        # Returns dict: {'1004': '01840390001', '1005': '...'}
        category_map = {}
        if category_ids:
            # We filter by 'name' (the ID) because that's what is stored in the link field
            results = frappe.get_all(
                "Expense Category",
                filters={"name": ["in", category_ids]},
                fields=["name", "finacle_gl_code"],
                as_list=True
            )
            category_map = {row[0]: row[1] for row in results}

        # 3. Apply Logic: Branch Code + Suffix
        for item in self.items:
            # Get suffix using the Link field value (ID)
            suffix = category_map.get(item.expense_category)
            
            if suffix:
                item.finacle_gl_code = f"{self.branch}{suffix}"
            else:
                item.finacle_gl_code = ""

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
    

    # def validate(self):
    #     # 1. Check Account Existence
    #     account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
    #     if not account_exists:
    #         frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found!").format(self.branch))

    #     wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        
    #     if self.transaction_type == "Expense":
    #         if not self.items:
    #             frappe.throw(_("At least one expense item is required."))
            
    #         # [FIX] Calculate breakdown HERE so variables are set before checking
    #         self.amount = sum(flt(item.amount) for item in self.items) # Ensure amount is set
    #         self.calculate_limit_breakdown() 

    #         self.validate_bill_dates()
            
    #         # Now safe to call because variables are set
    #         self.validate_expense_soft(wallet)
        
    #     self.current_branch_balance = wallet.get_current_balance()

    # def validate(self):
    #     # 1. Check Account Existence
    #     account_exists = frappe.db.count("Branch Petty Cash Account", {"branch": self.branch})
    #     if not account_exists:
    #         frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found!").format(self.branch))

    #     wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        
    #     if self.transaction_type == "Expense":
    #         if not self.items:
    #             frappe.throw(_("At least one expense item is required."))
            
    #         # Ensure amount is set
    #         self.amount = sum(flt(item.amount) for item in self.items) 
    #         self.calculate_limit_breakdown() 

    #         self.validate_bill_dates()
            
    #         # Soft Validation
    #         self.validate_expense_soft(wallet)
        
    #     # [FIX] Fetch the REAL balance directly from the database for display
    #     # This ensures it shows 21047 (Finacle Value) instead of 693 (Old Calculation)
    #     real_balance = frappe.db.get_value("Branch Petty Cash Account", {"branch": self.branch}, "current_balance")
    #     self.current_branch_balance = flt(real_balance)


    def validate(self):
        # 1. Check Account Existence
        if not frappe.db.exists("Branch Petty Cash Account", {"branch": self.branch}):
            frappe.throw(_("Branch Petty Cash Account for branch '{0}' not found!").format(self.branch))

        wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        
        if self.transaction_type == "Expense":
            if not self.items:
                frappe.throw(_("At least one expense item is required."))
            
            self.amount = sum(flt(item.amount) for item in self.items) 
            self.calculate_limit_breakdown() 
            self.validate_bill_dates()
            self.validate_expense_soft(wallet)
        
        # [FIX] Fetch BOTH Real Balance and Unsettled Cash for display
        wallet_values = frappe.db.get_value("Branch Petty Cash Account", 
            {"branch": self.branch}, 
            ["current_balance", "unsettled_cash"], 
            as_dict=True
        )
        
        if wallet_values:
            self.current_branch_balance = flt(wallet_values.current_balance)
            self.current_unsettled_cash = flt(wallet_values.unsettled_cash) # <--- New Field



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

    # def validate_expense_soft(self, wallet):
    #     # 1. Wallet Balance Check (Still Strict for TOTAL amount? Or Partial?)
    #     # Requirement: "Submit... not deduct". 
    #     # But if the wallet physically doesn't have money, we probably shouldn't allow even creating the debt.
    #     # However, for now, let's strictly check if wallet has enough for the *Within Limit* portion at least?
    #     # Scenario: Wallet has 5000. Bill is 10000. Limit is 2000.
    #     # We deduct 2000. Wallet has 3000. 
    #     # For now, let's keep Wallet Balance check strictly for the Amount being Deducted NOW.
        
    #     # But wait, if we eventually approve, we need the money. 
    #     # Let's keep Wallet Check strict for the FULL Amount to prevent negative cash later.
    #     current_balance = wallet.get_current_balance()
        
    #     # Note: current_balance check is tricky because we haven't deducted anything yet.
    #     if current_balance < self.amount:
    #          frappe.throw(_("Insufficient Branch Wallet Balance. Available: ₹{0}, Required: ₹{1}").format(current_balance, self.amount))

    #     # 2. Notify user if limits exceeded
    #     if self.amount_exceeding_limit > 0:
    #         frappe.msgprint(_("Warning: Expenses exceed category limits by ₹{0}. This amount will NOT be deducted until approved by HO.").format(self.amount_exceeding_limit), alert=True)

    def validate_expense_soft(self, wallet):
        # 1. Fetch Latest Values Directly from DB (Bypassing any old calculation logic)
        wallet_data = frappe.db.get_value("Branch Petty Cash Account", 
            {"branch": self.branch}, 
            ["current_balance", "unsettled_cash"], 
            as_dict=True
        )
        
        if not wallet_data:
            return

        # 2. Read the Real Synced Balance
        available_balance = flt(wallet_data.current_balance) # Should be 21047
        unsettled_cash = flt(wallet_data.unsettled_cash)     # Should be 12000
        
        # 3. Calculate Total Buying Power (Bank + Cash Hand)
        total_buying_power = available_balance + unsettled_cash

        # 4. Validate
        if total_buying_power < self.amount:
             frappe.throw(_("Insufficient Funds. Bank: ₹{0} + Cash-in-Hand: ₹{1} = Total: ₹{2}. Required: ₹{3}").format(
                 available_balance, unsettled_cash, total_buying_power, self.amount))

        # 5. Check Category Limits
        if self.amount_exceeding_limit > 0:
            frappe.msgprint(_("Warning: Expenses exceed category limits by ₹{0}. This amount will NOT be deducted until approved by HO.").format(self.amount_exceeding_limit), alert=True)


    # def on_submit(self):

    #     # 1. Update Unsettled Cash if this is an Expense
    #     if self.transaction_type == "Expense":
    #         wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
    #         # Deduct the total amount from their "Cash in Hand" bucket
    #         wallet.update_unsettled_cash(self.amount, "Expense")


    #     if self.transaction_type == "Expense":
    #         if self.amount_exceeding_limit > 0:
    #             # Scenario 2: Exceeding Limit
    #             # We deduct only the limit amount
    #             self.db_set('amount_deducted', self.amount_within_limit)
    #             self.db_set('approval_status', 'Pending Approval')
                
    #             frappe.msgprint(_("Transaction Submitted. ₹{0} deducted. ₹{1} pending HO Approval.").format(self.amount_within_limit, self.amount_exceeding_limit))
    #         else:
    #             # Scenario 1: Within Limit
    #             # We deduct full amount
    #             self.db_set('amount_deducted', self.amount)
    #             self.db_set('approval_status', 'Approved') 
        
    #     elif self.transaction_type == "Fund Allocation":
    #         self.db_set('amount_deducted', 0)
    #         self.db_set('approval_status', 'Posted')

    #     self.update_wallet()

    def on_submit(self):
        # 1. Update Unsettled Cash if this is an Expense
        if self.transaction_type == "Expense":
            wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
            
            # Deduct the total amount from their "Cash in Hand" bucket (Liability)
            # This is the ONLY place where money "leaves" the wallet in our portal
            wallet.update_unsettled_cash(self.amount, "Expense")

            # 2. Handle Status & Limits
            if self.amount_exceeding_limit > 0:
                # Scenario 2: Exceeding Limit
                self.db_set('amount_deducted', self.amount_within_limit)
                self.db_set('approval_status', 'Pending Approval')
                frappe.msgprint(_("Transaction Submitted. ₹{0} deducted. ₹{1} pending HO Approval.").format(self.amount_within_limit, self.amount_exceeding_limit))
            else:
                # Scenario 1: Within Limit
                self.db_set('amount_deducted', self.amount)
                self.db_set('approval_status', 'Approved') 
        
        elif self.transaction_type == "Fund Allocation":
            self.db_set('amount_deducted', 0)
            self.db_set('approval_status', 'Posted')

        self.update_wallet()

    def on_cancel(self):

         # If cancelled, the cash is legally "back" with the user (unaccounted for)
        if self.transaction_type == "Expense":
            wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
            # Treat it like a Withdrawal (Add it back to liability)
            wallet.update_unsettled_cash(self.amount, "Withdrawal") 



        # Refund whatever was deducted
        self.amount_deducted = 0
        self.approval_status = "Draft"
        self.update_wallet()

    # def update_wallet(self):
    #     # Trigger wallet update (recalculation based on Sum(amount_deducted))
    #     if frappe.flags.in_test: return
    #     wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
    #     wallet.flags.ignore_permissions = True
    #     wallet.current_balance = wallet.get_current_balance() # This calls the new SQL logic
    #     if self.transaction_type == "Fund Allocation" and self.docstatus == 1:
    #         wallet.last_funded_on = self.transaction_date
    #     wallet.save(ignore_permissions=True)

    def update_wallet(self):
        # Trigger wallet update
        if frappe.flags.in_test: return
        
        # [FIX] We REMOVED the line: wallet.current_balance = wallet.get_current_balance()
        # This prevents the system from overwriting the Finacle Balance with a manual calculation.
        
        # We only update 'last_funded_on' for Fund Allocations
        if self.transaction_type == "Fund Allocation" and self.docstatus == 1:
             frappe.db.set_value("Branch Petty Cash Account", {"branch": self.branch}, "last_funded_on", self.transaction_date)

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

         # [NEW] SECURITY CHECK
    def has_permission(self, permtype="read"):
        """
        This method is called automatically by Frappe when accessing a document via URL/Form.
        """
        # 1. Get allowed branches for current user
        allowed_branches = get_user_allowed_branches()

        # 2. If None, it means they are Admin/Manager -> Allow
        if allowed_branches is None:
            return True

        # 3. Check if the document's branch is in the allowed list
        # If the document is new (no branch yet), allow creation so they can select their branch
        if self.is_new():
            return True

        if self.branch in allowed_branches:
            return True
        
        return False




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
