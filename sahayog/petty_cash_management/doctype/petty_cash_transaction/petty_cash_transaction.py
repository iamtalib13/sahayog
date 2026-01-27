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


    # [NEW] Create Draft Journal Entry
        if self.transaction_type == "Expense":
            self.create_journal_entry()

        self.update_wallet()

    # def create_journal_entry(self):
    #     """
    #     Creates a Draft Journal Entry with:
    #     - Debits: Individual Expense Categories (GL Code = Branch Code + Suffix)
    #     - Credit: Branch Petty Cash Account (GL Code = From Wallet Master)
    #     """
        
    #     # 1. Get Credit Account (The Branch Wallet)
    #     wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
    #     if not wallet.gl_sub_code:
    #         frappe.throw(_("Branch Wallet has no GL Sub Code defined."))
            
    #     credit_account = self.get_or_create_account(
    #         gl_code=wallet.gl_sub_code,
    #         account_name=f"Petty Cash - {self.branch_name}",
    #         parent_group="Cash In Hand - S" # Adjust based on your Chart of Accounts
    #     )

    #     # 2. Prepare Journal Accounts
    #     accounts = []
    #     total_credit = 0.0

    #     for item in self.items:
    #         amount = flt(item.amount)
    #         if amount <= 0: continue

    #         # Get GL Code for this Item (You already generated this in before_save)
    #         if not item.finacle_gl_code:
    #             frappe.throw(_("Row #{0}: Missing Finacle GL Code. Cannot create Journal Entry.").format(item.idx))

    #         # Find/Create Debit Account
    #         debit_account = self.get_or_create_account(
    #             gl_code=item.finacle_gl_code,
    #             account_name=f"{item.expense_category} - {self.branch_name}",
    #             parent_group="Direct Expenses - S" # Adjust based on your Chart of Accounts
    #         )

    #         # Add Debit Line
    #         accounts.append({
    #             "account": debit_account,
    #             "debit_in_account_currency": amount,
    #             "credit_in_account_currency": 0,
    #             "cost_center": self.branch, # Assuming Branch is Cost Center
    #             "user_remark": f"{item.description} (Bill: {item.bill_number})"
    #         })
    #         total_credit += amount

    #     # Add Credit Line (Total)
    #     accounts.append({
    #         "account": credit_account,
    #         "debit_in_account_currency": 0,
    #         "credit_in_account_currency": total_credit,
    #         "cost_center": self.branch,
    #         "user_remark": f"Total Petty Cash Expense for {self.name}"
    #     })

    #     # 3. Create Journal Entry Doc
    #     je = frappe.get_doc({
    #         "doctype": "Journal Entry",
    #         "voucher_type": "Journal Entry",
    #         "posting_date": self.transaction_date,
    #         "company": frappe.defaults.get_user_default("Company"), # Or hardcode "Sahayog"
    #         "accounts": accounts,
    #         "cheque_no": "", # Empty for now, will be filled by Finacle
    #         "cheque_date": self.transaction_date,
    #         "user_remark": f"Petty Cash Expense: {self.name}",
    #         "reference_type": "Petty Cash Transaction",
    #         "reference_name": self.name
    #     })

    #     # 4. Save (Status: Draft)
    #     je.insert(ignore_permissions=True)
        
    #     # Link JE back to this doc for easy reference
    #     self.db_set("journal_entry_ref", je.name)
        
    #     frappe.msgprint(_("Journal Entry created: {0}").format(je.name))

    

    # def create_journal_entry(self):
    #     """
    #     Creates a Draft Journal Entry. 
    #     [UPDATED] Now auto-generates Cost Centers to prevent errors.
    #     """
    #     # 1. Get Credit Account (The Branch Wallet)
    #     wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
    #     if not wallet.gl_sub_code:
    #         frappe.throw(_("Branch Wallet has no GL Sub Code defined."))
            
    #     credit_account = self.get_or_create_account(
    #         gl_code=wallet.gl_sub_code,
    #         account_name=f"Petty Cash - {self.branch_name}",
    #         parent_group="Sahayog Petty Cash Wallets"
    #     )

    #     # [NEW] Get or Create the Cost Center automatically
    #     valid_cost_center = self.get_or_create_cost_center()

    #     # 2. Prepare Journal Accounts
    #     accounts = []
    #     total_credit = 0.0

    #     for item in self.items:
    #         amount = flt(item.amount)
    #         if amount <= 0: continue

    #         if not item.finacle_gl_code:
    #             frappe.throw(_("Row #{0}: Missing Finacle GL Code.").format(item.idx))

    #         # Find/Create Debit Account
    #         debit_account = self.get_or_create_account(
    #             gl_code=item.finacle_gl_code,
    #             account_name=f"{item.expense_category} - {self.branch_name}",
    #             parent_group="Sahayog Branch Expenses"
    #         )

    #         # Add Debit Line
    #         accounts.append({
    #             "account": debit_account,
    #             "debit_in_account_currency": amount,
    #             "credit_in_account_currency": 0,
    #             "cost_center": valid_cost_center, # <--- Uses the auto-created CC
    #             "user_remark": f"{item.description} (Bill: {item.bill_number})"
    #         })
    #         total_credit += amount

    #     # 3. Add Credit Line (Total)
    #     accounts.append({
    #         "account": credit_account,
    #         "debit_in_account_currency": 0,
    #         "credit_in_account_currency": total_credit,
    #         "cost_center": valid_cost_center, # <--- Uses the auto-created CC
    #         "user_remark": f"Total Petty Cash Expense for {self.name}"
    #     })

    #     # 4. Create Journal Entry Doc
    #     je = frappe.get_doc({
    #         "doctype": "Journal Entry",
    #         "voucher_type": "Journal Entry",
    #         "posting_date": self.transaction_date,
    #         "company": frappe.defaults.get_user_default("Company"), 
    #         "accounts": accounts,
    #         "cheque_no": "", 
    #         "cheque_date": self.transaction_date,
    #         "user_remark": f"Petty Cash Expense: {self.name}",
    #         "reference_type": "Petty Cash Transaction",
    #         "reference_name": self.name
    #     })

    #     # 5. Save (Status: Draft)
    #     je.insert(ignore_permissions=True)
        
    #     # Link JE back to this doc
    #     self.db_set("journal_entry_ref", je.name)
        
    #     frappe.msgprint(_("Journal Entry created: {0}").format(je.name))
    

    def create_journal_entry(self):
        """
        Creates a Draft Journal Entry. 
        [UPDATED] Uses custom fields for Remarks and Date to avoid conflicts.
        """
        # 1. Get Credit Account
        wallet = frappe.get_doc("Branch Petty Cash Account", {"branch": self.branch})
        if not wallet.gl_sub_code:
            frappe.throw(_("Branch Wallet has no GL Sub Code defined."))
            
        credit_account = self.get_or_create_account(
            gl_code=wallet.gl_sub_code,
            account_name=f"Petty Cash - {self.branch_name}",
            parent_group="Sahayog Petty Cash Wallets"
        )

        # Get or Create Cost Center
        valid_cost_center = self.get_or_create_cost_center()

        # 2. Prepare Journal Accounts
        accounts = []
        total_credit = 0.0

        for item in self.items:
            amount = flt(item.amount)
            if amount <= 0: continue

            if not item.finacle_gl_code:
                frappe.throw(_("Row #{0}: Missing Finacle GL Code.").format(item.idx))

            # Find/Create Debit Account
            debit_account = self.get_or_create_account(
                gl_code=item.finacle_gl_code,
                account_name=f"{item.expense_category} - {self.branch_name}",
                parent_group="Sahayog Branch Expenses"
            )

            # Add Debit Line
            accounts.append({
                "account": debit_account,
                "debit_in_account_currency": amount,
                "credit_in_account_currency": 0,
                "cost_center": valid_cost_center, 
                "user_remark": f"{item.description} (Bill: {item.bill_number})"
            })
            total_credit += amount

        # 3. Add Credit Line (Total)
        accounts.append({
            "account": credit_account,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": total_credit,
            "cost_center": valid_cost_center, 
            "user_remark": f"Total Petty Cash Expense for {self.name}"
        })

        # 4. Create Journal Entry Doc
        je = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Journal Entry",
            "posting_date": self.transaction_date,
            "company": frappe.defaults.get_user_default("Company"), 
            "accounts": accounts,
            
            # --- UPDATED FIELDS ---
            "cheque_no": "",
            # "cheque_date": self.transaction_date,  <-- REMOVED (Conflicted)
            
            # Map to NEW Custom Fields
            "custom_petty_cash_date": self.transaction_date,
            "custom_petty_cash_remarks": f"Petty Cash Expense: {self.name}",
            
            # Keep standard remark generic or empty to avoid conflict
            # "user_remark": "Auto-generated from Petty Cash", 
            
            "reference_type": "Petty Cash Transaction",
            "reference_name": self.name
        })

        # 5. Save (Status: Draft)
        je.insert(ignore_permissions=True)
        
        # Link JE back to this doc
        self.db_set("journal_entry_ref", je.name)
        
        frappe.msgprint(_("Journal Entry created: {0}").format(je.name))


   

    def get_or_create_account(self, gl_code, account_name, parent_group):
        """
        Helper: Checks if Account exists by GL Code. If not, creates it.
        """
        # 1. Define Company
        company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
        if not company:
            frappe.throw("Default Company is not set.")

        # 2. Check if Account already exists
        existing = frappe.db.get_value("Account", {"account_number": gl_code, "company": company}, "name")
        if existing:
            return existing

        # 3. Find Parent Account
        parent_acc_name = frappe.db.get_value("Account", {"account_name": parent_group, "company": company}, "name")
        if not parent_acc_name:
             frappe.throw(f"Parent Account Group '{parent_group}' not found for company '{company}'. Please create it in Chart of Accounts.")

        # 4. Verify Parent is a Group
        is_group = frappe.db.get_value("Account", parent_acc_name, "is_group")
        if not is_group:
            frappe.throw(f"Account '{parent_acc_name}' exists but is NOT a Group. Please check 'Is Group' in Chart of Accounts.")

        # 5. Determine Correct Account Type
        # If the group has 'Expenses' in the name, we assume it's a Direct Expense
        if "Expenses" in parent_group:
            acc_type = "Direct Expense" 
        else:
            acc_type = "Cash"

        # 6. Create the New Account
        new_account = frappe.get_doc({
            "doctype": "Account",
            "account_name": account_name, 
            "account_number": gl_code,    
            "company": company,
            "parent_account": parent_acc_name,
            "account_type": acc_type, # <--- FIXED: Now uses "Direct Expense"
            "currency": "INR" 
        })
        new_account.insert(ignore_permissions=True)
        
        return new_account.name


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


    def get_or_create_cost_center(self):
        """ 
        [NEW] Automates Cost Center Creation.
        Checks if a Cost Center exists for this Branch (e.g. '1113').
        If not, creates it automatically under a 'Sahayog Branches' group.
        """
        company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
        
        # 1. Search by Cost Center Number (Branch ID)
        existing_cc = frappe.db.get_value("Cost Center", {"cost_center_number": self.branch, "company": company}, "name")
        if existing_cc:
            return existing_cc

        # 2. If missing, find a Parent Group to attach to
        # Try to find 'Sahayog Branches' or create it
        parent_group_name = "Sahayog Branches"
        parent_cc = frappe.db.get_value("Cost Center", {"cost_center_name": parent_group_name, "company": company}, "name")
        
        if not parent_cc:
                # Create the Group Node if it doesn't exist
                root_cc_name = frappe.db.get_value("Cost Center", {"is_group": 1, "company": company, "parent_cost_center": ["is", "not set"]}, "name") # Main Root
                
                new_group = frappe.get_doc({
                    "doctype": "Cost Center",
                    "cost_center_name": parent_group_name,
                    "is_group": 1,
                    "company": company,
                    "parent_cost_center": root_cc_name or "Main - S" # Fallback
                })
                new_group.insert(ignore_permissions=True)
                parent_cc = new_group.name

        # 3. Create the Branch Cost Center
        new_cc = frappe.get_doc({
            "doctype": "Cost Center",
            "cost_center_name": self.branch_name, # e.g. "CHEMBUR BRANCH"
            "cost_center_number": self.branch,    # e.g. "1113"
            "company": company,
            "parent_cost_center": parent_cc
        })
        new_cc.insert(ignore_permissions=True)
        
        return new_cc.name




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


# @frappe.whitelist()
# def get_branch_balance(branch):
#     """
#     Returns the current wallet balance for the branch using direct SQL.
#     """
#     if not branch:
#         return 0.0
        
#     # [FIX] Use SQL to ensure we find the record even if permissions or caching act up
#     balance = frappe.db.sql("""
#         SELECT current_balance 
#         FROM `tabBranch Petty Cash Account` 
#         WHERE branch = %s 
#         LIMIT 1
#     """, branch)
    
#     # If a record is found, return the balance; otherwise return 0.0
#     return flt(balance[0][0]) if balance else 0.0


@frappe.whitelist()
def get_branch_balance(branch):
    """
    Returns both Bank Balance and Unsettled Cash for the UI.
    """
    if not branch:
        return {}
        
    data = frappe.db.get_value("Branch Petty Cash Account", 
        {"branch": branch}, 
        ["current_balance", "unsettled_cash"], 
        as_dict=True
    )
    
    # Return 0 if None
    return {
        "current_balance": flt(data.current_balance) if data else 0.0,
        "unsettled_cash": flt(data.unsettled_cash) if data else 0.0
    }



