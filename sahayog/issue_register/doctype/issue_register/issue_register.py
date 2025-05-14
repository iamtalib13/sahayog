# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import frappe.utils


class IssueRegister(Document):
    def validate(self):
        # Ensure solved_date is mandatory before closing
        if self.status == "Closed" and not self.solved_date:
            frappe.throw("Solved Date is required before closing the issue.")

        # Ensure assigned_date is not in the future
        if self.assigned_date:
            if self.assigned_date > frappe.utils.today():
                frappe.throw("Assign Date cannot be a future date.")
            if self.testing_date and self.assigned_date < self.testing_date:
                frappe.throw("Assign Date cannot be before Testing Date.")

        # Ensure solved_date is not before assigned_date and not in the future
        if self.solved_date:
            if self.assigned_date and self.solved_date < self.assigned_date:
                frappe.throw("Solved Date cannot be before Assign Date.")
            if self.solved_date > frappe.utils.today():
                frappe.throw("Solved Date cannot be a future date.")

        # Ensure testing_date is between assigned_date and solved_date
        if self.testing_date:
            if self.assigned_date and self.testing_date > self.assigned_date:
                frappe.throw("Testing Date cannot be after Assign Date.")
            if self.solved_date and self.testing_date > self.solved_date:
                frappe.throw("Testing Date cannot be after Solved Date.")
            if self.testing_date > frappe.utils.today():
                frappe.throw("Testing Date cannot be a future date.")

   


#For Prodtech analysis
@frappe.whitelist(allow_guest=True)
def get_issue_chart_data():
    issues = frappe.db.sql("""
        SELECT prodtech, 
               SUM(CASE WHEN type = 'ISSUE' THEN 1 ELSE 0 END) AS issue_count,
               SUM(CASE WHEN type = 'CR' THEN 1 ELSE 0 END) AS cr_count
        FROM `tabIssue Register`
        WHERE status = 'Open' AND team = 'Prodtech' AND prodtech IS NOT NULL                
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

#For ERPTech analysis
@frappe.whitelist(allow_guest=True)
def get_issue_chart_data_erp():
    issues = frappe.db.sql("""
        SELECT prodtech, 
               SUM(CASE WHEN type = 'ISSUE' THEN 1 ELSE 0 END) AS issue_count,
               SUM(CASE WHEN type = 'CR' THEN 1 ELSE 0 END) AS cr_count
        FROM `tabIssue Register`
        WHERE status = 'Open' AND team = 'Erptech' AND prodtech IS NOT NULL             
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