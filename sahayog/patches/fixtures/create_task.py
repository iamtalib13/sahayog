import frappe



@frappe.whitelist()
def get_all_projects():
    # Fetch all projects with relevant fields
    projects = frappe.get_all(
        "Project", 
        fields=["name", "status", "region", "zone"]
    )
    return projects

    