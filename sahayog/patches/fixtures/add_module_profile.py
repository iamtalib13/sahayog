import frappe

def execute():
    try:
        module_profile_name = 'Employee'  # Role name for Role Profile
        modules = ['Sahayog', 'Sahayog Ticket']  # List of modules to be added in the child table

        # Check if the Role Profile already exists with the role name 'Employee'
        if frappe.db.exists('Module Profile', module_profile_name):
            print(f"Role Profile '{module_profile_name}' already exists.")
        else:
            # Create a new Role Profile document
            doc = frappe.new_doc('Module Profile')
            doc.module_profile_name = module_profile_name  # Set 'Employee' as the role name
            
            for module in modules:
                # Check if the module exists in the 'Module Def' doctype
                if frappe.db.exists('Module Def', module):
                    # Append the module to the 'block_modules' child table if it exists
                    child_row = doc.append('block_modules', {})
                    child_row.module = module
                else:
                    print(f"Module '{module}' does not exist in 'Module Def' and will not be added.")

            # Insert the Role Profile document into the database
            doc.insert()
            frappe.db.commit()  # Commit the transaction
            
            print(f"Role Profile '{module_profile_name}' with child roles {modules} created successfully.")
    
    except Exception as e:
        # Catch any errors and log them
        frappe.log_error(message=str(e), title="Error creating Role Profile with child roles")
        print(f"Error creating Role Profile: {str(e)}")
