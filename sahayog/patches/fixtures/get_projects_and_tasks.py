import frappe
from frappe import _



@frappe.whitelist()
def get_all_projects():
    """
    Fetch all projects with relevant fields
    """
    try:
        # Fetch all projects with relevant fields
        projects = frappe.get_all(
            "Project", 
            fields=["name","project_name", "custom_branch_status", "custom_region", "custom_zone","custom_division","percent_complete","branch_proposal"]
        )
        return projects
    except Exception as e:
        frappe.throw(f"Error fetching projects: {str(e)}")
        
@frappe.whitelist()
def get_all_tasks(name):
    """
    Fetch all tasks for a specific project, including child table records.
    """
    try:
        tasks = frappe.get_all(
            "Task", 
            filters={"project": name},
            fields=["name", "subject", "exp_start_date", "exp_end_date", "status", "modified", "project"]
        )

        for task in tasks:
            subject = task["subject"]

            # Task 1: Location Details
            if "Task 1 : Acquisition of the Property" in subject:
                task["location_details_table"] = frappe.get_all(
                    "Location Details",
                    filters={"parent": task["name"], "parenttype": "Task"},
                    fields=["location_name", "estimate_rent", "location_image", "status"]
                )

            # Task 3: Custom Agreement
            if "Task 3 : Agreement and Handover" in subject:
                task["custom_agreement"] = frappe.db.get_value(
                    "Task", task["name"], "custom_agreement"
                )

            # Task 4: Manpower Recruitment
            if "Task 4 : Manpower Recruitment" in subject:
                task["manpower_recruitment_table"] = frappe.get_all(
                    "Manpower Recruitment Hiring Table",
                    filters={"parent": task["name"], "parenttype": "Task"},
                    fields=["employee_name", "employee_designation", "employee_department", "status"]
                )

            # Task 6 or 7: IT Checklist
            if subject in ["Task 6 : IT Hardware Installation", "Task 7 : IT Software Installation"]:
                task["it_checklist_table"] = frappe.get_all(
                    "IT Checklist",
                    filters={"parent": task["name"], "parenttype": "Task"},
                    fields=["activity", "category", "status","installation_phase"]
                )

             # Task 8 : Licence to Operate
            if "Task 8 : Licence to Operate" in subject:
                task["lto_training_table"] = frappe.get_all(
                    "Licence to Operate Training Table",
                    filters={"parent": task["name"], "parenttype": "Task"},
                    fields=["employee_name", "employee_designation", "employee_department", "training_status"]
                )


        return tasks

    except Exception as e:
        frappe.throw(f"Error fetching tasks: {str(e)}")

@frappe.whitelist()
def get_specific_task(name):
    """
    Fetch details of a specific task, including related child table records.
    """
    try:
        # Main task
        task = frappe.get_all(
            "Task",
            filters={"name": name},
            fields=["name", "subject", "exp_start_date", "exp_end_date", "status", "modified", "project", "description"],
            limit_page_length=1
        )

        if not task:
            frappe.throw(f"No task found with name: {name}")

        task = task[0]  # since it's only one

        subject = task["subject"]

        # Task 1: Location Details
        if "Task 1 : Acquisition of the Property" in subject:
            task["location_details_table"] = frappe.get_all(
                "Location Details",
                filters={"parent": task["name"], "parenttype": "Task"},
                fields=["location_name", "estimate_rent", "location_image", "status"]
            )

        # Task 3: Custom Agreement
        if "Task 3 : Agreement and Handover" in subject:
            task["custom_agreement"] = frappe.db.get_value(
                "Task", task["name"], "custom_agreement"
            )

        # Task 4: Manpower Recruitment
        if "Task 4 : Manpower Recruitment" in subject:
                task["manpower_recruitment_table"] = frappe.get_all(
                    "Manpower Recruitment Hiring Table",
                    filters={"parent": task["name"], "parenttype": "Task"},
                    fields=["employee_name", "employee_designation", "employee_department", "status"]
            )

        # Task 6 or 7: IT Checklist
        if subject in ["Task 6 : IT Hardware Installation", "Task 7 : IT Software Installation"]:
            task["it_checklist_table"] = frappe.get_all(
                "IT Checklist",
                filters={"parent": task["name"], "parenttype": "Task"},
                fields=["activity", "category", "status", "installation_phase"]
            )

        return task

    except Exception as e:
        frappe.throw(f"Error fetching task: {str(e)}")



 
@frappe.whitelist()
def get_options_dynamically_for_filter():
    # Fetch all the names from the Zone doctype
    zone_names = frappe.get_all('Zone', fields=['name'])
    
    # Fetch all the names from the Region doctype
    region_names = frappe.get_all('Region', fields=['name'])
    
    # Fetch all the names from the Division doctype
    division_names = frappe.get_all('Division', fields=['name'])
    
    # Fetch the options of the custom_branch_status field from the Project doctype
    custom_branch_status_options = frappe.get_meta('Project').get_field('custom_branch_status').options
    
    # Return the list of names from all three doctypes and the options of the field
    return {
        'zone_names': [zone.get('name') for zone in zone_names],
        'region_names': [region.get('name') for region in region_names],
        'division_names': [division.get('name') for division in division_names],
        'custom_branch_status_options': custom_branch_status_options.split("\n")  # Split options by new line
    }

@frappe.whitelist()
def add_image_for_existing_location(task_name, location_name, estimate_rent, status):
    try:
        # 1. Get the Task document
        task = frappe.get_doc("Task", task_name)

        # 2. Handle uploaded file
        file_url = None
        uploaded_file = frappe.request.files.get('image_file')
        if not uploaded_file:
            return {"success": False, "error": "No file uploaded"}

        file_content = uploaded_file.stream.read()

        # 3. Create File doc (only in Home, not Task attachments)
        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": uploaded_file.filename,
            "folder": "Home",
            "is_private": 0,
            "content": file_content
        })
        file_doc.insert(ignore_permissions=True)
        frappe.db.commit()

        file_url = file_doc.file_url

        # 4. Append new row in child table
        child = task.append("custom_location_details", {})
        child.location_name = location_name
        child.estimate_rent = float(estimate_rent or 0)
        child.status = status
        child.location_image = file_url

        # 5. Save & commit
        task.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "file_url": file_url,
            "task": task.name
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Add Image For Existing Location Error")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def add_new_location(task_name, location_name, estimate_rent, status):
    try:
        # 1. Get Task document
        task = frappe.get_doc("Task", task_name)

        # 2. Handle optional image file
        file_url = None
        uploaded_file = frappe.request.files.get('image_file')
        if uploaded_file:
            # Read file content
            file_content = uploaded_file.stream.read()

            # Create File document via ORM
            file_doc = frappe.get_doc({
                "doctype": "File",
                "file_name": uploaded_file.filename,
                "folder": "Home",
                "is_private": 0,
                "content": file_content
            })
            file_doc.insert(ignore_permissions=True)
            frappe.db.commit()

            file_url = file_doc.file_url

        # 3. Append new location row via ORM
        child = task.append("custom_location_details", {})
        child.location_name = location_name
        child.estimate_rent = float(estimate_rent or 0)
        child.status = status
        child.location_image = file_url

        # 4. Save & commit
        task.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "file_url": file_url,
            "task": task.name
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Add New Location Error")
        return {"success": False, "error": str(e)}
    
    
@frappe.whitelist()
def delete_location_image(task_name, location_name, image_file):
    """
    Delete the entire row from Task.custom_location_details 
    if the image matches.
    """
    try:
        # Fetch the task document
        task = frappe.get_doc("Task", task_name)

        deleted = False

        # Collect rows to delete (avoid modifying list while iterating)
        rows_to_delete = []
        for row in task.custom_location_details:
            if row.location_name == location_name and row.location_image == image_file:
                rows_to_delete.append(row)

        # Actually delete rows
        for row in rows_to_delete:
            task.remove(row)
            deleted = True

        if deleted:
            task.save(ignore_permissions=True)
            frappe.db.commit()
            return {"success": True, "message": _("Row deleted successfully")}
        else:
            return {"success": False, "error": _("Row not found with given image")}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Delete Location Row Error")
        return {"success": False, "error": str(e)}
    
@frappe.whitelist()
def update_location_details(task_name, location_name, estimate_rent=None, status=None):
    """
    Update rent and status for all rows in Task.custom_location_details
    with the given location_name.
    """
    try:
        task = frappe.get_doc("Task", task_name)
        updated = False

        for row in task.custom_location_details:
            if row.location_name == location_name:
                if estimate_rent is not None:
                    row.estimate_rent = float(estimate_rent)
                if status is not None:
                    row.status = status
                updated = True

        if updated:
            task.save(ignore_permissions=True)
            frappe.db.commit()
            return {"success": True, "message": _("Location details updated successfully")}
        else:
            return {"success": False, "error": _("No rows found for the given location_name")}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Update Location Details Error")
        return {"success": False, "error": str(e)}
    
@frappe.whitelist()
def update_task_common_fields(task_name, data):
    """
    Auto-update task fields.
    'data' should be a dict containing keys: status, start_date, end_date, completed_on
    """
    try:
        task = frappe.get_doc("Task", task_name)

        # Only run validations for "Task 1 : Acquisition of the Property"
        if task.subject == "Task 1 : Acquisition of the Property":
            # Check if status is being changed to "Completed"
            if data.get("status") == "Completed" and task.status != "Completed":
                # Validation 1: Check if at least one location detail is "Approved"
                approved_location_details = [row for row in task.get("custom_location_details", []) 
                                           if row.status == "Approved"]
                
                if not approved_location_details:
                    return {
                        "success": False, 
                        "error": "Cannot mark the task as 'Completed' until at least one location detail is 'Approved'."
                    }
                
                # Validation 2: Check if multiple approved rows have different location names
                if len(approved_location_details) > 1:
                    first_location = approved_location_details[0].location_name
                    different_locations = any(row.location_name != first_location 
                                            for row in approved_location_details[1:])
                    
                    if different_locations:
                        return {
                            "success": False, 
                            "error": "Only one location detail can have 'Approved' status before marking the task as 'Completed'."
                        }

        # Update fields
        for key in ["status", "start_date", "end_date", "completed_on"]:
            if key in data:
                setattr(task, key, data[key])

        task.save()
        frappe.db.commit()

        return {"success": True, "message": "Task updated successfully"}
    except frappe.DoesNotExistError:
        return {"success": False, "error": _("Task not found")}
    except Exception as e:
        frappe.log_error(e, "update_task_fields failed")
        return {"success": False, "error": str(e)}