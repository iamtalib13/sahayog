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

@frappe.whitelist()
def get_available_serial_nos(doctype, txt, searchfield, start, page_len, filters):
    # Get all serial numbers used in any Asset record (including cancelled ones)
    used_serial_nos = frappe.get_all("Asset", 
        fields=["serial_no"],
        pluck="serial_no"
    )
    
    # Clean None/empty values and get unique set
    used_serial_nos = list(set([s for s in used_serial_nos if s]))
    
    # Build query
    if used_serial_nos:
        return frappe.db.sql(f"""
            select name from `tabSerial No`
            where name not in ({', '.join(['%s'] * len(used_serial_nos))})
            and name like %s
            order by name asc
            limit %s, %s
        """, (*used_serial_nos, f"%{txt}%", start, page_len))
    else:
        return frappe.db.sql("""
            select name from `tabSerial No`
            where name like %s
            order by name asc
            limit %s, %s
        """, (f"%{txt}%", start, page_len))
