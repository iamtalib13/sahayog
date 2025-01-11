import frappe

def create_tasks_and_project_template():
    # List of task subjects (this is the only dynamic field)
    task_subjects = [
        "Acquisition of Property",
        "Letter of Intent",
        "Upload Agreement",
        "Landlord Handover"
    ]

    previous_task_name = None  # To track the previous task for dependency
    task_list = []  # To store created task names

    # Create tasks dynamically with a "Task n:" prefix
    for i, subject in enumerate(task_subjects, start=1):
        task_name = f"Task {i}: {subject}"
        
        # Check if the task already exists
        existing_task = frappe.db.exists("Task", {"subject": task_name})
        
        if not existing_task:
            # Use frappe.get_doc() correctly to create a new Task document
            task = frappe.get_doc({
                "doctype": "Task",
                "subject": task_name,  # Add the "Task n:" prefix
                "status": "Template",  # Set the status field to "Template"
                "is_template": 1
            })
            
            # Set dependency if there's a previous task
            if previous_task_name:
                # Append the previous task as a dependency in the child table
                task.append("depends_on", {
                    "doctype": "Task", 
                    "task": previous_task_name
                })
            
            # Insert the task document into the database
            task.insert()
            print(f"Successfully created {task.subject}")
            
            # Update previous_task_name to the current task's name
            previous_task_name = task.name
            task_list.append(task.name)
        else:
            print(f"Task '{task_name}' already exists and will not be created again.")
            existing_task_name = frappe.db.get_value("Task", {"subject": task_name}, "name")
            task_list.append(existing_task_name)

    frappe.db.commit()  # Commit changes to the database

    # Check if the project template already exists
    existing_project_template = frappe.db.exists("Project Template", "New Branch Setup")
    
    if not existing_project_template:
        # Create a new Project template named "New Branch Setup"
        project_template = frappe.get_doc({
            "doctype": "Project Template",
            "project_name": "New Branch Setup",  # The name of the template
            "tasks": []  # Initialize the task list as empty
        })
        # Set the name explicitly to avoid 'Please set the document name' error
        project_template.name = project_template.project_name  # Set the name to the project_name
    
        # Add the tasks as milestones or regular tasks to the project
        for task_name in task_list:
            project_template.append("tasks", {
                "task": task_name  # Link the created task to the project
            })
    
        # Insert the project template into the database
        project_template.insert()
        print(f"Project Template 'New Branch Setup' created successfully.")
    
        frappe.db.commit()  # Commit changes to the database
    
    else:
        print(f"Project Template 'New Branch Setup' already exists. Skipping creation.")



    