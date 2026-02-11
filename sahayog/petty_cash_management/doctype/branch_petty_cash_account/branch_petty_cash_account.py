# import frappe
# from frappe.model.document import Document
# from sahayog.petty_cash_management.permissions import get_user_allowed_branches # [NEW IMPORT]
# from frappe.utils import flt

# class BranchPettyCashAccount(Document):
    
#     def validate(self):
#         actual_branch_type = frappe.db.get_value("Sahayog Branch", self.branch, "branch_type")
        
#         if not self.monthly_limit:
#             if actual_branch_type == "Metro":
#                 self.monthly_limit = 25000
#             else:
#                 self.monthly_limit = 15000

#          # 2. [NEW] Auto-generate GL Sub Code
#         # Logic: Branch Code (e.g., 1001) + Fixed Suffix (01390200001)
#         if self.branch:
#             account_suffix = "01390200001"
#             self.gl_sub_code = f"{self.branch}{account_suffix}"

#     def get_current_balance(self):
#         # 1. Total Funds Allocated
#         total_funds = frappe.db.sql("""
#             SELECT COALESCE(SUM(amount), 0)
#             FROM `tabPetty Cash Transaction`
#             WHERE branch = %s AND transaction_type = 'Fund Allocation' AND docstatus = 1
#         """, self.branch)[0][0]

#         # 2. Total Expenses (CHANGED: Sum 'amount_deducted' from Parent, not child items)
#         # This allows us to partially deduct funds initially, then deduct the rest later.
#         total_expenses = frappe.db.sql("""
#             SELECT COALESCE(SUM(amount_deducted), 0)
#             FROM `tabPetty Cash Transaction`
#             WHERE branch = %s 
#             AND transaction_type = 'Expense' 
#             AND docstatus = 1
#         """, self.branch)[0][0]
        
#         return (total_funds - total_expenses) or 0
    

#     # [NEW] SECURITY CHECK
#     def has_permission(self, permtype="read"):
#         allowed_branches = get_user_allowed_branches()

#         if allowed_branches is None:
#             return True

#         if self.branch in allowed_branches:
#             return True
            
#         return False
    
#     def update_unsettled_cash(self, amount, transaction_type):
#         """
#         Updates the Unsettled Cash (Cash-In-Hand) tracker.
#         transaction_type: 'Withdrawal' (Finacle Debit) or 'Expense' (Portal Submission)
#         """
#         current_val = flt(self.unsettled_cash)
#         amount = flt(amount)
        
#         if transaction_type == "Withdrawal":
#             # Money left the bank -> User has cash now -> Unsettled Cash INCREASES
#             self.unsettled_cash = current_val + amount
            
#         elif transaction_type == "Expense":
#             # User submitted bills -> Cash is accounted for -> Unsettled Cash DECREASES
#             self.unsettled_cash = current_val - amount
        
#         # Validation: Negative Cash in Hand logic
#         if self.unsettled_cash < 0:
#             frappe.msgprint(f"Note: Unsettled Cash is negative ({self.unsettled_cash}). This implies a reimbursement claim is pending.")

#         # Save ignoring permissions (System update)
#         self.save(ignore_permissions=True)
        
#         # Check for Hoarding
#         self.check_cash_hoarding()

#     def check_cash_hoarding(self):
#         """Alert HO if branch is holding too much cash without bills"""
#         THRESHOLD = 2000 # Configurable limit (e.g., ₹2000)
        
#         if self.unsettled_cash > THRESHOLD:
#             # OPTIONAL: Send a system notification or email
#             # frappe.sendmail(recipients="ho_manager@sahayog.com", subject="Cash Hoarding Alert", ...)
#             print(f"⚠️ ALERT: Branch {self.branch} is holding ₹{self.unsettled_cash} (Limit: ₹{THRESHOLD})")




import frappe
from frappe import _
from frappe.model.document import Document
from sahayog.petty_cash_management.permissions import get_user_allowed_branches 
from frappe.utils import flt
from frappe.utils import cint

class BranchPettyCashAccount(Document):
    
    def validate(self):

        # [NEW] SECURITY CHECK
        # if not self.name:
        #     return

        # old = frappe.db.get_value(self.doctype, self.name, "is_fund_source")
        # if cint(old) != cint(self.is_fund_source) and not frappe.has_role("HO Petty Cash Manager"):
        #     frappe.throw(_("You are not allowed to change Fund Source."))


        if not self.name:
            return

        old = frappe.db.get_value(self.doctype, self.name, "is_fund_source")
        if cint(old) != cint(self.is_fund_source):
            if not frappe.utils.has_common(["HO Petty Cash Manager"], frappe.get_roles()):
                frappe.throw(_("You are not allowed to change Fund Source."))

        # [NEW] Validation
        actual_branch_type = frappe.db.get_value("Sahayog Branch", self.branch, "branch_type")
        
        if not self.monthly_limit:
            if actual_branch_type == "Metro":
                self.monthly_limit = 25000
            else:
                self.monthly_limit = 15000

        # 1. Auto-generate GL Sub Code
        if self.branch:
            account_suffix = "01390200001"
            self.gl_sub_code = f"{self.branch}{account_suffix}"
            
        # 2. [IMPORTANT] Create the Account in Chart of Accounts
        self.create_ledger_account()

    def create_ledger_account(self):
        """
        Creates a Ledger Account for this branch (HO or Regular) if it doesn't exist.
        """
        if not self.gl_sub_code:
            return

        # Check if account exists by Account Number
        if frappe.db.exists("Account", {"account_number": self.gl_sub_code}):
            return # Already exists, safe to skip

        # A. Find the Parent Group "Branch Petty Cash Group"
        company = frappe.defaults.get_user_default("Company")
        parent_group_name = "Branch Petty Cash Group" 
        
        # Ensure Parent Group exists
        parent_account = frappe.db.get_value("Account", 
            {"account_name": parent_group_name, "is_group": 1, "company": company}, 
            "name"
        )

        if not parent_account:
            # Create the Group if missing (One-time setup)
            parent_doc = frappe.new_doc("Account")
            parent_doc.account_name = parent_group_name
            # Adjust "Cash - [Abbr]" if your root is named differently
            root_cash = frappe.db.get_value("Account", {"account_type": "Cash", "is_group": 1, "root_type": "Asset", "company": company}, "name")
            if not root_cash:
                 frappe.throw(_("Could not find a Root Cash account to place the Group under."))
            
            parent_doc.parent_account = root_cash
            parent_doc.is_group = 1
            parent_doc.account_type = "Cash"
            parent_doc.company = company
            parent_doc.insert(ignore_permissions=True)
            parent_account = parent_doc.name

        # B. Create the Child Account
        account_name = f"{self.branch} - Petty Cash"
        
        account = frappe.new_doc("Account")
        account.account_name = account_name
        account.parent_account = parent_account
        account.account_number = self.gl_sub_code
        account.company = company
        account.account_type = "Cash"
        account.currency = "INR"
        
        account.insert(ignore_permissions=True)
        # Note: No msgprint here to avoid spamming during bulk imports

    def get_current_balance(self):
        # 1. Total Funds Allocated
        total_funds = frappe.db.sql("""
            SELECT COALESCE(SUM(amount), 0)
            FROM `tabPetty Cash Transaction`
            WHERE branch = %s AND transaction_type = 'Fund Allocation' AND docstatus = 1
        """, self.branch)[0][0]

        # 2. Total Expenses
        total_expenses = frappe.db.sql("""
            SELECT COALESCE(SUM(amount_deducted), 0)
            FROM `tabPetty Cash Transaction`
            WHERE branch = %s 
            AND transaction_type = 'Expense' 
            AND docstatus = 1
        """, self.branch)[0][0]
        
        return (total_funds - total_expenses) or 0
    
    def has_permission(self, permtype="read"):
        allowed_branches = get_user_allowed_branches()

        if allowed_branches is None:
            return True

        if self.branch in allowed_branches:
            return True
            
        return False
    
    def update_unsettled_cash(self, amount, transaction_type):
        current_val = flt(self.unsettled_cash)
        amount = flt(amount)
        
        if transaction_type == "Withdrawal":
            self.unsettled_cash = current_val + amount
        elif transaction_type == "Expense":
            self.unsettled_cash = current_val - amount
        
        if self.unsettled_cash < 0:
            frappe.msgprint(f"Note: Unsettled Cash is negative ({self.unsettled_cash}). This implies a reimbursement claim is pending.")

        self.save(ignore_permissions=True)
        self.check_cash_hoarding()

    def check_cash_hoarding(self):
        THRESHOLD = 2000 
        if self.unsettled_cash > THRESHOLD:
            print(f"⚠️ ALERT: Branch {self.branch} is holding ₹{self.unsettled_cash}")



@frappe.whitelist()
def fix_missing_accounts():
    """
    One-time utility to create Chart of Accounts records for all existing Branch Wallets.
    """
    wallets = frappe.get_all("Branch Petty Cash Account", fields=["name", "branch", "gl_sub_code"])
    
    print(f"Checking {len(wallets)} wallets for missing accounts...")
    
    created_count = 0
    
    for w in wallets:
        if not w.gl_sub_code:
            continue
            
        # Check if Account exists
        exists = frappe.db.exists("Account", {"account_number": w.gl_sub_code})
        if not exists:
            # Load the doc to use its create_ledger_account method
            doc = frappe.get_doc("Branch Petty Cash Account", w.name)
            doc.create_ledger_account() # This calls the method we added earlier
            created_count += 1
            print(f"Created Account for {w.branch}")
            
    return f"Process Complete. Created {created_count} missing accounts."
