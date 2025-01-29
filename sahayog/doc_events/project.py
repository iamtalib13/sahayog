import frappe

# Global variable to prevent recursion
script_running = False

def update_branch_status(doc, method):
    global script_running

    try:
        # Prevent recursion
        if script_running:
            return
        
        script_running = True  # Set flag to indicate script is running

        # Extract the percent_complete and current custom_branch_status from the passed 'doc'
        percent_complete = doc.percent_complete  # Direct access to the field
        custom_branch_status = None  # Variable to store the updated status
        
        # Determine the status based on percent_complete
        if percent_complete == 0:
            custom_branch_status = "Not Started"
        elif 1 <= percent_complete <= 99:
            custom_branch_status = "Under Development"
        elif percent_complete == 100:
            custom_branch_status = "Live"
        
        # Generate HTML and CSS for the card with a progress ring and animation
        progress_ring = f'''
        <style>
            .progress-card {{
                width: 100%;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }}
            .progress-ring {{
                width: 100px;
                height: 100px;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
            }}
            .progress-ring svg {{
                transform: rotate(-90deg);
            }}
            .background {{
                stroke: #ddd;
                stroke-width: 5;
                fill: none;
            }}
            .foreground {{
                stroke: #4caf50;
                stroke-dasharray: 0, 283;
                stroke-width: 5;
                stroke-linecap: round;
                fill: none;
                animation: increaseProgress {percent_complete / 100 * 2}s linear forwards;
            }}
            @keyframes increaseProgress {{
                0% {{ stroke-dasharray: 0, 283; }}
                100% {{ stroke-dasharray: {percent_complete * 2.83}, 283; }}
            }}
            .progress-text {{
                position: absolute;
                font-size: 18px;
                font-weight: bold;
                color: #333;
            }}
        </style>
        <div class="progress-card">
            <h3 style="text-align: center;">Project Name   : {doc.project_name}</h3>
            <h3 style="text-align: center;">Project Status : {custom_branch_status}</h3>
            <div class="progress-ring">
                <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle class="background" cx="50" cy="50" r="45" />
                    <circle class="foreground" cx="50" cy="50" r="45" />
                </svg>
                <div class="progress-text">
                    {percent_complete}%
                </div>
            </div>
        </div>
        '''

        # Update the custom_branch_status field only if the status has changed
        if custom_branch_status and custom_branch_status != doc.custom_branch_status:
            doc.custom_branch_status = custom_branch_status
            doc.save()  # Save the changes made to the doc
            # Show a custom progress card with percentage and animation
            frappe.msgprint(progress_ring, title=f"Project {doc.name} Status Updated")
            print(f"Updated Project: {doc.name} - Percent Complete: {percent_complete}% - New Status: {custom_branch_status}")
        else:
            # Show a custom progress card with no changes if needed
            frappe.msgprint(progress_ring, title=f"Project {doc.name} Status")
            print(f"No change needed for Project: {doc.name} - Percent Complete: {percent_complete}% - Current Status: {doc.custom_branch_status}")
    
    except Exception as e:
        # Log the error if any exception occurs
        frappe.log_error(message=str(e), title="Error in update_branch_status")
        # Show an error message to the user
        frappe.msgprint(f"An error occurred while updating the project: {str(e)}")
    
    finally:
        # Reset the global flag after execution
        script_running = False
