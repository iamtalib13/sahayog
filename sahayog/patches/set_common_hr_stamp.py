import frappe


def execute():
    """Ensure Sahayog HR Setting carries the common HR stamp used by DAMS
    print formats (Disciplinary Case Notice / Show Cause Notice).

    The stamp image lives at /assets/sahayog/images/stamp-1.png (copied to
    sites/assets on migrate). The setting is a Single doctype value, so it is
    NOT carried by fixture sync — set it here so production reflects it after
    a plain `bench migrate`.
    """
    stamp_path = "/assets/sahayog/images/stamp-1.png"

    current = frappe.db.get_single_value("Sahayog HR Setting", "common_hr_stamp")
    if current:
        print(f"common_hr_stamp already set ({current}); leaving as-is.")
        return

    if not frappe.db.exists("Sahayog HR Setting"):
        print("Sahayog HR Setting not found; skipping.")
        return

    frappe.db.set_single_value("Sahayog HR Setting", "common_hr_stamp", stamp_path)
    frappe.db.commit()
    print(f"Set common_hr_stamp = {stamp_path}")
