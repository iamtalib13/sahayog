import frappe

def execute():
    # List of divisions to create
    divisions_to_create = ['School', 'Two Wheeler', 'Microfinance', 'Multistate']

    for division_name in divisions_to_create:
        try:
            # Check if the division already exists
            if frappe.db.exists('Division', division_name):
                # If the division exists, print a message
                print(f"Division '{division_name}' already exists.")
            else:
                # Create a new Division document
                doc = frappe.new_doc('Division')
                doc.division = division_name  # Assuming 'division' is the field in the Division doctype
                doc.insert()
                frappe.db.commit()  # Commit the transaction if insert is successful
                print(f"Division '{division_name}' created successfully.")
        except Exception as e:
            # Catch any errors and log them
            frappe.log_error(message=str(e), title=f"Error creating division: {division_name}")
            print(f"Error creating division '{division_name}': {str(e)}")
