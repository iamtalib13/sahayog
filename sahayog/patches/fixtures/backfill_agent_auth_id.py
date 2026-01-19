import frappe

# This script fills in missing auth_id values for Agent records
# where the status is 'Allocated'. The auth_id is generated based
# on the employee ID, padded to ensure a consistent format.
def execute():
    """
    Backfill auth_id for Agents where it is empty AND status is 'Allocated'.
    Logic: SAH + employee_id (padded to 5 digits)
    Example: 1234 -> SAH01234, 10025 -> SAH10025
    """
    
    # Fetch agents matching the criteria
    agents = frappe.db.get_all(
        "Agent",
        filters={
            "auth_id": ["in", ["", None]], # Handle both empty string and NULL
            "status": "Allocated",
            "employee": ["is", "set"]
        },
        fields=["name", "employee"]
    )

    count = 0
    # Use a loop to process and update one by one
    for agent in agents:
        if not agent.employee:
            continue

        # Convert employee to string and remove any accidental whitespace
        emp_id = str(agent.employee).strip()

        # Logic: Pad with zeros to ensure the numeric part is at least 5 digits long
        # 1234  -> 01234  (SAH01234)
        # 10025 -> 10025  (SAH10025)
        padded_emp_id = emp_id.zfill(5)
        
        new_auth_id = f"SAH{padded_emp_id}"

        # Update the auth_id column directly
        frappe.db.set_value("Agent", agent.name, "auth_id", new_auth_id)
        count += 1

    print(f"Updated auth_id for {count} Allocated Agent records.")
