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


@frappe.whitelist()
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
