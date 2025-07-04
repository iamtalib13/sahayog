import frappe

def execute():
    workspace_names = [
        "Accounting",
        "Payables",
        "Receivables",
        "GST India",
        "Financial Reports",
        "Buying",
        "Selling",
        "Stock",
        "Assets",
        "HR",
        "Recruitment",
        "Employee Lifecycle",
        "Performance",
        "Shift & Attendance",
        "Expense Claims",
        "Leaves",
        "Manufacturing",
        "Quality",
        "Projects",
        "Support",
        "Users",
        "Website",
        "Payroll",
        "Salary Payout",
        "CRM",
        "Tools",
        "ERPNext Settings",
        "Integrations",
        "ERPNext Integrations",
        "Build",
        "Home",
        "LMS"
    ]

    for name in workspace_names:
        try:
            ws = frappe.get_doc("Workspace", name)
            roles = [d.role for d in ws.roles]

            if "System Manager" not in roles:
                ws.append("roles", {"role": "System Manager"})
                ws.save(ignore_permissions=True)
                frappe.db.commit()
        except:
            pass
