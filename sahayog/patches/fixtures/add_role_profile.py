import frappe

def execute():
    try:
        role_name = 'Employee'  # Role name for Role Profile
        role_in_child_table = 'Employee'  # The role to be added in the child table
        
        # Check if the Role Profile already exists with the role name 'Employee'
        if frappe.db.exists('Role Profile', role_name):
            # If it already exists, print a message
            print(f"Role Profile '{role_name}' already exists.")
        else:
            # Create a new Role Profile document
            doc = frappe.new_doc('Role Profile')
            doc.role_profile = role_name  # Set 'Employee' as the role name
            
            # Add a row to the 'roles' child table with the field 'role_profile'
            child_row = doc.append('roles', {})  # Append a new row in the 'roles' child table
            child_row.role = role_in_child_table  # Set 'Employee' in the child table's 'role_profile' field
            
            # Insert the Role Profile document into the database
            doc.insert()
            frappe.db.commit()  # Commit the transaction
            
            print(f"Role Profile '{role_name}' with child role '{role_in_child_table}' created successfully.")
    
    except Exception as e:
        # Catch any errors and log them
        frappe.log_error(message=str(e), title="Error creating Role Profile with child")
        print(f"Error creating Role Profile: {str(e)}")
