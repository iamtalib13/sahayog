import frappe

def create_tasks_and_project_template():
    # List of task subjects
    task_subjects = [
        "Acquisition of the Property",
        "Letter of Intent",
        "Agreement and Handover",
        "Manpower Recruitment",  # Independent task (no dependencies)
        "Vendor Allocation",
        "Infrastructure Development Work",
        "IT Hardware Installation",
        "IT Software Installation and Activation",
        "Handover to Business Team",
        "Ready for Inauguration",
    ]

    last_dependent_task = None  # Track last task that should have dependencies
    task_list = []  # Store created task names

    for i, subject in enumerate(task_subjects, start=1):
        task_name = f"Task {i}: {subject}"

        # Check if the task already exists
        existing_task = frappe.db.exists("Task", {"subject": task_name})

        if not existing_task:
            # Create a new Task document
            task = frappe.get_doc({
                "doctype": "Task",
                "subject": task_name,
                "status": "Template",
                "is_template": 1
            })

            # Skip dependency for "Manpower Recruitment" (Task 4)
            if subject != "Manpower Recruitment" and last_dependent_task:
                task.append("depends_on", {
                    "doctype": "Task",
                    "task": last_dependent_task
                })

            # Insert the task into the database
            task.insert()
            print(f"Successfully created {task.subject}")

            # Update last dependent task (skip Task 4)
            if subject != "Manpower Recruitment":
                last_dependent_task = task.name

            task_list.append(task.name)
        else:
            print(f"Task '{task_name}' already exists and will not be created again.")
            existing_task_name = frappe.db.get_value("Task", {"subject": task_name}, "name")
            task_list.append(existing_task_name)

    frappe.db.commit()  # Commit changes to the database

    # Check if the project template already exists
    existing_project_template = frappe.db.exists("Project Template", "New Branch Setup")
    
    if not existing_project_template:
        # Create a new Project Template
        project_template = frappe.get_doc({
            "doctype": "Project Template",
            "project_name": "New Branch Setup",
            "tasks": []
        })
        project_template.name = project_template.project_name
    
        # Add tasks to the project template
        for task_name in task_list:
            project_template.append("tasks", {
                "task": task_name
            })
    
        # Insert the project template into the database
        project_template.insert()
        print(f"Project Template 'New Branch Setup' created successfully.")
    
        frappe.db.commit()
    
    else:
        print(f"Project Template 'New Branch Setup' already exists. Skipping creation.")




@frappe.whitelist()
def get_all_projects():
    # Fetch all projects with relevant fields
    projects = frappe.get_all(
        "Project", 
        fields=["name", "status", "region", "zone"]
    )
    return projects

    