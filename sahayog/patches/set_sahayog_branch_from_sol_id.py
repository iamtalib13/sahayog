import frappe

def execute():
    # Fetch all employees jinke sol_id blank nahi hai
    employees = frappe.get_all("Employee", filters={"sol_id": ["!=", ""]}, fields=["name", "sol_id", "sahayog_branch"])

    for emp in employees:
        # Only update if sahayog_branch is empty
        if not emp.sahayog_branch:
            frappe.db.set_value("Employee", emp.name, "sahayog_branch", emp.sol_id)
    
    frappe.db.commit()  # Ensure changes are saved
