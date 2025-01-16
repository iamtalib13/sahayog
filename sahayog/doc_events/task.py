from __future__ import unicode_literals
import json
import frappe
from frappe import _
from frappe.utils.file_manager import get_file
from frappe.core.doctype.file.file import File


def create_letter_of_intent(doc, method):
    project = doc.project
    subject = doc.subject
    task = doc.name

    if subject == 'Task 2: Letter of Intent' and project:
        # Create a new Letter of Intent document
        letter_of_intent = frappe.new_doc('Letter of Intent')
        letter_of_intent.project = project
        letter_of_intent.task = task
        letter_of_intent.docstatus = 0  # Draft status

        # Save the new document to the database
        letter_of_intent.insert(ignore_permissions=True)

        # Optionally, show a message to confirm the creation
        frappe.msgprint(f"Letter of Intent created for project: {project}")

#render the the html file of location details
@frappe.whitelist()
def get_location_details_html():
    html_content = frappe.render_template("sahayog/public/html/location_details.html", {})
    return html_content  # No escaping here


#create doc for location details
# @frappe.whitelist()
# def create_location_details(location_data, docname):
#     location_data = json.loads(location_data)
    
#     parent_doc = frappe.get_doc("Task", docname)  # Replace 'Task' with your actual DocType

#     saved_location_details = []

#     for loc in location_data:
#         # Append the location data to the child table
#         parent_doc.append("custom_location_details", {
#             "location_name": loc["location_name"],
#             "status": loc["status"],
#             "attachments": loc.get("attachments", "")  # Add attachments data if available
#         })
        
#         # Add the saved location data to the list for return
#         saved_location_details.append({
#             "location_name": loc["location_name"],
#             "status": loc["status"],
#             "attachments": loc.get("attachments", "")
#         })

#     parent_doc.save()  # Save the parent document with the new child table entries
#     return {"message": "success", "custom_location_details": saved_location_details}


# @frappe.whitelist()
# def save_or_update_location_details(location_data, docname):
#     # Convert the location_data from string to a list of dictionaries
#     location_data = json.loads(location_data)
#     existing_rows = []  # List to store existing rows

#     # Fetch the current max idx from the child table for the given parent
#     max_idx = frappe.db.sql("""
#         SELECT MAX(idx) FROM `tabLocation Details`
#         WHERE parent=%s
#     """, (docname,))[0][0] or 0

#     for data in location_data:
#         child_docname = data["name"]
        
#         # Query to check if the record exists in 'Location Details'
#         existing_location = frappe.db.get_value(
#             "Location Details",
#             {"parent": docname, "name": child_docname},
#             "*",  # Fetch all fields
#             as_dict=True  # Return as a dictionary
#         )
#         existing_rows.append(existing_location)  # Append the existing row to the list
        
#         # Initialize file paths to be stored in the Location Details doctype
#         file_paths = []

#         # If there are file(s), handle file upload and store the path(s)
#         if data.get("file_metadata"):
#             for file_info in data["file_metadata"]:
#                 # Create a File document and ensure it's uploaded properly
#                 file = frappe.get_doc({
#                     "doctype": "File",
#                     "file_name": file_info["filename"],
#                     "file_size": file_info["size"],
#                     "file_type": file_info["type"],
#                     "attached_to_doctype": "Location Details",  # Attach to Location Details doctype
#                     "attached_to_name": child_docname,  # Attach to the specific Location Details record
#                     "folder": "Home",  # Adjust as per your folder structure
#                     "custom_attach_child_docname": child_docname  # Custom field to store the respective row name
#                 })
                
#                 # Save the file document after upload
#                 file.save()

#                 # Ensure the file_url is available and valid
#                 if file.file_url:
#                     file_paths.append(file.file_url)  # Collect the file path/URL
#                 else:
#                     frappe.throw(_("File upload failed for {0}").format(file_info["filename"]))

#         # Join the file paths with commas for multiple files
#         attachments_data = ",".join(file_paths)

#         if existing_location:
#             # Update existing record
#             location = frappe.get_doc("Location Details", existing_location)
#             location.location_name = data["location_name"]
#             location.status = data["status"]
#             location.attachments = attachments_data  # Store the file URLs in the attachments field
#             location.save()
#         else:
#             # Insert new record
#             max_idx += 1  # Increment idx for new entry
#             new_location = frappe.get_doc({
#                 "doctype": "Location Details",
#                 "location_name": data["location_name"],
#                 "status": data["status"],
#                 "attachments": attachments_data,  # Save the file URLs
#                 "parent": docname,
#                 "parenttype": "Task",
#                 "parentfield": "custom_location_details",
#                 "idx": max_idx  # Set the idx field
#             })
#             new_location.insert()
#             new_location.save()

#     return {"message": "success", "existing_rows": existing_rows, "child_docname": child_docname}


@frappe.whitelist()
def save_or_update_location_details(location_data, docname):
    location_data = json.loads(location_data)
    existing_rows = []  # List to store existing rows
    max_idx = frappe.db.sql("""
        SELECT MAX(idx) FROM `tabLocation Details`
        WHERE parent=%s
    """, (docname,))[0][0] or 0

    for data in location_data:
        child_docname = data["name"]

        # Check for existing Location Details record
        existing_location = frappe.db.get_value(
            "Location Details",
            {"parent": docname, "name": child_docname},
            "*",
            as_dict=True
        )
        existing_rows.append(existing_location)

        # Process the attachments (save them as files)
        attachment_urls = []
        if data.get("file_metadata"):
            for attachment in data["file_metadata"]:
                file_info = save_file_to_disk(attachment, docname, child_docname)  # Save to file doctype
                if file_info:
                    attachment_urls.append(file_info.get("file_url"))

        # Save or update Location Details document
        if existing_location:
            location = frappe.get_doc("Location Details", existing_location)
            location.location_name = data["location_name"]
            location.status = data["status"]
            location.attachments = ",".join(attachment_urls)  # Save file URLs as comma-separated
            location.save()
        else:
            max_idx += 1
            new_location = frappe.get_doc({
                "doctype": "Location Details",
                "location_name": data["location_name"],
                "status": data["status"],
                "attachments": ",".join(attachment_urls),
                "parent": docname,
                "parenttype": "Task",
                "parentfield": "custom_location_details",
                "idx": max_idx
            })
            new_location.insert()

    return {"message": "success", "existing_rows": existing_rows, "child_docname": child_docname}


def save_file_to_disk(attachment_data, docname, child_docname):
    """Utility function to save the file in the File doctype"""
    # Validate if the file is already available
    if not attachment_data.get("filename"):
        frappe.throw(_("File URL is missing or invalid"))

    try:
        # Check if the file exists on disk
        file = get_file(attachment_data["filename"])  # Fetch the file to check its existence
        if not file:
            frappe.throw(_("File does not exist on disk"))

        

        # If file exists, save it to the File doctype
        file_doc = File()
        file_doc.file_name = attachment_data["filename"]
        file_doc.file_url = attachment_data["filename"]  # Make sure this is a valid URL
        file_doc.attached_to_doctype = "Task"
        file_doc.attached_to_name = docname  # Attach it to the respective document
        file_doc.is_private = 0  # Optionally set it as private
        file_doc.custom_attach_child_docname = child_docname
        file_doc.insert()
        file_doc.save()

        return {"file_url": file_doc.file_url}  # Return the file URL to use later

    except Exception as e:
        frappe.throw(_("Error saving file: {0}".format(str(e))))

# handle the deletion in location details records
@frappe.whitelist()
def delete_location_details(names):
    try:
        names = json.loads(names)  # Ensure names are in list format
        for name in names:
            frappe.delete_doc("Location Details", name, force=True)
        return {"message": "success"}
    except Exception as e:
        return {"message": str(e)}


#fetch the location details to client side
@frappe.whitelist()
def get_custom_location_details(docname):
    task = frappe.get_doc("Task", docname)
    return task.custom_location_details






