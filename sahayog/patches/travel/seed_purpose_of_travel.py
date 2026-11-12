import frappe

# Travel Request -> Purpose of Travel is a Link field. Without master records
# employees cannot create a request, so seed the common purposes.
PURPOSES = (
    "Official Work",
    "Client / Business Meeting",
    "Training / Workshop",
    "Audit / Inspection",
    "Recruitment",
    "Branch Visit",
    "Other",
)


def execute():
    for purpose in PURPOSES:
        if not frappe.db.exists("Purpose of Travel", purpose):
            frappe.get_doc(
                {
                    "doctype": "Purpose of Travel",
                    "purpose_of_travel": purpose,
                }
            ).insert(ignore_permissions=True)
