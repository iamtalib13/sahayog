import frappe

def execute():
    workflow_states = [
        {"state": "Correction Required", "style": "Warning"},  # Orange
        {"state": "Submitted", "style": "Primary"},  # Dark Blue
        {"state": "Pending From Purchase Manager", "style": "Warning"},  # Orange
        {"state": "Draft", "style": "Inverse"},  # Black
        {"state": "Received", "style": "Info"},  # Light Blue
        {"state": "Pending", "style": "Warning"},  # Orange
        {"state": "Cancelled", "style": "Danger"},  # Red
        {"state": "Pending From CFO", "style": "Warning"},  # Orange
        {"state": "Rejected", "style": "Danger"},  # Red
        {"state": "Approved", "style": "Success"},  # Green
    ]

    
    for state in workflow_states:
        existing_state = frappe.db.exists("Workflow State", state["state"])
        
        if existing_state:
            # ✅ Existing state ko update karega
            doc = frappe.get_doc("Workflow State", state["state"])
            doc.reload()  # Ensure latest data is loaded
            doc.style = state["style"]  # Frappe standard style assign kar raha hai
            doc.save(ignore_permissions=True)
            frappe.db.commit()
            print(f"✅ Workflow State '{state['state']}' updated successfully!")
        else:
            # ✅ Agar record exist nahi karta, to naya create karega
            doc = frappe.get_doc({
                "doctype": "Workflow State",
                "workflow_state_name": state["state"],
                "style": state["style"],  
            })
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"✅ Workflow State '{state['state']}' created successfully!")

    print("🎯 Custom workflow states created/updated successfully!")
