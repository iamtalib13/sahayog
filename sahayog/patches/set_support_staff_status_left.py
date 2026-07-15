import frappe


def execute():
    employees = frappe.db.get_all(
        "Employee",
        filters={
            "custom_is_support_staff": 1,
            "resignation_letter_date": ["is", "set"],
            "relieving_date": ["is", "set"],
            "status": ["!=", "Left"],
        },
        pluck="name",
    )

    if not employees:
        return

    for emp in employees:
        frappe.db.set_value("Employee", emp, "status", "Left")

    frappe.db.commit()
