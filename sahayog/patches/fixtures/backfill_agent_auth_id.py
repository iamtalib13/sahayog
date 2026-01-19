import frappe

def execute():
    """
    Backfill auth_id for Agents where it is empty.
    Logic: SAH + employee_id (padded to 5 digits)
    Example: 1234 -> SAH01234, 10025 -> SAH10025
    """
    
    # Fetch agents where auth_id is not set or empty
    agents = frappe.db.get_all(
        "Agent",
        filters={
            "auth_id": ["in", ["", None]],
            "employee": ["is", "set"]
        },
        fields=["name", "employee"]
    )

    count = 0
    for agent in agents:
        if not agent.employee:
            continue

        # Ensure employee is treated as a string and strip whitespace
        emp_id = str(agent.employee).strip()

        # Logic: Pad with zeros to ensure total length of numeric part is 5
        # 1234 -> 01234
        # 10025 -> 10025
        padded_emp_id = emp_id.zfill(5)
        
        # Construct the new auth_id
        new_auth_id = f"SAH{padded_emp_id}"

        # Update the record directly in DB to avoid triggering validations/overhead
        frappe.db.set_value("Agent", agent.name, "auth_id", new_auth_id)
        count += 1

    print(f"Updated auth_id for {count} Agent records.")

