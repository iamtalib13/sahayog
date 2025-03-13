# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class IssueRegister(Document):
	pass



@frappe.whitelist(allow_guest=True)
def get_issue_chart_data():
    issues = frappe.db.sql("""
        SELECT prodtech, 
               SUM(CASE WHEN type = 'ISSUE' THEN 1 ELSE 0 END) AS issue_count,
               SUM(CASE WHEN type = 'CR' THEN 1 ELSE 0 END) AS cr_count
        FROM `tabIssue Register`
        WHERE status = 'Open'                   
        GROUP BY prodtech
        ORDER BY (SUM(CASE WHEN type = 'ISSUE' THEN 1 ELSE 0 END) + SUM(CASE WHEN type = 'CR' THEN 1 ELSE 0 END)) DESC
    """, as_dict=True)

    labels = [row["prodtech"] for row in issues]
    issue_values = [row["issue_count"] for row in issues]
    cr_values = [row["cr_count"] for row in issues]

    return {
        "labels": labels,
        "datasets": [
            {"name": "Open Issues", "type": "bar", "values": issue_values},
            {"name": "Open CRs", "type": "bar", "values": cr_values},
        ]
    }


@frappe.whitelist()
def ping():
      return "Pong"

