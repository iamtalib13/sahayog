import frappe

def update_employee_sol_id(doc, method):
    try:
        frappe.log_error("Branch Doc Event Triggered", "Debug: update_employee_sol_id")
        
        old_doc = doc.get_doc_before_save()
        if not old_doc:
            return

        if old_doc.sol_id == doc.sol_id:
            return

        if not doc.sol_id:
            return

        employees = frappe.get_all(
            "Employee",
            filters={"branch": doc.name},
            fields=["name", "sol_id"]
        )

        update_count = 0
        for emp in employees:
            if emp.get("sol_id") != doc.sol_id:
                frappe.db.set_value("Employee", emp["name"], "sol_id", doc.sol_id)
                update_count += 1

        if update_count > 0:
            frappe.msgprint(
                msg=f"{update_count} Employee record(s) updated with new SOL ID: {doc.sol_id} for Branch {doc.name}",
                title="Employees Updated",
                indicator="green"
            )
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "update_employee_sol_id Failed")
