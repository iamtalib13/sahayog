# Copyright (c) 2025, Your Company
# License: MIT

import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    """Define report columns with optimized widths to avoid horizontal scroll"""
    return [
        {
            "fieldname": "name",
            "label": _("Request ID"),
            "fieldtype": "Link",
            "options": "Employee Material Request",
            "width": 80
        },
        {
            "fieldname": "employee",
            "label": _("Emp ID"),
            "fieldtype": "Data",
            "width": 80
        },
        {
            "fieldname": "employee_name",
            "label": _("Employee Name"),
            "fieldtype": "Data",
            "width": 120
        },
        {
            "fieldname": "request_date",
            "label": _("Req Date"),
            "fieldtype": "Date",
            "width": 90
        },
        {
            "fieldname": "request_age_days",
            "label": _("Age (Days)"),
            "fieldtype": "Int",
            "width": 80
        },
        {
            "fieldname": "request_type",
            "label": _("Type"),
            "fieldtype": "Data",
            "width": 86
        },
        {
            "fieldname": "reporting_person",
            "label": _("Reporting Person"),
            "fieldtype": "Data",
            "width": 120
        },
        {
            "fieldname": "reporting_person_status",
            "label": _("RP Status"),
            "fieldtype": "Data",
            "width": 100
        },
        {
            "fieldname": "reporting_person_approval_date",
            "label": _("RP Date"),
            "fieldtype": "Date",
            "width": 90
        },
        {
            "fieldname": "head_office_officer",
            "label": _("HO Officer"),
            "fieldtype": "Data",
            "width": 128
        },
        {
            "fieldname": "ho_officer_status",
            "label": _("HO Status"),
            "fieldtype": "Data",
            "width": 100
        },
        {
            "fieldname": "ho_officer_approval_date",
            "label": _("HO Date"),
            "fieldtype": "Date",
            "width": 100
        }
    ]

def get_data(filters):
    """
    Fetch data based on user role:
    - If user is reporting_person: show only records with valid reporting_person_status
    - If user is head_office_officer: show only records with valid ho_officer_status
    - If user is Administrator: show all records
    """
    
    # Get current logged-in user
    current_user = frappe.session.user
    
    # Check if user is Administrator
    is_admin = current_user == "Administrator"
    
    # Build conditions based on user role
    if is_admin:
        # Administrator sees all records
        conditions = "1=1"
    else:
        # Non-admin users see records where they have a role AND status is Pending/Approved/Rejected/Skip
        conditions = """(
            (
                emr.reporting_person = %(user)s 
                AND emr.reporting_person_status IN ('Pending', 'Approved', 'Rejected', 'Skip')
            )
            OR 
            (
                emr.head_office_officer = %(user)s 
                AND emr.ho_officer_status IN ('Pending', 'Approved', 'Rejected')
            )
        )"""
    
    # Add status filter
    status_filter = ""
    if filters.get("approval_status"):
        if is_admin:
            status_filter = """
                AND (
                    emr.reporting_person_status = %(approval_status)s
                    OR emr.ho_officer_status = %(approval_status)s
                )
            """
        else:
            status_filter = """
                AND (
                    (emr.reporting_person = %(user)s AND emr.reporting_person_status = %(approval_status)s)
                    OR
                    (emr.head_office_officer = %(user)s AND emr.ho_officer_status = %(approval_status)s)
                )
            """
    
    # SQL Query - Make sure all columns are selected in same order as get_columns()
    query = """
        SELECT
            RIGHT(emr.name, 5) as name,
            emr.employee,
            emp.employee_name,
            emr.request_date,
            
            -- Calculate Request Age (Days)
            CASE
                WHEN emr.reporting_person_status = 'Pending' THEN 
                    DATEDIFF(CURDATE(), emr.request_date)
                WHEN emr.reporting_person_status IN ('Approved', 'Rejected', 'Skip') 
                    AND emr.reporting_person_approval_date IS NOT NULL THEN 
                    DATEDIFF(emr.reporting_person_approval_date, emr.request_date)
                ELSE 
                    DATEDIFF(CURDATE(), emr.request_date)
            END as request_age_days,
            
            emr.request_type,
            
            -- Fetch Reporting Person full name from User DocType
            COALESCE(rp_user.full_name, emr.reporting_person) as reporting_person,
            
            emr.reporting_person_status,
            emr.reporting_person_approval_date,
            
            -- Fetch Head Office Officer full name from User DocType
            COALESCE(ho_user.full_name, emr.head_office_officer) as head_office_officer,
            
            emr.ho_officer_status,
            emr.ho_officer_approval_date,
            
            -- Keep full name for link purposes (not displayed in column)
            emr.name as full_name
            
        FROM
            `tabEmployee Material Request` emr
        
        -- Join Employee table to get employee name
        LEFT JOIN
            `tabEmployee` emp ON emr.employee = emp.name
        
        -- Join User table to get Reporting Person full name
        LEFT JOIN
            `tabUser` rp_user ON emr.reporting_person = rp_user.email
        
        -- Join User table to get Head Office Officer full name
        LEFT JOIN
            `tabUser` ho_user ON emr.head_office_officer = ho_user.email
        
        WHERE
            {conditions}
            {status_filter}
        ORDER BY
            emr.request_date DESC
    """.format(conditions=conditions, status_filter=status_filter)
    
    # Execute query
    data = frappe.db.sql(query, {
        "user": current_user,
        "approval_status": filters.get("approval_status")
    }, as_dict=1)
    
    return data
