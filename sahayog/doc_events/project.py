import frappe

# Global variable to prevent recursion
script_running = False

def update_branch_status(doc, method, status):
    global script_running

    try:
        if script_running:
            return
        script_running = True

        percent_complete = doc.percent_complete
        custom_branch_status = None

        if percent_complete == 0:
            custom_branch_status = "Not Started"
        elif 1 <= percent_complete <= 99:
            custom_branch_status = "Under Development"
        elif percent_complete == 100:
            custom_branch_status = "Live"

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

        if custom_branch_status and custom_branch_status != doc.custom_branch_status:
            doc.custom_branch_status = custom_branch_status
            doc.save()

            if status == "Completed":  # ✅ Show message only when status is 'Completed'
                frappe.msgprint(progress_ring, title=f"Project {doc.name} Status Updated")

        else:
            if status == "Completed":
                frappe.msgprint(progress_ring, title=f"Project {doc.name} Status")

    except Exception as e:
        frappe.log_error(message=str(e), title="Error in update_branch_status")
        frappe.msgprint(f"An error occurred while updating the project: {str(e)}")

    finally:
        script_running = False
