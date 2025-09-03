import frappe
from frappe.model.document import Document
from frappe.utils import now


class ApprovalRequest(Document):
    def before_insert(self):
        # Set requester automatically
        if not self.requester:
            self.requester = frappe.session.user
            self.email = frappe.db.get_value("User", self.requester, "email")

    def validate(self):
        # Always keep status Pending on new creation
        if self.is_new():
            self.status = "Pending"

    def before_submit(self):
        """Only allow approvers to submit with Approved/Rejected state"""
        if self.workflow_state in ["Approved", "Rejected"]:
            approver_users = [a.user for a in self.approvers]
            if frappe.session.user not in approver_users:
                frappe.throw("You are not an approver for this request.")

    def on_submit(self):
        # On submit → notify approvers
        for approver in self.approvers:
            frappe.msgprint(f"Approval request sent to {approver.user}")

    def on_update(self):
        """Keep approvers + status field in sync with workflow"""
        current_user = frappe.session.user

        # Update approver row when this user takes action
        for approver in self.approvers:
            if approver.user == current_user and self.workflow_state in ["Approved", "Rejected"]:
                approver.status = self.workflow_state
                approver.remark = approver.remark or f"{self.workflow_state} by {current_user}"
                approver.decision_time = now()

        # Mirror workflow_state into custom status field
        if self.workflow_state:
            self.status = self.workflow_state

    def update_status(self):
        """Check child table and update main status"""
        statuses = [a.status for a in self.approvers]
        if statuses and all(s == "Approved" for s in statuses):
            self.status = "Approved"
        elif "Rejected" in statuses:
            self.status = "Rejected"
        else:
            self.status = "Pending"
        self.save(ignore_permissions=True)

    def before_cancel(self):
        if not frappe.user.has_role("System Manager"):
            frappe.throw("Only System Manager can cancel this request.")


def get_permission_query_conditions(user):
    if not user:
        user = frappe.session.user

    # System Manager can see all
    if "System Manager" in frappe.get_roles(user):
        return None

    # Employees: can see requests they created OR where they are approvers
    return f"""
        (`tabApproval Request`.owner = '{user}'
         OR `tabApproval Request`.name in (
             SELECT parent FROM `tabApproval Request Approver`
             WHERE user = '{user}'
         )
        )
    """


def has_permission(doc, user=None):
    if not user:
        user = frappe.session.user

    # System Manager can access everything
    if "System Manager" in frappe.get_roles(user):
        return True

    # Creator or approver can access
    if doc.owner == user:
        return True
    if any(a.user == user for a in doc.approvers):
        return True

    return False


# working code
