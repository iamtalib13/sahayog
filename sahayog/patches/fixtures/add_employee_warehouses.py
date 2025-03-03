import frappe
from frappe import enqueue

@frappe.whitelist()
def start_employee_warehouse_creation():
    """
    Enqueue Background Job to Create Employee Warehouses
    """
    enqueue(create_warehouses_for_all_employees, queue="long", timeout=3600)
    return {"message": "✅ Background Job Started! Check logs for progress."}

def create_warehouses_for_all_employees():
    """
    Background Job: Sare Employees ke Warehouses Create aur Assign karega
    """
    employees = frappe.get_all("Employee", fields=["name", "employee_number", "branch"])
    
    if not employees:
        frappe.logger().info("❌ No Employees Found!")
        return

    created_warehouses = []
    skipped_count = 0

    for emp in employees:
        employee_name = emp["name"]
        employee_number = emp["employee_number"]
        branch_name = emp["branch"]

        if not branch_name or not employee_number:
            frappe.logger().info(f"⚠️ Skipping Employee {employee_name}: Missing Branch/Employee Number")
            skipped_count += 1
            continue

        # Get Warehouse linked to the Branch
        parent_warehouse = frappe.get_value("Branch", branch_name, "custom_warehouse")

        if not parent_warehouse:
            frappe.logger().info(f"⚠️ Skipping {employee_name}: No Warehouse Found for Branch {branch_name}")
            skipped_count += 1
            continue

        warehouse_name = employee_number  # Employee warehouse name = Employee Number

        if not frappe.db.exists("Warehouse", warehouse_name):
            warehouse = frappe.get_doc({
                "doctype": "Warehouse",
                "warehouse_name": warehouse_name,
                "parent_warehouse": parent_warehouse,
                "company": frappe.defaults.get_defaults().get("company"),
                "is_group": 0  # Not a group warehouse
            })
            warehouse.insert(ignore_permissions=True)
            created_warehouses.append(warehouse_name)

            # Assign created warehouse to Employee
            frappe.db.set_value("Employee", employee_name, "custom_emp_warehouse", warehouse_name)

    frappe.db.commit()
    frappe.logger().info(f"✅ {len(created_warehouses)} Employee Warehouses Created! Skipped: {skipped_count}")
