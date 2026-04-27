import frappe

@frappe.whitelist()
def get_cost_code_details(search_term=None):
    user = frappe.session.user
    # Current user ka employee name/code nikaalte hain
    employee_code = frappe.db.get_value("Employee", {"user_id": user}, "name")
    
    or_filters = []
    if search_term:
        # In sabhi fields me partial match check hoga
        search_fields = [
            "employee_code", "role", "department", "sub_department", 
            "branch", "district_name", "region", "zone", "cost_code"
        ]
        
        for field in search_fields:
            or_filters.append([field, "like", f"%{search_term}%"])

    # Get data using or_filters for partial matching across any field
    data = frappe.get_all(
        "Employee Cost Code",
        fields=["employee_code", "role", "department", "sub_department", "branch", "district_name", "region", "zone", "cost_code"],
        filters={},
        or_filters=or_filters,
        order_by="modified desc"
    )

    # Current user ke records ko hamesha list me top par dikhana
    if employee_code and data:
        # Sort: Current user ka record pehle, baaki sab baad me
        data.sort(key=lambda x: str(x.get('employee_code')) != str(employee_code))
    
    return data
