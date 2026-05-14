import frappe

@frappe.whitelist()
def get_cost_code_details(search_term=None, start=0, page_length=20):
    user = frappe.session.user
    employee = frappe.db.get_value("Employee", {"user_id": user}, ["name", "employee_name"], as_dict=True)
    employee_code = employee.name if employee else None
    
    start = int(start)
    page_length = int(page_length)
    
    # Common search logic
    or_filters = []
    if search_term:
        search_fields = ["employee_code", "role", "department", "sub_department", "branch", "district_name", "region", "zone", "cost_code"]
        for field in search_fields:
            or_filters.append([field, "like", f"%{search_term}%"])

    # 1. Get IDs of all records belonging to the current user (that match search)
    user_record_ids = []
    if employee_code:
        user_record_ids = frappe.get_all(
            "Employee Cost Code", 
            filters={"employee_code": employee_code}, 
            or_filters=or_filters, 
            pluck="name",
            order_by="modified desc"
        )

    # 2. Get IDs of all other records (that match search)
    other_record_ids = frappe.get_all(
        "Employee Cost Code",
        filters={"employee_code": ["!=", employee_code]} if employee_code else {},
        or_filters=or_filters,
        pluck="name",
        order_by="modified desc"
    )

    # Combine IDs: User's first, then others
    all_ids = user_record_ids + other_record_ids
    total_count = len(all_ids)
    
    # Slice IDs for pagination
    paged_ids = all_ids[start : start + page_length]
    
    # Fetch full data for the paged IDs
    data = []
    if paged_ids:
        # Fetching individually or using IN clause while maintaining order
        raw_data = frappe.get_all(
            "Employee Cost Code",
            fields=["name", "employee_code", "role", "department", "sub_department", "branch", "district_name", "region", "zone", "cost_code"],
            filters={"name": ["in", paged_ids]}
        )
        # Sort data to match the order of paged_ids
        data_map = {d.name: d for d in raw_data}
        data = [data_map[name] for name in paged_ids if name in data_map]

    return {
        "data": data,
        "total_count": total_count,
        "employee_name": employee.employee_name if employee else "Guest",
        "employee_id": employee_code or ""
    }
