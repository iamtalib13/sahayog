import frappe

def execute():
    # List of regions to create
    regions_to_create = ['Head Office', 'Region-1', 'Region-2', 'Region-3', 'Region-4', 'Region-5', 'Region-6']

    for region_name in regions_to_create:
        try:
            # Check if the region already exists
            if not frappe.db.exists('Region', region_name):
                # Create a new Region document
                doc = frappe.new_doc('Region')
                doc.region = region_name  # Assuming 'region' is the field
                doc.insert()
                frappe.db.commit()  # Commit the transaction if insert is successful
                print(f"Region '{region_name}' created successfully.")
        except Exception as e:
            # Catch any errors and log them
            frappe.log_error(message=str(e), title=f"Error creating region: {region_name}")
            print(f"Error creating region '{region_name}': {str(e)}")
