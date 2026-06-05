import frappe
import re

def execute():
    # List of employees provided by the user (mixed formats)
    employee_input = [
        "936-DIPTI KIRAN MATE", 
        "746-CHITRANJAN SINGH RAJPUT",
        "11687-Nakul Dattuji Satai", 
        "11370-NITIN ANANDRAO SHENDE", 
        "10976-DASHRATH HARISHCHANDRA GHODKE"
    ]
    
    print(f"\n🚀 Starting patch to update Lead details for {len(employee_input)} employees...")

    for item in employee_input:
        # Extract the employee number from the string (e.g., "936" from "936-DIPTI...")
        match = re.match(r"^(\d+)", item.strip())
        if not match:
            print(f"⚠️ Could not parse employee number from: {item}")
            continue
            
        emp_num = match.group(1)

        # Fetch correct details from Employee record using employee_number as name
        emp = frappe.get_all("Employee", filters={"name": emp_num}, 
                             fields=["name", "user_id", "employee_number", "branch", "custom_region", "custom_zone", "sol_id"])
        
        # Fallback search if name is not the number (just in case)
        if not emp:
            emp = frappe.get_all("Employee", filters={"employee_number": emp_num}, 
                                 fields=["name", "user_id", "employee_number", "branch", "custom_region", "custom_zone", "sol_id"])

        if not emp:
            print(f"⚠️ Employee not found for number: {emp_num} (from '{item}')")
            continue
            
        emp_data = emp[0]
        emp_name = emp_data.name # This is the actual record name (e.g., "936")
        user_id = emp_data.user_id
        actual_emp_num = emp_data.employee_number

        print(f"\n👤 Processing Employee: {emp_name} (User: {user_id}, ID: {actual_emp_num})")
        
        # 1. Update Lead records (Standard DocType)
        # We update fields in the 'Employee Details' section and the 'Sol ID' field
        leads_updated = frappe.db.sql("""
            UPDATE `tabLead`
            SET 
                custom_employee_id = %s,
                custom_branch = %s,
                custom_region = %s,
                custom_zone = %s,
                sol_id = %s
            WHERE 
                owner = %s OR custom_employee_id = %s OR custom_employee_id = %s
        """, (actual_emp_num, emp_data.branch, emp_data.custom_region, emp_data.custom_zone, emp_data.sol_id, user_id, actual_emp_num, emp_name))
        
        print(f"✅ Updated {leads_updated} records in Lead.")

        # 2. Update CRM Lead records
        if frappe.db.exists("DocType", "CRM Lead"):
             crm_leads_updated = frappe.db.sql("""
                UPDATE `tabCRM Lead`
                SET 
                    custom_lead_owner_branch = %s,
                    custom_region = %s,
                    custom_zone = %s
                WHERE 
                    owner = %s
            """, (emp_data.branch, emp_data.custom_region, emp_data.custom_zone, user_id))
             print(f"✅ Updated {crm_leads_updated} records in CRM Lead.")

    frappe.db.commit()
    print("\n✨ Patch execution completed successfully.\n")
