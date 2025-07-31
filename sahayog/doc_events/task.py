from __future__ import unicode_literals
import json
import frappe
from frappe import _
from frappe.utils.file_manager import get_file
from frappe.core.doctype.file.file import File
from sahayog.doc_events.project import update_branch_status
from frappe.utils import get_url




def create_letter_of_intent(doc, method):
    project = doc.project
    subject = doc.subject
    task = doc.name

    if subject == 'Task 2 : Letter of Intent' and project:
        # Create a new Letter of Intent document
        letter_of_intent = frappe.new_doc('Letter of Intent')
        letter_of_intent.project = project
        letter_of_intent.task = task
        letter_of_intent.docstatus = 0  # Draft status

        # Save the new document to the database
        letter_of_intent.insert(ignore_permissions=True)

        # Optionally, show a message to confirm the creation
        #frappe.msgprint(f"Letter of Intent created for project: {project}")

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
# @frappe.whitelist()
# def get_custom_location_details(docname):
#     task = frappe.get_doc("Task", docname)
#     return task.custom_location_details

@frappe.whitelist()
def get_custom_location_details(docname):
    query = """
        SELECT
            *
        FROM
            `tabLocation Details`
        WHERE
            parent = %s
        ORDER BY
            idx ASC
    """
    location_details = frappe.db.sql(query, (docname,), as_dict=True)
    return location_details

#check file already exists
@frappe.whitelist()
def check_file_exists(file_name, doctype, docname):
    """
    Checks if a file with the given file_name exists and is attached
    to the specified doctype and docname.
    """
    exists = frappe.db.exists("File", {
        "file_name": file_name,
        "attached_to_doctype": doctype,
        "attached_to_name": docname
    })
    return {"exists": bool(exists)}

#to delete the file attached with location details 
@frappe.whitelist()
def delete_file(name):
    try:
        # Check if the file exists using frappe.db.exists.
        if not frappe.db.exists('File', name):
            return {"error": "File not found"}

        # Fetch the file document
        file_doc = frappe.get_doc('File', name)
        frappe.log_error(f"Deleting file: {file_doc}")

        # Delete the file document
        frappe.delete_doc('File', name)

        return {"message": "success", "file_name": name}
    except Exception as e:
        frappe.log_error(f"Error deleting file {name}: {str(e)}")
        return {"error": str(e)}
    
#Fetch the role of the currently logged-in user.
@frappe.whitelist()
def get_user_role():
    roles = frappe.get_roles(frappe.session.user)
    return roles  # This returns a list of roles like ["System Manager", "Project Manager"]

# Fetch the location table permissions based on user roles
@frappe.whitelist()
def get_location_table_permissions(roles=None):
    if not roles:
        roles = frappe.get_roles(frappe.session.user)
    
    settings = frappe.get_single("Sahayog Settings")

    permissions = {
        "can_edit_status": False,
        "can_add_row": False,
        "can_edit_location": False,
    }

    for row in settings.location_table_permissions:
        if row.role in roles:
            permissions["can_edit_status"] |= row.can_edit_status
            permissions["can_add_row"] |= row.can_add_row
            permissions["can_edit_location"] |= row.can_edit_location

    return permissions

# @frappe.whitelist()
# def delete_file(name):
   
#     # Fetch the file using the unique 'name' field
#     file_doc = frappe.get_doc('File', name)
#     # Debug: print the list of files
#     frappe.log_error(f"Files found: {file_doc}")
    
#     return {"message": "success", "file_name": file_doc}
       


def update_branch_status_trigger(doc, method):
    try:
        # Check if the Task has a linked Project
        if doc.project:
            # Fetch the linked Project document
            project = frappe.get_doc("Project", doc.project)
            status = doc.status
            # Call the update_branch_status function for the linked project with status
            update_branch_status(project, method, status)

    except Exception as e:
        # Log the error if any exception occurs
        frappe.log_error(message=str(e), title="Error in update_branch_status_trigger")
        # Show an error message to the user
        frappe.msgprint(f"An error occurred while triggering the branch status update for Project: {str(e)}")

def validate_location_status(doc, method):
    if doc.subject == "Task 1 : Acquisition of the Property" and doc.status == "Completed":
        approved_locations = set()
        
        for location in doc.custom_location_details:
            status = (location.status or "").strip().lower()
            if status == "approved":
                approved_locations.add(location.location_name)
        
        # At least one approved location required
        if len(approved_locations) == 0:
            frappe.throw(_("Cannot mark the task as 'Completed' until at least one location detail is 'Approved'."))
        
        # More than one distinct location_name approved is not allowed
        if len(approved_locations) > 1:
            frappe.throw(_("Only one location detail can have 'Approved' status before marking the task as 'Completed'."))




def validate_agreement_status(doc, method):
    if doc.subject == "Task 3 : Agreement and Handover" and doc.status == "Completed":
        # Check if the custom_agreement field is empty or None
        if not doc.custom_agreement:
            frappe.throw(_("Cannot mark the task as 'Completed' until the Agreement is provided."))


def check_loi_docstatus_for_task_2(doc, method):
    # ✅ Task 2 ka status agar "Completed" nahi hai to validation mat chalao
    if doc.status != 'Completed':
        return

    # ✅ Agar Task abhi abhi insert hua hai (project banate time) to validation skip karo
    if doc.is_new():
        return

    # ✅ Ab actual validation sirf Task 2 ke liye chale
    if doc.subject == 'Task 2 : Letter of Intent':
        project = doc.project

        # LOI fetch karo project ke basis pe
        loi_docs = frappe.get_all('Letter of Intent', 
                                  filters={'project': project}, 
                                  fields=['name', 'docstatus'])

        if loi_docs:
            for loi in loi_docs:
                if loi['docstatus'] == 0:
                    # LOI saved hai but submit nahi hua
                    loi_url = f"{get_url()}/app/letter-of-intent/{loi['name']}"
                    frappe.throw(
                        _(f"First fill and submit the Letter of Intent before setting Task 2 status to completed. <b><a href='{loi_url}'>Click here to open LOI</a></b>"),
                        title="Incomplete Letter of Intent"
                    )
        else:
            frappe.msgprint(_(f"No Letter of Intent found for project {project}"))

# Custom autonaming for Task documents for preventing duplicates
def task_custom_autoname(doc, method):
    prefix = "TASK-" + frappe.utils.now_datetime().strftime("%Y") + "-"
    last_number = get_last_task_number(prefix)
    
    while True:
        new_name = f"{prefix}{str(last_number).zfill(5)}"
        if not frappe.db.exists("Task", new_name):
            doc.name = new_name
            break
        last_number += 1

def get_last_task_number(prefix):
    # Find the max existing number for the year
    latest = frappe.db.sql(f"""
        SELECT name FROM `tabTask`
        WHERE name LIKE %s
        ORDER BY name DESC
        LIMIT 1
    """, (prefix + "%",), as_dict=True)

    if latest:
        num_part = latest[0]["name"].replace(prefix, "")
        try:
            return int(num_part) + 1
        except ValueError:
            return 1
    return 1

#Task 4 : Manpower Recruitment validations
def fetch_manpower_settings(doc, method):
    if doc.subject == "Task 4 : Manpower Recruitment" and not doc.is_template:
        if not doc.manpower_fetched:
            settings = frappe.get_single("Manpower Recruitment Setting")
            doc.manpower_recruitment_table = []

            for row in settings.manpower_recruitment_table:
                doc.append("manpower_recruitment_table", {
                    "standard_employee_count": row.standard_employee_count,
                    "hirable_designation": row.hirable_designation
                })
            
            doc.manpower_fetched = 1  # Mark as fetched
            
def prevent_completion_if_manpower_incomplete(doc, method):
    if doc.subject != "Task 4 : Manpower Recruitment" or doc.is_template:
        return

    if doc.status == "Completed":
        errors = []

        for i, row in enumerate(doc.manpower_recruitment_table, start=1):
            if not row.hired_till_now or row.hired_till_now <= 0:
                errors.append(
                    f"Row {i} ({row.hirable_designation}): ✅ 'Hired Till Now' must be greater than 0."
                )

            if row.status not in ["In Process", "Hired"]:
                errors.append(
                    f"Row {i} ({row.hirable_designation}): ✅ Status must be 'In Process' or 'Hired'."
                )

        if errors:
            frappe.throw(
                """<b>Please update the hiring details before completing this task.</b><br><br>
                Make sure the following conditions are met for all rows in the manpower table:<br>
                ✅ <b>Status</b> must be set to <b>In Process</b> or <b>Hired</b>.<br>
                ✅ <b>Hired Till Now</b> must be greater than <b>0</b>.<br><br>

                <button onclick="document.getElementById('manpower-errors').style.display='block'" 
                        style="background-color:#007bff;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">
                    View Issues
                </button>

                <div id="manpower-errors" style="display:none;margin-top:10px;">
                    <b>Issues found:</b><br>
                    {}
                </div>
                """.format("<br>".join(errors)),
                title="Hiring Data Incomplete"
            )

#Validations for above :
#Task 6 : IT Hardware Installation
#Task 7 : IT Software Installation 

def fetch_it_checklist_settings(doc, method):
    if doc.subject not in ["Task 6 : IT Hardware Installation", "Task 7 : IT Software Installation"]:
        return

    if doc.is_template or doc.if_checklist_fetched:
        return

    category = "Hardware" if doc.subject == "Task 6 : IT Hardware Installation" else "Software"

    settings = frappe.get_single("IT Checklist Setting")
    doc.it_checklist_table = []

    for row in settings.it_checklist:
        if row.category == category:
            doc.append("it_checklist_table", {
                "activity": row.activity,
                "category": row.category,
                "installation_phase": row.installation_phase,
                "status": "Pending"  # Default status if needed
            })

    doc.if_checklist_fetched = 1


def prevent_completion_if_it_checklist_incomplete(doc, method):
    if doc.subject not in ["Task 6 : IT Hardware Installation", "Task 7 : IT Software Installation"]:
        return

    if doc.is_template or doc.status != "Completed":
        return

    errors = []

    for i, row in enumerate(doc.it_checklist_table, start=1):
        if row.status not in ["In-Progress", "Completed"]:
            errors.append(
                f"Row {i}: Status must be 'In-Progress' or 'Completed'."
            )

    if errors:
        frappe.throw(
            """<b>Please complete the IT Checklist before marking this task as completed.</b><br><br>
            Make sure the following condition is met for all rows in the IT Checklist Table:<br>
            ✅ <b>Status</b> must be <b>In-Progress</b> or <b>Completed</b>.<br><br>

            <button onclick="document.getElementById('it-errors').style.display='block'" 
                    style="background-color:#007bff;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">
                View Issues
            </button>

            <div id="it-errors" style="display:none;margin-top:10px;">
                <b>Issues found:</b><br>
                {}
            </div>
            """.format("<br>".join(errors)),
            title="Incomplete IT Checklist"
        )
