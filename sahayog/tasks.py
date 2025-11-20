import frappe


def reset_auto_prepared_reports():
    """Reset reports where prepared_report=1"""
    reports = frappe.get_all('Report', filters={'prepared_report': 1}, pluck='name')
    
    if not reports:
        return
    
    for report_name in reports:
        frappe.db.set_value('Report', report_name, 'prepared_report', 0, update_modified=False)
    
    frappe.db.commit()