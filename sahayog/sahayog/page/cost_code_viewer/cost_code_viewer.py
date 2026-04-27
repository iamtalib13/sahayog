import frappe

@frappe.whitelist()
def get_cost_code_details(search_term=None):
    user = frappe.session.user
    # Get employee details
    employee = frappe.db.get_value("Employee", {"user_id": user}, ["name", "employee_name"], as_dict=True)
    
    or_filters = []
    if search_term:
        search_fields = [
            "employee_code", "role", "department", "sub_department", 
            "branch", "district_name", "region", "zone", "cost_code"
        ]
        for field in search_fields:
            or_filters.append([field, "like", f"%{search_term}%"])

    data = frappe.get_all(
        "Employee Cost Code",
        fields=["employee_code", "role", "department", "sub_department", "branch", "district_name", "region", "zone", "cost_code"],
        filters={},
        or_filters=or_filters,
        order_by="modified desc"
    )

    if employee and data:
        data.sort(key=lambda x: str(x.get('employee_code')) != str(employee.name))
    
    return {
        "data": data,
        "employee_name": employee.employee_name if employee else "Guest",
        "employee_id": employee.name if employee else ""
    }
