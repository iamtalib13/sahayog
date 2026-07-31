import frappe
from frappe import _


@frappe.whitelist()
def get_emmr_data(status=None, employee=None, department=None, limit_page_length=None, start=0):
    """
    Get Employee Material Request data with items.
    Filters: status, employee, department
    """
    try:
        filters = {"docstatus": ["!=", 2]}

        if status:
            filters["status"] = status
        if employee:
            filters["employee"] = employee
        if department:
            filters["department"] = department

        emr_list = frappe.get_list(
            "Employee Material Request",
            filters=filters,
            fields=[
                "name",
                "employee",
                "status",
                "department",
                "request_date",
                "required_by_date",
                "request_type",
                "reporting_person",
                "reporting_person_status",
                "head_office_officer",
                "ho_officer_status",
                "source_warehouse",
                "target_location",
                "target_warehouse",
                "show_to_purchase",
                "request_from",
            ],
            order_by="creation desc",
            start=start,
            limit_page_length=limit_page_length,
        )

        data = []
        for emr in emr_list:
            items = frappe.get_list(
                "Material Request Items",
                filters={"parent": emr.name},
                fields=["item_code", "description", "approved_quantity"],
            )

            emr["items"] = items
            emr["branch_code"] = None
            emr["location"] = None
            emr["remark"] = None
            data.append(emr)

        return {"data": data}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "EMMR API Error")
        frappe.throw(_("Error fetching EMMR data: {0}").format(str(e)))
