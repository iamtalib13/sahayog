import frappe

def execute():
    # Fetch all Report Preference records
    preferences = frappe.get_all("Report Preference", fields=["name"])

    for pref in preferences:
        old_name = pref.name
        new_name = None

        if old_name.startswith("Lead-"):
            new_name = old_name.replace("Lead-", "", 1)
        elif old_name.startswith("Finacle-"):
            new_name = old_name.replace("Finacle-", "", 1)

        if new_name and old_name != new_name:
            if not frappe.db.exists("Report Preference", new_name):
                try:
                    frappe.rename_doc("Report Preference", old_name, new_name, force=True, ignore_if_exists=True)
                except Exception:
                    # In case of any conflict, skip this record
                    pass
            else:
                # If a record with the new name already exists, we might need to merge or delete the old one
                # For safety, let's just log or skip it in this patch.
                pass
