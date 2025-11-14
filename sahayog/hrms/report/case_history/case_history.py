# Copyright (c) 2025, Your Company
# License: MIT

import frappe
from frappe import _
from frappe.utils import get_fullname, format_datetime, now_datetime, getdate
from frappe.utils import today, getdate, now_datetime, days_diff



def execute(filters=None):
    """
    Main execution function for Case History Report
    Returns columns, data, message, and optional chart
    """
    # Validate required filter
    if not filters or not filters.get("case_id"):
        frappe.msgprint(_("Please select a Case ID to generate the report"))
        return [], [], None

    case_id = filters.get("case_id")

    # Validate case exists
    if not frappe.db.exists("Disciplinary Case", case_id):
        frappe.msgprint(_("Case ID {0} does not exist").format(case_id))
        return [], [], None

    # Get columns
    columns = get_columns(filters)

    # Get case details
    case_doc = frappe.get_doc("Disciplinary Case", case_id)

    # Generate message/header
    message = get_case_details_message(case_doc)

    # Get report data (includes Disciplinary Case + related docs)
    data = get_report_data(filters, case_doc)

    # Sort data
    sort_data(data, filters)

    # Generate chart (optional)
    chart = get_status_chart(data) if data else None

    return columns, data, message, chart


def get_columns(filters):
    """Define report columns"""
    columns = [
       
        {
            "label": _("Document Type"),
            "fieldname": "doctype_name",
            "fieldtype": "Data",
            "width": 180
        },
        {
            "label": _("Document ID"),
            "fieldname": "name",
            "fieldtype": "Dynamic Link",
            "options": "doctype_name",
            "width": 200
        },
        {
            "label": _("Case Age"),
            "fieldname": "case_age",
            "fieldtype": "Data",
            "width": 120
        },
       
        {
            "label": _("Created By"),
            "fieldname": "owner",
            "fieldtype": "Data",
            "width": 150
        },
        {
            "label": _("Created On"),
            "fieldname": "creation",
            "fieldtype": "Datetime",
            "width": 160
        },
        {
            "label": _("Last Modified By"),
            "fieldname": "modified_by",
            "fieldtype": "Data",
            "width": 150
        },
        {
            "label": _("Modified On"),
            "fieldname": "modified",
            "fieldtype": "Datetime",
            "width": 160
        },
        {
            "label": _("Status"),
            "fieldname": "status",
            "fieldtype": "Data",
            "width": 110
        },
    ]

    # Conditionally add version count column
    if filters.get("show_versions"):
        columns.append({
            "label": _("Edits"),
            "fieldname": "version_count",
            "fieldtype": "Int",
            "width": 80
        })

    # Add remarks column
    columns.append({
        "label": _("Remarks"),
        "fieldname": "remarks",
        "fieldtype": "Small Text",
        "width": 250
    })

    return columns


def get_case_details_message(case_doc):
    """Generate HTML message with case details"""
    message = f"""
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; 
                margin-bottom: 20px; border-left: 4px solid #007bff;">
        <h4 style="margin-top: 0; color: #333;">
            📋 Case Details: {case_doc.name}
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                    gap: 15px; margin-top: 15px;">
            <div>
                <strong style="color: #666;">Employee ID:</strong> 
                <span>{case_doc.employee_id or "-"}</span>
            </div>
            <div>
                <strong style="color: #666;">Employee Name:</strong> 
                <span>{case_doc.employee_name or "-"}</span>
            </div>
            <div>
                <strong style="color: #666;">Branch:</strong> 
                <span>{getattr(case_doc, 'branch_name', '-')}</span>
            </div>
            <div>
                <strong style="color: #666;">Designation:</strong> 
                <span>{getattr(case_doc, 'designation', '-')}</span>
            </div>
            <div>
                <strong style="color: #666;">Case Status:</strong> 
                <span style="background: {'#d4edda' if case_doc.status == 'Completed' else '#fff3cd'}; 
                           padding: 3px 10px; border-radius: 4px; font-weight: 600;">
                    {case_doc.status or "-"}
                </span>
            </div>
            <div>
                <strong style="color: #666;">Case Created On:</strong> 
                <span>{format_datetime(case_doc.creation)}</span>
            </div>
            <div>
                <strong style="color: #666;">Case Owner:</strong> 
                <span>{get_fullname(case_doc.owner)}</span>
            </div>
            <div>
                <strong style="color: #666;">Last Modified:</strong> 
                <span>{format_datetime(case_doc.modified)}</span>
            </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; 
                    font-size: 11px; color: #6c757d;">
            <strong>Report Generated:</strong> {format_datetime(now_datetime())} | 
            <strong>Generated By:</strong> {get_fullname(frappe.session.user)}
        </div>
    </div>
    """
    return message


def get_report_data(filters, case_doc):
    """Fetch and process report data"""
    case_id = filters.get("case_id")

    # ✅ IMPORTANT: Add Disciplinary Case as first doctype
    related_doctypes = [
        "Disciplinary Case",  # Parent/Main document
        "Response to SCN",
        "Suspension Process",
        "Domestic Enquiry",
        "Enquiry Reminder",
        "Case Closure",
    ]

    # Filter by specific doctype if selected
    if filters.get("doctype_filter") and filters.get("doctype_filter") != "All":
        related_doctypes = [filters.get("doctype_filter")]

    data = []
    serial_no = 1

    for doctype in related_doctypes:
        # Skip if table doesn't exist
        if not frappe.db.table_exists(doctype):
            continue

        table_cols = frappe.db.get_table_columns(doctype)

        # ✅ For Disciplinary Case, use name field instead of case_id
        if doctype == "Disciplinary Case":
            where_clause = "WHERE name = %(case_id)s"
        else:
            # Skip if no case_id field in child doctypes
            if "case_id" not in table_cols:
                continue
            where_clause = "WHERE case_id = %(case_id)s"

        # Build query with dynamic fields
        remarks_field = "IFNULL(remarks, '') AS remarks" if "remarks" in table_cols else "'' AS remarks"
        workflow_field = "IFNULL(workflow_state, '') AS workflow_state" if "workflow_state" in table_cols else "'' AS workflow_state"
        docstatus_field = "docstatus" if "docstatus" in table_cols else "0 as docstatus"

        # Build base query
        query = f"""
            SELECT
                '{doctype}' AS doctype_name,
                name,
                COALESCE(status, '') AS status,
                {workflow_field},
                owner,
                creation,
                modified_by,
                modified,
                {docstatus_field},
                {remarks_field}
            FROM `tab{doctype}`
            {where_clause}
        """

        # Prepare query parameters
        query_params = {"case_id": case_id}

        # Add date filters conditionally (only for child documents, not main case)
        if doctype != "Disciplinary Case":
            if filters.get("from_date"):
                query += " AND DATE(creation) >= %(from_date)s"
                query_params["from_date"] = getdate(filters.get("from_date"))

            if filters.get("to_date"):
                query += " AND DATE(creation) <= %(to_date)s"
                query_params["to_date"] = getdate(filters.get("to_date"))

        # Execute query
        docs = frappe.db.sql(query, query_params, as_dict=True)
        
		

        if not docs:
            # ✅ Don't show "Not Created" for main Disciplinary Case
            if doctype != "Disciplinary Case":
                data.append({
                    "serial_no": serial_no,
                    "doctype_name": doctype,
                    "name": "Not Created",
                    "status": "-",
                    "workflow_state": "-",
                    "owner": "-",
                    "creation": None,
                    "modified_by": "-",
                    "modified": None,
                    "version_count": 0,
                    "remarks": _("Document not yet created")
                })
                serial_no += 1
        else:
            # Process each document
            for doc in docs:
                
				# Calculate case age
                # Calculate age only if creation date exists
                if doc.get("creation"):
                   creation_date = getdate(doc.creation)
                   today_date = getdate(today())
                   diff_days = days_diff(today_date, creation_date)
                   doc["case_age"] = f"{diff_days} days"
                else:
                   doc["case_age"] = "-"

                                # 🔥 Map docstatus → custom status
                docstatus = doc.get("docstatus", 0)

                if docstatus == 0:
                    display_status = "Pending"
                elif docstatus == 1:
                    display_status = "Completed"
                elif docstatus == 2:
                    display_status = "Pending"
                else:
                    display_status = "-"

                doc["status"] = display_status

                                    
                # Get version count if enabled
                version_count = 0
                if filters.get("show_versions"):
                    version_count = frappe.db.count(
                        "Version",
                        filters={"ref_doctype": doctype, "docname": doc.name}
                    )

                # ✅ Special remarks for main Disciplinary Case
                if doctype == "Disciplinary Case" and not doc.get("remarks"):
                    doc["remarks"] = _("Main disciplinary case record")

                # Update document with enriched data
                doc.update({
                    "serial_no": serial_no,
                    "owner": get_fullname(doc.owner),
                    "modified_by": get_fullname(doc.modified_by),
                    "version_count": version_count,
                })

                data.append(doc)
                serial_no += 1

    return data


def sort_data(data, filters):
    """Sort data based on filter selection"""
    sort_by_field = "creation" if filters.get("sort_by") == "Creation Date" else "modified"

    # ✅ Keep Disciplinary Case always at top, then sort others
    disciplinary_case = [row for row in data if row.get("doctype_name") == "Disciplinary Case"]
    other_docs = [row for row in data if row.get("doctype_name") != "Disciplinary Case"]
    
    # Sort other documents
    other_docs.sort(key=lambda x: (x.get(sort_by_field) is None, x.get(sort_by_field) or ""))
    
    # Combine: Disciplinary Case first, then others
    data.clear()
    data.extend(disciplinary_case)
    data.extend(other_docs)
    
    # Re-number serial numbers
    for idx, row in enumerate(data, start=1):
        row["serial_no"] = idx


def get_status_chart(data):
    """Generate status distribution chart"""
    if not data:
        return None

    # Count documents by status
    status_counts = {}
    for row in data:
        if row.get("name") == "Not Created":
            continue

        status = row.get("status") or "Unknown"
        status_counts[status] = status_counts.get(status, 0) + 1

    if not status_counts:
        return None

    # Create chart data
    chart = {
        "data": {
            "labels": list(status_counts.keys()),
            "datasets": [
                {
                    "name": "Document Count",
                    "values": list(status_counts.values())
                }
            ]
        },
        "type": "donut",
        "height": 250,
        "colors": ["#7cd6fd", "#5e64ff", "#743ee2", "#ff5858", "#ffa00a"]
    }

