import frappe
import re

def task_sort_key(task_name):
    match = re.search(r'\d+', task_name)
    return int(match.group()) if match else 0

@frappe.whitelist()
def get_project_task_matrix():
    # Get standard tasks (templates)
    standard_tasks = frappe.get_all(
        "Task",
        filters={"is_template": 1},
        fields=["subject"]
    )

    task_headers = [t.subject for t in standard_tasks]
    task_headers.sort(key=task_sort_key)  # numeric order

    # Get all projects and tasks
    rows = frappe.db.sql("""
        SELECT 
            p.name AS project,
            p.project_name AS project_name,
            t.subject AS task_name,
            t.status AS task_status
        FROM `tabProject` p
        LEFT JOIN `tabTask` t ON t.project = p.name
    """, as_dict=True)

    project_map = {}
    for r in rows:
        project = r.project
        project_name = r.project_name

        if project not in project_map:
            project_map[project] = {
                "project_name": project_name,
                "tasks": {}
            }

        if r.task_name:
            project_map[project]["tasks"][r.task_name] = r.task_status

    return {
        "projects": project_map,
        "tasks": task_headers
    }
