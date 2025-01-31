import frappe

def execute():
    # Explicitly set the module to "Sahayog Project"
    frappe.db.set_value("DocType", "Letter of Intent", "module", "Sahayog Project")  
    #Reload the DocType to ensure the changes are recognized by the system
    #frappe.reload_doc("sahayog_project", "doctype", "letter_of_intent") 
    # Show a success message
    print("Module for Letter of Intent updated to Sahayog Project successfully.")
