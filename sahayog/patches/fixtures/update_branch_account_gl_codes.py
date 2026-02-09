import frappe

def execute():
    """
    One-time patch to generate gl_sub_code for all Branch Petty Cash Accounts
    """
    accounts = frappe.get_all("Branch Petty Cash Account", fields=["name", "branch"])

    account_suffix = "01390200001"
    
    for acc in accounts:
        if acc.branch:
            gl_code = f"{acc.branch}{account_suffix}"
            frappe.db.set_value("Branch Petty Cash Account", acc.name, "gl_sub_code", gl_code, update_modified=False)
            print(f"✓ Updated {acc.name} (Branch: {acc.branch}) -> {gl_code}")
        else:
            print(f"⚠ Skipped {acc.name} (No branch assigned)")

    frappe.db.commit()
