import frappe

def execute():
    # Set domestic_enquiry_stamp to stamp-2.png for production
    frappe.db.set_single_value(
        "Sahayog HR Setting",
        "domestic_enquiry_stamp",
        "/assets/sahayog/images/stamp-2.png"
    )
    frappe.db.commit()
    print("Set domestic_enquiry_stamp to /assets/sahayog/images/stamp-2.png")
