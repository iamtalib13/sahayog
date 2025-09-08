import frappe
from frappe import _
import requests

# ==============================
# 1️⃣ Employee Data API Function (Dev Site)
# ==============================
@frappe.whitelist(allow_guest=True)
def get_employee_data(limit_start=0, limit_page_length=100):
    """
    Whitelisted API method to fetch Employee data.
    Supports pagination via limit_start & limit_page_length.
    """

    fields = [
        "name", "employee_number", "first_name", "last_name",
        "gender", "date_of_birth", "date_of_joining", "department",
        "designation", "status", "reports_to", "custom_region",
        "custom_zone", "custom_division", "custom_district", "branch"
    ]

    employees = frappe.get_all(
        "Employee",
        fields=fields,
        limit_start=int(limit_start),
        limit_page_length=int(limit_page_length),
        order_by="employee_number asc"
    )

    total_count = frappe.db.count("Employee")

    return {
        "total": total_count,
        "records": employees
    }

# ==============================
# 2️⃣ Sync Function (Dev Site)
# ==============================
# Production site config
PROD_URL = "https://mysahayog.com"  # Production site URL
PROD_HEADERS = {
    # If your prod API is guest-accessible, remove Authorization header
    "Accept": "application/json"
}

BATCH_SIZE = 100

@frappe.whitelist()
def sync_employees():
    """
    Sync Employee data from Production site (mysahayog.com) to this Development site.
    - Inserts new employees
    - Updates existing employees
    """

    start = 0
    total_synced = 0

    while True:
        # 1️⃣ Fetch batch of employees from Production API
        prod_api = f"{PROD_URL}/api/method/your_app.api.employee.get_employee_data"
        params = {
            "limit_start": start,
            "limit_page_length": BATCH_SIZE
        }

        res = requests.get(prod_api, headers=PROD_HEADERS, params=params)
        data = res.json()
        employees = data.get("message", {}).get("records", []) or data.get("message", [])

        if not employees:
            break  # All records fetched

        # 2️⃣ Loop through each employee and insert/update in Dev site
        for emp in employees:
            emp_number = emp.get("employee_number")

            # Check if employee exists in Dev site
            existing = frappe.get_all(
                "Employee",
                filters={"employee_number": emp_number},
                fields=["name"]
            )

            if existing:
                # Update existing employee
                emp_name = existing[0]["name"]
                frappe.db.set_value("Employee", emp_name, emp)
                frappe.db.commit()
                total_synced += 1
                print(f"Updated: {emp_number}")
            else:
                # Insert new employee
                doc = frappe.get_doc({"doctype": "Employee", **emp})
                doc.insert()
                frappe.db.commit()
                total_synced += 1
                print(f"Inserted: {emp_number}")

        start += BATCH_SIZE

    return {"status": "success", "total_synced": total_synced}
