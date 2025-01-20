import frappe

def execute():
    # List of divisions to create
    html = ""
    css = ""
    js = ""



@frappe.whitelist()
def get_all_projects():
    """
    Fetch all projects with relevant fields
    """
    try:
        # Fetch all projects with relevant fields
        projects = frappe.get_all(
            "Project", 
            fields=["name","project_name", "custom_branch_status", "custom_region", "custom_zone","custom_division","percent_complete"]
        )
        print(projects)  # Print fetched projects to the console
        return projects
    except Exception as e:
        frappe.throw(f"Error fetching projects: {str(e)}")


@frappe.whitelist()
def get_all_tasks(project_name):
    """
    Fetch all tasks for a specific project.
    """
    try:
        # Fetch tasks where the project field matches the passed project_name
        tasks = frappe.get_all(
            "Task", 
            filters={"project": project_name},  # Add filter for the project field
            fields=["name","subject","exp_start_date", "exp_end_date", "status", "modified"]
        )
        print(tasks)  # Print fetched tasks to the console
        return tasks
    except Exception as e:
        frappe.throw(f"Error fetching tasks: {str(e)}")


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

