import frappe

def execute():
    # Fetch all leads where custom_is_operation_lead = 1
    leads = frappe.get_all("Lead", filters={"custom_is_operation_lead": 1}, fields=["name", "custom_employee_id"])
    
    for lead in leads:
        employee_id = lead.get("custom_employee_id")
        
        if not employee_id:
            frappe.logger().warning(f"Lead {lead.name} skipped - no custom_employee_id found")
            continue

        # Fetch the user_id from Employee doctype
        user_id = frappe.db.get_value("Employee", employee_id, "user_id")

        if not user_id:
            frappe.logger().warning(f"Lead {lead.name} skipped - Employee {employee_id} has no user_id")
            continue

        # Update lead_owner field
        frappe.db.set_value("Lead", lead.name, "lead_owner", user_id)
        frappe.logger().info(f"Updated Lead {lead.name} → lead_owner = {user_id}")

    frappe.db.commit()
    frappe.logger().info("Operation lead owner patch executed successfully.")
