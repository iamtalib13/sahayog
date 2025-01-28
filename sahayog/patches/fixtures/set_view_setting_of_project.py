import frappe

def execute():
    try:
        # Fetch the Project doctype using a filter for name="Project"
        project_meta_list = frappe.get_list('DocType', filters={'name': 'Project'})
        
        if project_meta_list:
            # Load the Project doctype document
            project_meta = frappe.get_doc('DocType', project_meta_list[0]['name'])
            
            # Update the fields
            project_meta.title_field = 'project_name'  # Set the title_field to "project_name"
            project_meta.show_title_field_in_link = 1  # Set the checkbox to checked (1)
            
            # Save the changes
            project_meta.save()
            print("Project doctype updated successfully.")
        else:
            print("Project doctype not found.")
    except Exception as e:
        # Log any errors that occur
        frappe.log_error(message=str(e), title="Error updating Project doctype")
        print(f"Error updating Project doctype: {str(e)}")
