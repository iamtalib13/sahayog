import frappe
from frappe import _

@frappe.whitelist()
def bulk_submit_requests(docnames):
    if isinstance(docnames, str):
        docnames = frappe.parse_json(docnames)
    
    completed = 0
    errors = []
    
    for name in docnames:
        try:
            doc = frappe.get_doc("Employee Material Request", name)
            
            if doc.status == "Draft":
                doc.status = "Pending Reporting Person"
                doc.save()
                frappe.db.commit()
                completed += 1
            else:
                errors.append(_("{0} is not in Draft status").format(name))
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), _("Bulk Submit Error for {0}").format(name))
            errors.append(_("Error submitting {0}: {1}").format(name, str(e)))
            
    return {
        "completed": completed,
        "errors": errors
    }
