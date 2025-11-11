import frappe

def execute(filters=None):
    if not filters or not filters.get("case_id"):
        return [], []

    case_id = filters.get("case_id")

    # Fetch main case details
    case_doc = frappe.get_doc("Disciplinary Case", case_id)

    # Employee / Case details to show at top
    message = f"""
    <div>
        <strong>Employee ID:</strong> {case_doc.employee_id or ""} &nbsp;&nbsp;
        <strong>Employee Name:</strong> {case_doc.employee_name or ""} &nbsp;&nbsp;
        <strong>Branch:</strong> {getattr(case_doc,'branch_name','')} &nbsp;&nbsp;
        <strong>Designation:</strong> {getattr(case_doc,'designation','')} &nbsp;&nbsp;
        <strong>Status:</strong> {case_doc.status or ""}
    </div>
    """

    related_doctypes = [
        
        "Response to SCN",
        "Suspension Process",
        "Domestic Enquiry",
        "Enquiry Reminder",
        "Case Closure",
    ]

    columns = [
        {"label": "Doctype", "fieldname": "doctype_name", "fieldtype": "Data", "width": 180},
        {"label": "Document ID", "fieldname": "name", "fieldtype": "Dynamic Link", "options": "doctype_name", "width": 180},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Created By", "fieldname": "owner", "fieldtype": "Data", "width": 150},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Datetime", "width": 160},
        {"label": "Last Modified By", "fieldname": "modified_by", "fieldtype": "Data", "width": 150},
        {"label": "Modified On", "fieldname": "modified", "fieldtype": "Datetime", "width": 160},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Data", "width": 200},
    ]

    data = []

    for doctype in related_doctypes:
        if not frappe.db.table_exists(doctype):
            continue

        table_cols = frappe.db.get_table_columns(doctype)
        if "case_id" not in table_cols:
            continue

        # Use remarks column if it exists
        remarks_field = "IFNULL(remarks, '') AS remarks" if "remarks" in table_cols else "'' AS remarks"

        query = f"""
            SELECT
                '{doctype}' AS doctype_name,
                name,
                COALESCE(status, '') AS status,
                owner,
                creation,
                modified_by,
                modified,
                {remarks_field}
            FROM `tab{doctype}`
            WHERE case_id = %s
        """

        docs = frappe.db.sql(query, (case_id,), as_dict=True)

        if not docs:
            data.append({
                "doctype_name": doctype,
                "name": "Not Created",
                "status": "-",
                "owner": "-",
                "creation": None,
                "modified_by": "-",
                "modified": None,
                "remarks": "Document not yet created"
            })
        else:
            data.extend(docs)

    # Sort based on filters
    sort_by_field = "creation" if filters.get("sort_by") == "Creation Date" else "modified"

    # Sort data
    data.sort(key=lambda x: (x.get(sort_by_field) is None, x.get(sort_by_field)))

    # Return columns, data, and message
    return columns, data, message
