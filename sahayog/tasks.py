import frappe


def reset_auto_prepared_reports():
    """Reset reports where prepared_report=1"""
    reports = frappe.get_all('Report', filters={'prepared_report': 1}, pluck='name')
    
    if not reports:
        return
    
    for report_name in reports:
        frappe.db.set_value('Report', report_name, 'prepared_report', 0, update_modified=False)
    
    frappe.db.commit()



@frappe.whitelist()
def sync_district_state():
    # Fetch unique district and state
    data = frappe.db.sql("""
        SELECT DISTINCT district, state
        FROM `tabSahayog Branch`
        WHERE district IS NOT NULL AND state IS NOT NULL
    """, as_dict=True)

    for row in data:
        district = row.get("district")
        state = row.get("state")

        # Create State if not exists
        if state and not frappe.db.exists("State", state):
            doc = frappe.new_doc("State")
            doc.state = state          # field
            doc.name = state           # required for naming series = field: state
            doc.insert(ignore_permissions=True)

        # Create District if not exists
        if district and not frappe.db.exists("District", district):
            doc = frappe.new_doc("District")
            doc.district = district    # field
            doc.state = state          # link to state
            doc.name = district        # required for naming series = field: district
            doc.insert(ignore_permissions=True)


def auto_approve_attendance_corrections():
    """Auto-approve all pending attendance correction requests."""
    pending_corrections = frappe.get_all(
        "Attendance Correction",
        filters={"status": "Pending"},
        fields=["name"]
    )
    
    for correction in pending_corrections:
        try:
            doc = frappe.get_doc("Attendance Correction", correction.name)
            doc.status = "Approved"
            doc.approved_by = "Administrator"
            doc.approval_date = frappe.utils.now_datetime()
            # Calling save() will trigger the on_update method in AttendanceCorrection,
            # which in turn calls apply_correction()
            doc.save(ignore_permissions=True)
            frappe.db.commit()
        except Exception as e:
            frappe.log_error(f"Failed to auto-approve Attendance Correction {correction.name}: {str(e)}", "Auto-Approval Error")
    
    return f"Processed {len(pending_corrections)} attendance correction requests."



# def notify_inactive_ss():
#     """
#     Daily job: find agents with no call log activity for 90+ days.
#     Uncomment and register in hooks.py daily scheduler to enable.
#     """
#     inactive_agents = frappe.db.sql(
#         """
#         SELECT
#             a.name AS agent_code,
#             a.agent_name,
#             a.branch_name,
#             MAX(acl.calling_date) AS last_call_date,
#             DATEDIFF(CURDATE(), MAX(acl.calling_date)) AS days_since_last_call
#         FROM `tabAgent` a
#         LEFT JOIN `tabAgent Activation Call Log` acl
#             ON acl.agent = a.name AND acl.docstatus = 1
#         WHERE a.name NOT IN (
#             SELECT agent FROM `tabAgent Activation Call Log`
#             WHERE docstatus = 1 AND (exited = 1 OR want_to_exit = 1)
#             AND agent IS NOT NULL
#         )
#         GROUP BY a.name, a.agent_name, a.branch_name
#         HAVING last_call_date IS NULL
#             OR DATEDIFF(CURDATE(), MAX(acl.calling_date)) >= 90
#         ORDER BY days_since_last_call DESC
#         """,
#         as_dict=True,
#     )
#     if not inactive_agents:
#         return
#     trainer_heads = frappe.get_all(
#         "Has Role", filters={"role": "Trainer Head", "parenttype": "User"}, pluck="parent"
#     )
#     if not trainer_heads:
#         return
#     rows = "".join(
#         f"<tr><td>{a.agent_code}</td><td>{a.agent_name}</td><td>{a.branch_name or '-'}</td>"
#         f"<td>{a.last_call_date or 'Never'}</td><td>{a.days_since_last_call or '90+'}</td></tr>"
#         for a in inactive_agents
#     )
#     message = f"""
#         <p>{len(inactive_agents)} SS(s) inactive for 90+ days.</p>
#         <table border="1" cellpadding="4">
#             <thead><tr><th>Code</th><th>Name</th><th>Branch</th><th>Last Call</th><th>Days</th></tr></thead>
#             <tbody>{rows}</tbody>
#         </table>
#     """
#     for user in trainer_heads:
#         frappe.sendmail(
#             recipients=[user],
#             subject=f"Inactive SS Alert — {len(inactive_agents)} SS(s) inactive for 90+ days",
#             message=message,
#         )
