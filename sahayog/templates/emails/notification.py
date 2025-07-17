import frappe
from frappe.utils import get_url
from datetime import datetime
from collections import defaultdict

def send_department_wise_ticket_summary():
    settings = frappe.get_all("Email Notification Setting", fields=["name", "department"])
    
    for setting in settings:
        dept = setting.department

        # Get emails from child table
        email_docs = frappe.get_all("Email Recipient", 
            filters={"parent": setting.name, "parenttype": "Email Notification Setting"},
            fields=["email"]
        )
        emails = [e.email for e in email_docs if e.email]

        if not emails:
            continue

        # Current datetime
        now = datetime.now().strftime("%d-%m-%y %I:%M %p")

        # Count New tickets
        new_count = frappe.db.count("Sahayog Ticket", {
            "status": "Open",
            "dept_name": dept
        })

        # Fetch In-Progress tickets
        in_progress_tickets = frappe.get_all("Sahayog Ticket",
            filters={"status": "In-Progress", "dept_name": dept},
            fields=["assigned_to_name"]
        )
        pending_count = len(in_progress_tickets)

        if new_count == 0 and pending_count == 0:
            continue

        # Count by user or unassigned
        assigned_user_map = defaultdict(int)
        unassigned_count = 0

        for ticket in in_progress_tickets:
            if ticket.assigned_to_name:
                assigned_user_map[ticket.assigned_to_name] += 1
            else:
                unassigned_count += 1

        assigned_table_rows = ""
        for user, count in assigned_user_map.items():
            assigned_table_rows += f"""
                <tr>
                    <td style="padding: 4px 8px; border: 1px solid #ddd;">👤 {user}</td>
                    <td style="padding: 4px 8px; border: 1px solid #ddd; text-align: center;">{count}</td>
                </tr>
            """
        if unassigned_count > 0:
            assigned_table_rows += f"""
                <tr>
                    <td style="padding: 4px 8px; border: 1px solid #ddd; color: #b91c1c;">⚠️ Unassigned</td>
                    <td style="padding: 4px 8px; border: 1px solid #ddd; text-align: center;">{unassigned_count}</td>
                </tr>
            """

        subject = f"📊 {dept} Department - Ticket Summary (Daily Report)"

        message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #1f2937;">
            <h2 style="color: #0f766e; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                {dept} Department - Ticket Summary
            </h2>
            <p style="margin: 4px 0 16px 0; font-size: 13px; color: #6b7280;">
                🗓️ Generated on: <strong>{now}</strong>
            </p>

            <p style="font-size: 14px;">Here's your daily overview of support tickets:</p>

            <div style="display: flex; gap: 16px; margin-top: 16px;">
                <div style="flex: 1; background-color: #ecfdf5; padding: 16px; border-left: 4px solid #14b8a6; border-radius: 6px;">
                    <h3 style="margin: 0; font-size: 14px; color: #065f46;">🆕 New Tickets</h3>
                    <p style="font-size: 24px; font-weight: bold; margin: 4px 0;">{new_count}</p>
                    <p style="font-size: 12px; color: #4b5563; margin: 0;">(Status: Open)</p>
                </div>
                <div style="flex: 1; background-color: #fff7ed; padding: 16px; border-left: 4px solid #f97316; border-radius: 6px;">
                    <h3 style="margin: 0; font-size: 14px; color: #92400e;">⏳ Pending Tickets</h3>
                    <p style="font-size: 24px; font-weight: bold; margin: 4px 0;">{pending_count}</p>
                    <p style="font-size: 12px; color: #4b5563; margin: 0;">(Status: In-Progress)</p>
                </div>
            </div>

            <div style="margin-top: 24px;">
                <h4 style="font-size: 14px; color: #334155;">📌 Assigned Pending Ticket Breakdown</h4>
                <table style="border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 13px;">
                    <thead style="background-color: #f3f4f6;">
                        <tr>
                            <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">User</th>
                            <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">Ticket Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assigned_table_rows}
                    </tbody>
                </table>
            </div>

            <p style="margin-top: 24px; font-size: 14px;">
                👉 <a href="{get_url()}/app/sahayog-ticket?dept_name={dept}" 
                     style="color: #0f766e; font-weight: 600; text-decoration: none;">
                    View all {dept} tickets
                </a>
            </p>

            <hr style="margin-top: 32px; border-top: 1px solid #e5e7eb;" />

            <p style="font-size: 12px; color: #6b7280;">
                This is an automated summary email from <strong>MySahayog Portal</strong>.
            </p>
        </div>
        """

        frappe.sendmail(
            recipients=emails,
            subject=subject,
            message=message
        )
