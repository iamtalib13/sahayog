import frappe

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
                    "Manpower Recruitment",
                    filters={"parent": task["name"], "parenttype": "Task"},
                    fields=["hirable_designation", "standard_employee_count", "hired_till_now", "status"]
                )

            # Task 6 or 7: IT Checklist
            if subject in ["Task 6 : IT Hardware Installation", "Task 7 : IT Software Installation"]:
                task["it_checklist_table"] = frappe.get_all(
                    "IT Checklist",
                    filters={"parent": task["name"], "parenttype": "Task"},
                    fields=["activity", "category", "status","installation_phase"]
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
                "Manpower Recruitment",
                filters={"parent": task["name"], "parenttype": "Task"},
                fields=["hirable_designation", "standard_employee_count", "hired_till_now", "status"]
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

