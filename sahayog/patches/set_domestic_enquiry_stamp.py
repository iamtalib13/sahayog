import frappe

def execute():
    frappe.db.set_single_value("Sahayog HR Setting", "domestic_enquiry_stamp", "/assets/sahayog/images/stamp-2.png")
    frappe.db.commit()
    val = frappe.db.get_single_value("Sahayog HR Setting", "domestic_enquiry_stamp")
    print("domestic_enquiry_stamp =", val)
