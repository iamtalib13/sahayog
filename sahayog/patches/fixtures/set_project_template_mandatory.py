import frappe

def execute():
    if frappe.db.exists("DocType", "Project"):
        project_doctype = frappe.get_doc("DocType", "Project")

        # Find the 'project_template' field
        for field in project_doctype.fields:
            if field.fieldname == "project_template":
                field.reqd = 1  # Make field mandatory
                break

        # Save changes
        project_doctype.save()
        frappe.db.commit()
        print("✅ 'project_template' field is now mandatory in Project Doctype.")
    else:
        print("❌ Project Doctype does not exist.")
