import frappe
from frappe import _

# ------------------------
# ADD BRANCH
# ------------------------
@frappe.whitelist()
def add_branch():
    data = frappe.form_dict

    # Get fields from request
    sol_id = data.get("sol_id")
    branch = data.get("branch")
    district = data.get("district")
    region = data.get("region")
    zone = data.get("zone")
    state = data.get("state")
    state_code = data.get("state_code")
    email = data.get("email")

    # Validate required fields
    required_fields = ["sol_id", "branch", "district", "region", "zone", "state", "state_code"]
    for field in required_fields:
        if not data.get(field):
            frappe.throw(_(f"{field} is required"), frappe.ValidationError)

    # Check for duplicate sol_id
    if frappe.db.exists("Sahayog Branch", {"sol_id": sol_id}):
        frappe.throw(_("Branch with same sol_id already exists"), frappe.DuplicateEntryError)

    # Create new branch document
    doc = frappe.get_doc({
        "doctype": "Sahayog Branch",
        "sol_id": sol_id,
        "branch": branch,
        "district": district,
        "region": region,
        "zone": zone,
        "state": state,
        "state_code": state_code,
        "email": email
    })

    doc.insert(ignore_permissions=False)
    frappe.db.commit()

    return {
        "status": "success",
        "message": "Branch created successfully",
        "data": {
            "branch_id": doc.name
        }
    }

# ------------------------
# UPDATE BRANCH
# ------------------------
@frappe.whitelist()
def update_branch():
    data = frappe.form_dict
    branch_id = data.get("branch_id")

    if not branch_id:
        frappe.throw(_("branch_id is required"), frappe.ValidationError)

    # Check if branch exists
    if not frappe.db.exists("Sahayog Branch", branch_id):
        frappe.throw(_("Branch not found"), frappe.DoesNotExistError)

    doc = frappe.get_doc("Sahayog Branch", branch_id)

    # Allowed fields for update
    allowed_fields = ["sol_id", "branch", "district", "region", "zone", "state", "state_code", "email"]

    for field in allowed_fields:
        if field in data:
            setattr(doc, field, data.get(field))

    doc.save(ignore_permissions=False)
    frappe.db.commit()

    return {
        "status": "success",
        "message": "Branch updated successfully"
    }
