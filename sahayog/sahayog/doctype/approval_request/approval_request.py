import frappe
from frappe.model.document import Document
from frappe.utils import now

class ApprovalRequest(Document):
    def before_submit(self):
        # Change status to Pending Approval when the user clicks Submit
        self.status = "Pending Approval"
        
    def on_submit(self):
        # 1. Share document with all approvers so they have 'Read' access
        for a in self.approvers:
            frappe.share.add(
                doctype=self.doctype,
                name=self.name,
                user=a.approver,
                read=1,
                write=0,
                submit=0,
                share=0,
                flags={"ignore_share_permission": True}
            )
            
            # 2. Send System Notification (Bell Icon) to the Approver
            frappe.new_doc("Notification Log").update({
                "subject": f"Pending Approval: {self.title}",
                "for_user": a.approver,
                "document_type": self.doctype,
                "document_name": self.name
            }).insert(ignore_permissions=True)

    def on_cancel(self):
        # If the document is formally cancelled, ensure status reflects it
        self.status = "Rejected"


@frappe.whitelist()
def process_approval(docname, action, remark):
    # Fetch the document
    doc = frappe.get_doc("Approval Request", docname)
    user = frappe.session.user
    
    if doc.status != "Pending Approval":
        frappe.throw(f"This request has already been {doc.status}.")
        
    valid_approvers = [a.approver for a in doc.approvers]
    if user not in valid_approvers:
        frappe.throw("You do not have permission to approve or reject this request.")
        
    # We must ignore permissions here because the Approver only has 'Read' access, 
    # but we are modifying the document via code.
    frappe.flags.ignore_permissions = True
    
    try:
        # Update custom fields instantly
        doc.db_set("status", action)
        doc.db_set("approver_remark", remark)
        doc.db_set("acted_by", user)
        
        doc.add_comment("Comment", f"Request **{action}** by {user}.<br><b>Remark:</b> {remark}")
        
        # If Rejected, formally cancel the Frappe document (docstatus = 2)
        if action == "Rejected":
            doc.cancel()
            
        # Notify the original creator (Branch User) that action was taken
        frappe.new_doc("Notification Log").update({
            "subject": f"Your request was {action} by {user}",
            "for_user": doc.owner,
            "document_type": doc.doctype,
            "document_name": doc.name
        }).insert(ignore_permissions=True)
        
    finally:
        # Always restore permissions to prevent security leaks
        frappe.flags.ignore_permissions = False
        
    return "Success"