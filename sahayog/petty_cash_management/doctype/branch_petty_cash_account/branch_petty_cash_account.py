import frappe
from frappe import _
from frappe.model.document import Document
from sahayog.petty_cash_management.permissions import get_user_allowed_branches
from frappe.utils import flt
from frappe.utils import cint

import csv
import io
import frappe
from frappe import _


class BranchPettyCashAccount(Document):

    def validate(self):

        # [NEW] SECURITY CHECK
        if not self.name:
            return

        old = frappe.db.get_value(self.doctype, self.name, "is_fund_source")
        if cint(old) != cint(self.is_fund_source):
            if not frappe.utils.has_common(["HO Petty Cash Manager"], frappe.get_roles()):
                frappe.throw(_("You are not allowed to change Fund Source."))

        # [NEW] Validation
        actual_branch_type = frappe.db.get_value(
            "Sahayog Branch", self.branch, "branch_type")

        if not self.monthly_limit:
            if actual_branch_type == "Metro":
                self.monthly_limit = 30000
            else:
                self.monthly_limit = 25000

        # 1. Auto-generate GL Sub Code
        # if self.branch:
        #     account_suffix = "01390200001"
        #     self.gl_sub_code = f"{self.branch}{account_suffix}"

        # 1. Auto-generate GL Sub Code only for non-Zonal branches
        if self.branch:
            actual_branch_type = frappe.db.get_value(
                "Sahayog Branch", self.branch, "branch_type"
            )

            if actual_branch_type == "Zonal":
                if frappe.session.user == "Administrator":
                    self.gl_sub_code = self.gl_sub_code or ""
                else:
                    self.gl_sub_code = ""
            else:
                account_suffix = "01390200001"
                self.gl_sub_code = f"{self.branch}{account_suffix}"

        # 2. [IMPORTANT] Create the Account in Chart of Accounts
        self.create_ledger_account()
        self.validate_current_balance_edit()

    def validate_current_balance_edit(self):
        if self.is_new():
            return

        if frappe.session.user == "Administrator":
            return

        old_balance = flt(frappe.db.get_value(
            self.doctype, self.name, "current_balance") or 0)
        new_balance = flt(self.current_balance or 0)

        if old_balance != new_balance:
            frappe.throw(_("Only Administrator can edit Current Balance."))

    def create_ledger_account(self):
        """
        Creates a Ledger Account for this branch (HO or Regular) if it doesn't exist.
        """
        if not self.gl_sub_code:
            return

        # Check if account exists by Account Number
        if frappe.db.exists("Account", {"account_number": self.gl_sub_code}):
            return  # Already exists, safe to skip

        # A. Find the Parent Group "Branch Petty Cash Group"
        company = frappe.defaults.get_user_default("Company")
        parent_group_name = "Branch Petty Cash Group"

        # Ensure Parent Group exists
        parent_account = frappe.db.get_value("Account",
                                             {"account_name": parent_group_name,
                                                 "is_group": 1, "company": company},
                                             "name"
                                             )

        if not parent_account:
            # Create the Group if missing (One-time setup)
            parent_doc = frappe.new_doc("Account")
            parent_doc.account_name = parent_group_name
            # Adjust "Cash - [Abbr]" if your root is named differently
            root_cash = frappe.db.get_value("Account", {
                                            "account_type": "Cash", "is_group": 1, "root_type": "Asset", "company": company}, "name")
            if not root_cash:
                frappe.throw(
                    _("Could not find a Root Cash account to place the Group under."))

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

    def has_permission(self, ptype="read", user=None):
        if not user:
            user = frappe.session.user

        user_roles = frappe.get_roles(user)

        # [UPDATED] Allow Administrator and all HO roles to open the account document
        if user == 'Administrator' or any(r in user_roles for r in ["HO Petty Cash Manager", "HO Petty Cash Approver", "HO Petty Cash Verifier", "System Manager", "HO Petty Cash Auditor",]):
            return True

        from sahayog.petty_cash_management.permissions import get_user_allowed_branches
        allowed_branches = get_user_allowed_branches(user)

        if allowed_branches is None:
            return True

        if self.branch in (allowed_branches or []):
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
            frappe.msgprint(
                f"Note: Unsettled Cash is negative ({self.unsettled_cash}). This implies a reimbursement claim is pending.")

        self.save(ignore_permissions=True)
        self.check_cash_hoarding()

    def check_cash_hoarding(self):
        THRESHOLD = 2000
        if self.unsettled_cash > THRESHOLD:
            print(
                f"⚠️ ALERT: Branch {self.branch} is holding ₹{self.unsettled_cash}")

    def on_update(self):
        """
        Triggered every time the document is saved.
        If the go_live_date was changed, recalculate the unsettled cash immediately.
        """
        # We check if this is not a new document and if the date actually changed
        if not self.is_new() and self.has_value_changed('go_live_date'):
            # Only import when needed to avoid circular imports
            from sahayog.petty_cash_management.api.auto_cash_withdrawal_sync import sync_single_branch_withdrawal

            # Enqueue it to run immediately in the background so it doesn't freeze the save button
            frappe.enqueue(
                sync_single_branch_withdrawal,
                branch_account_name=self.name,
                now=frappe.flags.in_test or frappe.flags.in_migrate
            )

            # Show a friendly message to the user
            # frappe.msgprint(
            #     msg=f"Go-Live Date changed. Recalculating unsettled cash for {self.branch} in the background...",
            #     title="Sync Triggered",
            #     indicator="blue",
            #     alert=True
            # )
            frappe.msgprint(
                msg=f"""
                Go-Live Date changed. Recalculating unsettled cash for {self.branch} in the background...
                <script>
                    setTimeout(function() {{
                        window.location.reload();
                    }}, 2500);
                </script>
                """,
                title="Sync Triggered",
                indicator="blue",
                alert=True
            )

    def adjust_current_balance(self, amount, operation, reference_doctype=None, reference_name=None):
        amount = flt(amount)

        if amount <= 0:
            frappe.throw(_("Amount must be greater than zero."))

        current_balance = flt(frappe.db.get_value(
            self.doctype, self.name, "current_balance"))

        if operation == "deduct":
            if current_balance < amount:
                frappe.throw(
                    _("Insufficient Current Balance for branch {0}. Available: {1}, Required: {2}").format(
                        self.branch, current_balance, amount
                    )
                )

            new_balance = current_balance - amount

            if new_balance < 0:
                frappe.throw(
                    _("Current Balance cannot go negative for branch {0}. Available: {1}, Required: {2}").format(
                        self.branch, current_balance, amount
                    )
                )

        elif operation == "credit":
            new_balance = current_balance + amount

        else:
            frappe.throw(_("Invalid balance operation: {0}").format(operation))

        frappe.db.set_value(
            self.doctype,
            self.name,
            "current_balance",
            new_balance,
            update_modified=False
        )

        return new_balance

    def deduct_current_balance(self, amount, reference_doctype=None, reference_name=None):
        return self.adjust_current_balance(
            amount=amount,
            operation="deduct",
            reference_doctype=reference_doctype,
            reference_name=reference_name
        )

    def credit_current_balance(self, amount, reference_doctype=None, reference_name=None):
        return self.adjust_current_balance(
            amount=amount,
            operation="credit",
            reference_doctype=reference_doctype,
            reference_name=reference_name
        )


@frappe.whitelist()
def fix_missing_accounts():
    """
    One-time utility to create Chart of Accounts records for all existing Branch Wallets.
    """
    wallets = frappe.get_all("Branch Petty Cash Account", fields=[
                             "name", "branch", "gl_sub_code"])

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
            doc.create_ledger_account()  # This calls the method we added earlier
            created_count += 1
            print(f"Created Account for {w.branch}")

    return f"Process Complete. Created {created_count} missing accounts."


# Add this at the very bottom of branch_petty_cash_account.py

def get_permission_query_conditions(user):
    """
    Filters frappe.db.get_list queries so the JS fallback only returns allowed branches.
    """
    if not user:
        user = frappe.session.user

    # Allow full list access for Admin and Managers
    if user == "Administrator" or "HO Petty Cash Manager" or "HO Petty Cash Auditor" in frappe.get_roles(user):
        return None

    # Import your existing custom permission logic
    from sahayog.petty_cash_management.permissions import get_user_allowed_branches
    allowed_branches = get_user_allowed_branches()

    # If the function returns None, it implies full access
    if allowed_branches is None:
        return None

    # If the user has assigned branches, only return those branches
    if allowed_branches:
        # Securely format the branches for the SQL query
        branches_str = ", ".join([frappe.db.escape(b)
                                 for b in allowed_branches])
        return f"`tabBranch Petty Cash Account`.branch IN ({branches_str})"

    # If the user has no allowed branches, return nothing
    return "1=0"


@frappe.whitelist()
def get_current_user_branch():
    """
    Securely fetches the logged-in user's assigned branch from the Employee profile.
    Because this runs on the backend, it bypasses the frontend read restrictions.
    """
    branch = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user, "status": "Active"},
        "sahayog_branch"
    )
    return branch


@frappe.whitelist()
def download_branch_petty_cash_account_report():
    user_roles = frappe.get_roles()

    if (
        frappe.session.user != "Administrator"
        and "HO Petty Cash Manager" not in user_roles
    ):
        frappe.throw(
            _("Only Administrator or HO Petty Cash Manager can download this report."))

    records = frappe.get_all(
        "Branch Petty Cash Account",
        fields=[
            "branch",
            "branch_name",
            "branch_type",
            "monthly_limit",
            "current_balance",
            "last_synced_fund_date",
            "gl_sub_code",
            "go_live_date",
            "status"
        ],
        order_by="branch asc"
    )

    output = io.StringIO()
    output.write('\ufeff')
    writer = csv.writer(output)

    writer.writerow([
        "Branch",
        "Branch Name",
        "Branch Type",
        "Monthly Limit",
        "Current Balance",
        "Last Synced Fund Date",
        "GL Sub Code",
        "Go Live Date",
        "Status"
    ])

    for row in records:
        writer.writerow([
            row.get("branch") or "",
            row.get("branch_name") or "",
            row.get("branch_type") or "",
            row.get("monthly_limit") or 0,
            row.get("current_balance") or 0,
            row.get("last_synced_fund_date") or "",
            row.get("gl_sub_code") or "",
            row.get("go_live_date") or "",
            row.get("status") or ""
        ])

    csv_content = output.getvalue()
    output.close()

    frappe.response["type"] = "download"
    frappe.response["filename"] = "Branch_Petty_Cash_Account_Report.csv"
    frappe.response["filecontent"] = csv_content
