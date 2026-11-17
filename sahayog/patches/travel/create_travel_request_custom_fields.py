import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    """Minimal policy fields on the HRMS Travel Request doctype.

    We intentionally do NOT add Employee Grade / Base Office yet because the
    Employee master data for those fields is empty. Reporting Manager is added
    because the approval workflow needs it; it is fetched from
    `Employee.reports_to` and can be selected manually when reports_to is blank.
    """
    create_custom_fields(
        {
            "Travel Request": [
                {
                    "fieldname": "travel_details_section",
                    "fieldtype": "Section Break",
                    "label": "Travel Details",
                    "insert_after": "passport_number",
                },
                {
                    "fieldname": "from_city",
                    "fieldtype": "Data",
                    "label": "From City",
                    "reqd": 1,
                    "in_list_view": 1,
                    "insert_after": "travel_details_section",
                },
                {
                    "fieldname": "to_city",
                    "fieldtype": "Data",
                    "label": "To City",
                    "reqd": 1,
                    "in_list_view": 1,
                    "insert_after": "from_city",
                },
                {
                    "fieldname": "departure_date",
                    "fieldtype": "Date",
                    "label": "Departure Date",
                    "reqd": 1,
                    "in_list_view": 1,
                    "insert_after": "to_city",
                },
                {
                    "fieldname": "column_break_travel_details",
                    "fieldtype": "Column Break",
                    "insert_after": "departure_date",
                },
                {
                    "fieldname": "return_date",
                    "fieldtype": "Date",
                    "label": "Return Date",
                    "insert_after": "column_break_travel_details",
                },
                {
                    "fieldname": "mode_of_travel",
                    "fieldtype": "Select",
                    "label": "Mode of Travel",
                    "options": "Train\nBus\nOwn Car\nCab\nAir\nBike",
                    "reqd": 1,
                    "insert_after": "return_date",
                },
                {
                    "fieldname": "estimated_travel_cost",
                    "fieldtype": "Currency",
                    "label": "Estimated Travel Cost",
                    "insert_after": "mode_of_travel",
                },
                {
                    "fieldname": "reporting_manager",
                    "fieldtype": "Link",
                    "label": "Reporting Manager",
                    "options": "Employee",
                    "reqd": 1,
                    "fetch_from": "employee.reports_to",
                    # Many employees have a User Permission on their own Employee
                    # record. Without this flag the manager link fails the
                    # document-level permission check.
                    "ignore_user_permissions": 1,
                    "insert_after": "estimated_travel_cost",
                },
                {
                    "fieldname": "advance_section",
                    "fieldtype": "Section Break",
                    "label": "Advance Details",
                    "insert_after": "reporting_manager",
                },
                {
                    "fieldname": "advance_required",
                    "fieldtype": "Check",
                    "label": "Advance Required",
                    "default": "0",
                    "insert_after": "advance_section",
                },
                {
                    "fieldname": "column_break_advance",
                    "fieldtype": "Column Break",
                    "insert_after": "advance_required",
                },
                {
                    "fieldname": "advance_amount",
                    "fieldtype": "Currency",
                    "label": "Advance Amount",
                    "depends_on": "eval:doc.advance_required",
                    "insert_after": "column_break_advance",
                },
                {
                    "fieldname": "advance_justification",
                    "fieldtype": "Small Text",
                    "label": "Advance Justification",
                    "depends_on": "eval:doc.advance_required",
                    "insert_after": "advance_amount",
                },
                {
                    "fieldname": "deviation_section",
                    "fieldtype": "Section Break",
                    "label": "Policy Deviation",
                    "insert_after": "advance_justification",
                },
                {
                    "fieldname": "deviation_requested",
                    "fieldtype": "Check",
                    "label": "Deviation Requested",
                    "default": "0",
                    "insert_after": "deviation_section",
                },
                {
                    "fieldname": "column_break_deviation",
                    "fieldtype": "Column Break",
                    "insert_after": "deviation_requested",
                },
                {
                    "fieldname": "deviation_reason",
                    "fieldtype": "Small Text",
                    "label": "Deviation Reason",
                    "depends_on": "eval:doc.deviation_requested",
                    "insert_after": "column_break_deviation",
                },
                {
                    "fieldname": "approval_section",
                    "fieldtype": "Section Break",
                    "label": "Approval Details",
                    "insert_after": "deviation_reason",
                },
                {
                    "fieldname": "approver_remarks",
                    "fieldtype": "Small Text",
                    "label": "Approver Remarks",
                    "insert_after": "approval_section",
                },
            ]
        },
        update=True,
    )

    # The workflow auto-creates a hidden `workflow_state` custom field.
    # Give it a default so a brand-new request starts in Draft.
    if frappe.db.exists(
        "Custom Field", {"dt": "Travel Request", "fieldname": "workflow_state"}
    ):
        frappe.db.set_value(
            "Custom Field",
            {"dt": "Travel Request", "fieldname": "workflow_state"},
            "default",
            "Draft",
        )

    frappe.clear_cache(doctype="Travel Request")
