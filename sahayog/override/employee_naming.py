import frappe
from frappe.model.naming import make_autoname
from frappe import cint

# UPDATED_BY_KIRO_NAMING_FIX

def _get_next_p_number():
    """
    Get the next available P series number by checking actual existing
    employees — avoids duplicate errors caused by tabSeries counter
    going out of sync with the actual data.
    """
    existing = frappe.db.sql("""
        SELECT employee_number
        FROM `tabEmployee`
        WHERE employee_number LIKE 'P%'
    """, as_list=True)

    max_num = 0
    for row in existing:
        emp_num = row[0] or ""
        # Handle both P1 and P.00001 patterns
        num_str = emp_num[2:] if emp_num.startswith("P.") else emp_num[1:]
        try:
            val = cint(num_str)
            if val > max_num:
                max_num = val
        except Exception:
            continue

    next_num = max_num + 1

    # Keep tabSeries in sync so other tools are not confused
    frappe.db.sql("""
        INSERT INTO `tabSeries` (name, current) VALUES ('P.', %s)
        ON DUPLICATE KEY UPDATE current = %s
    """, (next_num, next_num))

    return next_num


def set_name_by_naming_series_override(doc, method=None):
    """Overrides the default naming behavior to set name as employee_number"""

    # Auto-generate 'P' series for Support Staff if employee_number is missing
    if doc.get("custom_is_support_staff") and not doc.employee_number:
        next_num = _get_next_p_number()
        doc.employee_number = f"P{next_num}"

    # If employee_number is set (either manually or by our P-series logic),
    # force it as the document name
    if doc.employee_number:
        doc.name = doc.employee_number
    # If it's NOT a support staff and NO employee_number is provided,
    # we DO NOT set doc.name, allowing Frappe to use the standard HR-EMP series.
