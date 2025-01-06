import frappe

def execute():
    # List of zones to create
    zones_to_create = ['Zone -1', 'Zone -2', 'Zone -3', 'Zone -4', 'Zone -5', 'Zone -6', 'Zone -7', 'Zone -8']

    for zone_name in zones_to_create:
        try:
            # Check if the zone already exists
            if frappe.db.exists('Zone', zone_name):
                # If the zone exists, print a message
                print(f"Zone '{zone_name}' already exists.")
            else:
                # Create a new Zone document
                doc = frappe.new_doc('Zone')
                doc.zone = zone_name  # Assuming 'zone' is the field in the Zone doctype
                doc.insert()
                frappe.db.commit()  # Commit the transaction if insert is successful
                print(f"Zone '{zone_name}' created successfully.")
        except Exception as e:
            # Catch any errors and log them
            frappe.log_error(message=str(e), title=f"Error creating zone: {zone_name}")
            print(f"Error creating zone '{zone_name}': {str(e)}")
