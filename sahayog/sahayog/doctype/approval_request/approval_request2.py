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
        if self.workflow_state in ["Approved", "Rejected"]:
            if not any(a.user == frappe.session.user for a in self.approvers):
                frappe.throw("You are not an approver for this request.")

    # def before_submit(self):
    #     """Only allow valid approvers to take action."""
    #     current_user = frappe.session.user

    #     # If state is Approved/Rejected, ensure user is approver
    #     if self.workflow_state in ["Approved", "Rejected"]:
    #         approver_users = [a.user for a in self.approvers]
    #         if current_user not in approver_users:
    #             frappe.throw("You are not an approver for this request.")

    #     # Optional: auto-set main status same as workflow_state
    #     if self.workflow_state in ["Approved", "Rejected", "Pending"]:
    #         self.status = self.workflow_state

    def before_submit(self):
        if self.workflow_state in ["Approved", "Rejected"]:
            approver_users = [a.user for a in self.approvers]
            if frappe.session.user not in approver_users:
                frappe.throw("You are not an approver for this request.")

    def on_submit(self):
        # On submit → notify approvers
        for approver in self.approvers:
            frappe.msgprint(f"Approval request sent to {approver.user}")

    def on_update(self):
        current_user = frappe.session.user
        for approver in self.approvers:
            if approver.user == current_user and self.workflow_state in ["Approved", "Rejected"]:
                approver.status = self.workflow_state
                approver.remark = approver.remark or f"{self.workflow_state} by {current_user}"
                approver.decision_time = frappe.utils.now()

    def on_update(self):
        if self.workflow_state:
            self.status = self.workflow_state

    def update_status(self):
        """Check child table and update main status"""
        statuses = [a.status for a in self.approvers]
        if all(s == "Approved" for s in statuses):
            self.status = "Approved"
        elif any(s == "Rejected" for s in statuses):
            self.status = "Rejected"
        else:
            self.status = "Pending"
        self.save(ignore_permissions=True)

    def before_cancel(self):
        if not frappe.user.has_role("System Manager"):
            frappe.throw("Only System Manager can cancel this request.")

# def get_permission_query_conditions(user):
#     if not user:
#         user = frappe.session.user

#     # System Manager can see all
#     if "System Manager" in frappe.get_roles(user):
#         return None

#     # Normal users → see requests they created OR where they are approver
#     return f"""
#         (`tabApproval Request`.owner = '{user}'
#          OR `tabApproval Request`.name in (
#              SELECT parent FROM `tabApproval Request Approver`
#              WHERE user = '{user}'
#          )
#         )
#     """


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


# def has_permission(doc, user=None):
#     if not user:
#         user = frappe.session.user

#     # System Manager can access everything
#     if "System Manager" in frappe.get_roles(user):
#         return True

#     # Creator or approver → has permission
#     if doc.owner == user:
#         return True
#     if any(a.user == user for a in doc.approvers):
#         return True

#     return False
