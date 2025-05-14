import frappe

def create_tasks_and_project_template(doc, method):
    """Triggers on save of 'Sahayog Settings' Doctype"""

    # Fetch task templates from the child table in 'Sahayog Settings'
    settings = frappe.get_doc("Sahayog Settings")  
    task_template_data = settings.task_template_setting  

    # Sort tasks by task_sequence (ensures correct order from 1 to 10)
    sorted_task_data = sorted(task_template_data, key=lambda x: x.task_sequence)
    
    task_map = {}  # Store mapping of sequence number to Task name
    task_list = []  # Store created task names

    for task_data in sorted_task_data:
        task_sequence = task_data.task_sequence  # Get sequence (1-10)
        task_name = task_data.task_subject  # Task name
        task_depends_on = task_data.task_depends_on  # Integer sequence number of dependency
        is_dependent = task_data.is_dependent  # Boolean flag for dependency

        # Check if a task with the same custom_sequence exists
        existing_task_name = frappe.db.get_value("Task", {"custom_sequence": task_sequence, "is_template": 1}, "name")

        if existing_task_name:
            # Fetch the existing Task
            task = frappe.get_doc("Task", existing_task_name)
            task.subject = task_name
            task.is_template = 1
            task.custom_sequence = task_sequence  # Ensure custom_sequence is updated

            # Clear previous dependencies
            task.set("depends_on", [])

            # Resolve dependency (if applicable)
            if is_dependent == 1 and task_depends_on:
                dependent_task_name = frappe.db.get_value("Task", {"custom_sequence": task_depends_on, "is_template": 1}, "name")

                if dependent_task_name:
                    task.append("depends_on", {
                        "doctype": "Task",
                        "task": dependent_task_name,  # Store Task name (not sequence)

                    })

            task.save()
            frappe.db.commit()
            frappe.log_error(f"Task '{task_name}' (Sequence {task_sequence}) updated.", "Task Creation Patch")
        else:
            # Create a new Task document
            task = frappe.get_doc({
                "doctype": "Task",
                "subject": task_name,
                "status": "Template",
                "is_template": 1,
                "custom_sequence": task_sequence,
                "depends_on": []
            })

            # Resolve dependency (if applicable)
            if is_dependent == 1 and task_depends_on:
                dependent_task_name = frappe.db.get_value("Task", {"custom_sequence": task_depends_on, "is_template": 1}, "name")

                if dependent_task_name:
                    task.append("depends_on", {
                        "doctype": "Task",
                        "task": dependent_task_name,  # Store Task name (not sequence)
                    })


            # Insert new Task
            task.insert()
            frappe.db.commit()
            frappe.log_error(f"Task '{task_name}' (Sequence {task_sequence}) created.", "Task Creation Patch")

        # Store the created task's name mapped to its sequence number
        task_map[task_sequence] = task.name  
        task_list.append(task.name)  # Store Task name

    # **Project Template Handling**
    existing_project_template = frappe.db.exists("Project Template", "New Branch Setup")
    
    if not existing_project_template:
        # Create a new Project Template
        project_template = frappe.get_doc({
            "doctype": "Project Template",
            "project_name": "New Branch Setup",
            "tasks": []
        })
        project_template.name = project_template.project_name
    
        # Add tasks with their respective sequence
        for sequence, task_name in task_map.items():
            project_template.append("tasks", {
                "task": task_name,
                "sequence": sequence  # Include the sequence field
            })
    
        project_template.insert()
        frappe.db.commit()
        frappe.log_error("Project Template 'New Branch Setup' created successfully.", "Task Creation Patch")
    else:
        frappe.log_error("Project Template 'New Branch Setup' already exists. Skipping creation.", "Task Creation Patch")
