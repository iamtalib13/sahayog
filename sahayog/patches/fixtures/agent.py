import frappe

def execute():
    # Get all Allocated agents and submit them
    allocated_agents = frappe.get_all(
        "Agent",
        filters={"status": "Allocated"},
        fields=["name"]
    )
    
    updated_count = 0
    for agent in allocated_agents:
        try:
            doc = frappe.get_doc("Agent", agent.name)
            if doc.status == "Allocated" and doc.docstatus != 1:
                doc.submit()
                frappe.db.commit()
                updated_count += 1
                print(f"Submitted: {agent.name}")
        except Exception as e:
            print(f"Error submitting {agent.name}: {str(e)}")
            frappe.db.rollback()
    
    frappe.clear_cache()
    print(f"Patch executed: Submitted {updated_count} Allocated Agents")