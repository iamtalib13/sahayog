import frappe

# def execute():
    
#     project = frappe.get_doc("Doctype", "Project")


    
    
    # for project in projects:
    #     project_doc = frappe.get_doc("Project", project.name)

    #     # Check if entry already exists to avoid duplicates
    #     if any(link.link_doctype == "Request for Quotation" for link in project_doc.links):
    #         frappe.logger().info(f"Link already exists for Project {project.name}. Skipping...")
    #         continue
        
    #     # Add new link to the links child table
    #     project_doc.append("links", {
    #         "link_doctype": "Request for Quotation",
    #         "link_fieldname": "custom_project",
    #         "group": "Supplier"
    #     })
        
    #     # Save the updated Project document
    #     project_doc.save()
    
    # frappe.db.commit()
    # print("Successfully added Request for Quotation link in Project links table.")
