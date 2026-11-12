import frappe


def execute():
    """Remove the old custom travel request doctype and its workflow.

    We now use HRMS `Travel Request` as the single source of truth.
    The legacy doctype had no records, so this cleanup is safe.
    """
    if frappe.db.exists("Workflow", "Sahayog Travel Request Workflow"):
        frappe.delete_doc(
            "Workflow",
            "Sahayog Travel Request Workflow",
            ignore_permissions=True,
            force=True,
        )

    if frappe.db.exists("DocType", "Sahayog Travel Request"):
        try:
            frappe.delete_doc(
                "DocType",
                "Sahayog Travel Request",
                ignore_permissions=True,
                force=True,
            )
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                "Failed to delete legacy Sahayog Travel Request doctype",
            )
