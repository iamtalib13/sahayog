import frappe

def create_employee_warehouse(doc, method):
    """
    Automatically creates a warehouse when a new Employee is created and links it to the Employee.
    """
    if not doc.employee_number:
        frappe.msgprint(f"⚠️ Skipping Employee '{doc.name}' - No Employee Number assigned.")
        return

    if not doc.branch:
        frappe.msgprint(f"⚠️ Skipping Employee '{doc.name}' - No Branch assigned.")
        return

    # Get Warehouse linked to the Branch
    parent_warehouse = frappe.db.get_value("Branch", doc.branch, "custom_warehouse")

    if not parent_warehouse:
        frappe.msgprint(f"⚠️ No Warehouse found for Branch '{doc.branch}', skipping Employee '{doc.name}'.")
        return

    warehouse_name = doc.employee_number  # Employee warehouse name = Employee Number

    if not frappe.db.exists("Warehouse", warehouse_name):
        warehouse = frappe.get_doc({
            "doctype": "Warehouse",
            "warehouse_name": warehouse_name,
            "parent_warehouse": parent_warehouse,  # Assign under branch warehouse
            "company": frappe.defaults.get_defaults().get("company"),
            "is_group": 0  # Not a group warehouse
        })
        warehouse.insert(ignore_permissions=True)

        # Assign warehouse to Employee using set_value to avoid TimestampMismatchError
        frappe.db.set_value("Employee", doc.name, "custom_emp_warehouse", warehouse.name)

        frappe.msgprint(f"✅ Warehouse '{warehouse_name}' created under '{parent_warehouse}' and linked to Employee '{doc.name}'.")
    else:
        frappe.msgprint(f"⚠️ Warehouse '{warehouse_name}' already exists for Employee '{doc.name}'.")
