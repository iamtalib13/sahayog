import io
import pandas as pd
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, date_diff

class AuditandCompliance(Document):
    def autoname(self):
        if not (self.sol_id and self.branch_name and self.year):
            frappe.throw(
                _("SOL ID, Branch Name, and Year are mandatory fields required to generate the record name.")
            )
        self.name = f"{self.sol_id} - {self.branch_name} - {self.year}"
        
    def validate(self):
        if self.year:
            self.year = str(self.year).split('-')[0].strip()

        # Audit Closure Table Backend Handling
        if self.audit_closure_table:
            for row in self.audit_closure_table:
                if not row.recived_date:
                    row.delay_in_closure = "Awaiting Receipt Date"
                    row.compliance_report = "Pending"
                elif row.report_published_date and row.recived_date:
                    if getdate(row.recived_date) < getdate(row.report_published_date):
                        frappe.throw(
                            _("Row {0}: Received Date cannot be earlier than Report Published Date in Audit Closure Delay Table.").format(row.idx)
                        )
                    row.delay_in_closure = str(date_diff(row.recived_date, row.report_published_date))
                    row.compliance_report = "Received"

        # COM Visit Compliance Backend Handling & Validation
        if self.com_visit_compliance:
            for row in self.com_visit_compliance:
                if not row.date_of_closure:
                    row.status = "Pending"
                    row.turnaround_time_days = "Awaiting date of closure"
                elif row.date_of_publish and row.date_of_closure:
                    if getdate(row.date_of_closure) < getdate(row.date_of_publish):
                        frappe.throw(
                            _("Row {0}: Date of Closure ({1}) cannot be earlier than Date of Publish ({2}) in COM Visit Compliance Table.").format(
                                row.idx, row.date_of_closure, row.date_of_publish
                            )
                        )
                    row.turnaround_time_days = str(date_diff(row.date_of_closure, row.date_of_publish))
                    row.status = "Completed"

def generate_excel_response(columns, filename, sheet_name):
    df = pd.DataFrame(columns=columns)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name=sheet_name)
    output.seek(0)
    
    frappe.response['filename'] = filename
    frappe.response['filecontent'] = output.getvalue()
    frappe.response['type'] = 'binary'


def get_financial_year(dt):
    """Returns 4-digit Year format (e.g., 2026)"""
    return dt.strftime("%Y")


@frappe.whitelist()
def download_audit_score_template():
    columns = ["Branch Code", "Audit Start Date", "Audit Completed Date", "Branch Score"]
    generate_excel_response(columns, "Audit_Score_Template.xlsx", "Audit Score")


@frappe.whitelist()
def download_audit_closure_template():
    columns = ["Branch Code", "Report Published Date", "Received Date"]
    generate_excel_response(columns, "Audit_Closure_Template.xlsx", "Audit Closure Delay")


@frappe.whitelist()
def download_com_visit_template():
    columns = ["Branch Code", "Date of Visit", "Visit Score", "Last Visit Score"]
    generate_excel_response(columns, "Com_Visit_Template.xlsx", "Com Visit")


@frappe.whitelist()
def download_com_visit_compliance_template():
    columns = ["Branch Code", "Date of publish", "Date of closure"]
    generate_excel_response(columns, "COM_Visit_Compliance_Template.xlsx", "COM Visit Compliance")

@frappe.whitelist()
def process_audit_score_excel(file_url):
    if not file_url:
        frappe.throw(_("Please upload a valid Excel file."))

    # Get file content from Frappe File system
    file_doc = frappe.get_doc("File", {"file_url": file_url})
    file_path = file_doc.get_full_path()

    # Read Excel sheet
    df = pd.read_excel(file_path)

    # Validate essential columns
    required_cols = ["Branch Code", "Audit Start Date", "Branch Score"]
    for col in required_cols:
        if col not in df.columns:
            frappe.throw(_("Excel file is missing required column: {0}").format(col))

    created_records = set()
    updated_records = set()

    for idx, row in df.iterrows():
        sol_id = str(row["Branch Code"]).strip() if pd.notnull(row["Branch Code"]) else None
        if not sol_id:
            continue

        # Parse Audit Start Date
        if pd.isnull(row["Audit Start Date"]):
            continue

        raw_start_date = pd.to_datetime(row["Audit Start Date"])
        audit_start_date = raw_start_date.strftime("%Y-%m-%d")

        # Extract Month Name and Financial Year
        month_name = raw_start_date.strftime("%B")  # e.g., 'April', 'May'
        financial_year = get_financial_year(raw_start_date)

        # Parse Audit Completed Date if present
        audit_completed_date = None
        if pd.notnull(row.get("Audit Completed Date")):
            audit_completed_date = pd.to_datetime(row["Audit Completed Date"]).strftime("%Y-%m-%d")
            audit_status = "Completed"
        else:
            audit_status = "Pending"

        # Fetch Branch Name from 'Sahayog Branch' using SOL ID
        branch_name = frappe.db.get_value("Sahayog Branch", sol_id, "branch") or "Unknown"

        # Construct parent record name: SOL ID - Branch Name - FY
        parent_name = f"{sol_id} - {branch_name} - {financial_year}"

        # Fetch or Create Parent Document
        if frappe.db.exists("Audit and Compliance", parent_name):
            doc = frappe.get_doc("Audit and Compliance", parent_name)
            updated_records.add(parent_name)
        else:
            doc = frappe.get_doc({
                "doctype": "Audit and Compliance",
                "sol_id": sol_id,
                "branch_name": branch_name,
                "year": financial_year,
                "audit_score_table": []
            })
            doc.insert(ignore_permissions=True)
            created_records.add(parent_name)

        # Check if row for this month already exists to avoid duplicates
        existing_row = None
        for child_row in doc.audit_score_table:
            if child_row.month == month_name:
                existing_row = child_row
                break

        row_data = {
            "month": month_name,
            "audit_start_date": audit_start_date,
            "audit_status": audit_status,
            "audit_completed_date": audit_completed_date,
            "branch_score": float(row["Branch Score"]) if pd.notnull(row["Branch Score"]) else 0.0
        }

        if existing_row:
            existing_row.update(row_data)
        else:
            doc.append("audit_score_table", row_data)

        doc.save(ignore_permissions=True)

    frappe.db.commit()

    summary_msg = _("Processing Complete!<br><b>Created Parent Records:</b> {0}<br><b>Updated Parent Records:</b> {1}").format(
        len(created_records), len(updated_records)
    )

    return {"status": "success", "message": summary_msg}

###################################################################

@frappe.whitelist()
def process_audit_closure_excel(file_url):
    if not file_url:
        frappe.throw(_("Please upload a valid Excel file."))

    file_doc = frappe.get_doc("File", {"file_url": file_url})
    file_path = file_doc.get_full_path()

    df = pd.read_excel(file_path)

    required_cols = ["Branch Code", "Report Published Date"]
    for col in required_cols:
        if col not in df.columns:
            frappe.throw(_("Excel file is missing required column: {0}").format(col))

    created_records = set()
    updated_records = set()

    for idx, row in df.iterrows():
        sol_id = str(row["Branch Code"]).strip() if pd.notnull(row["Branch Code"]) else None
        if not sol_id:
            continue

        if pd.isnull(row["Report Published Date"]):
            continue

        report_published_dt = pd.to_datetime(row["Report Published Date"])
        report_published_date = report_published_dt.strftime("%Y-%m-%d")

        month_name = report_published_dt.strftime("%B")
        financial_year = get_financial_year(report_published_dt)

        recived_date = None
        
        if pd.notnull(row.get("Received Date")):
            recived_dt = pd.to_datetime(row["Received Date"])
            recived_date = recived_dt.strftime("%Y-%m-%d")
            delay_in_closure = str((recived_dt - report_published_dt).days)
            compliance_report_status = "Received"
        else:
            compliance_report_status = "Pending"
            delay_in_closure = "Awaiting Receipt Date"

        branch_name = frappe.db.get_value("Sahayog Branch", sol_id, "branch") or "Unknown"
        parent_name = f"{sol_id} - {branch_name} - {financial_year}"

        if frappe.db.exists("Audit and Compliance", parent_name):
            doc = frappe.get_doc("Audit and Compliance", parent_name)
            updated_records.add(parent_name)
        else:
            doc = frappe.get_doc({
                "doctype": "Audit and Compliance",
                "sol_id": sol_id,
                "branch_name": branch_name,
                "year": financial_year,
                "audit_closure_table": []
            })
            doc.insert(ignore_permissions=True)
            created_records.add(parent_name)

        existing_row = None
        for child_row in doc.audit_closure_table:
            if child_row.month == month_name:
                existing_row = child_row
                break

        row_data = {
            "month": month_name,
            "report_published_date": report_published_date,
            "compliance_report": compliance_report_status,
            "recived_date": recived_date,
            "delay_in_closure": delay_in_closure
        }

        if existing_row:
            existing_row.update(row_data)
        else:
            doc.append("audit_closure_table", row_data)

        doc.save(ignore_permissions=True)

    frappe.db.commit()

    summary_msg = _("Processing Complete!<br><b>Created Parent Records:</b> {0}<br><b>Updated Parent Records:</b> {1}").format(
        len(created_records), len(updated_records)
    )

    return {"status": "success", "message": summary_msg}

###################################################################

@frappe.whitelist()
def process_com_visit_excel(file_url):
    if not file_url:
        frappe.throw(_("Please upload a valid Excel file."))

    file_doc = frappe.get_doc("File", {"file_url": file_url})
    file_path = file_doc.get_full_path()

    df = pd.read_excel(file_path)

    # Validate essential columns
    required_cols = ["Branch Code", "Date of Visit", "Visit Score", "Last Visit Score"]
    for col in required_cols:
        if col not in df.columns:
            frappe.throw(_("Excel file is missing required column: {0}").format(col))

    created_records = set()
    updated_records = set()

    for idx, row in df.iterrows():
        sol_id = str(row["Branch Code"]).strip() if pd.notnull(row["Branch Code"]) else None
        if not sol_id:
            continue

        if pd.isnull(row["Date of Visit"]):
            continue

        raw_visit_date = pd.to_datetime(row["Date of Visit"])
        date_of_visit = raw_visit_date.strftime("%Y-%m-%d")

        # Auto-extract month name & year
        month_name = raw_visit_date.strftime("%B")
        financial_year = get_financial_year(raw_visit_date)

        branch_name = frappe.db.get_value("Sahayog Branch", sol_id, "branch") or "Unknown"
        parent_name = f"{sol_id} - {branch_name} - {financial_year}"

        # Fetch or Create Parent Document
        if frappe.db.exists("Audit and Compliance", parent_name):
            doc = frappe.get_doc("Audit and Compliance", parent_name)
            updated_records.add(parent_name)
        else:
            doc = frappe.get_doc({
                "doctype": "Audit and Compliance",
                "sol_id": sol_id,
                "branch_name": branch_name,
                "year": financial_year,
                "com_visit": []
            })
            doc.insert(ignore_permissions=True)
            created_records.add(parent_name)

        # Update existing month row or append new
        existing_row = None
        for child_row in doc.com_visit:
            if child_row.month == month_name:
                existing_row = child_row
                break

        row_data = {
            "month": month_name,
            "date_of_visit": date_of_visit,
            "visit_score_i": str(row["Visit Score"]) if pd.notnull(row["Visit Score"]) else "",
            "visit_score_ii": str(row["Last Visit Score"]) if pd.notnull(row["Last Visit Score"]) else ""
        }

        if existing_row:
            existing_row.update(row_data)
        else:
            doc.append("com_visit", row_data)

        doc.save(ignore_permissions=True)

    frappe.db.commit()

    summary_msg = _("Processing Complete!<br><b>Created Parent Records:</b> {0}<br><b>Updated Parent Records:</b> {1}").format(
        len(created_records), len(updated_records)
    )

    return {"status": "success", "message": summary_msg}

###########################################################################################

@frappe.whitelist()
def process_com_visit_compliance_excel(file_url):
    if not file_url:
        frappe.throw(_("Please upload a valid Excel file."))

    file_doc = frappe.get_doc("File", {"file_url": file_url})
    file_path = file_doc.get_full_path()

    df = pd.read_excel(file_path)

    # Validate mandatory column
    required_cols = ["Branch Code", "Date of publish"]
    for col in required_cols:
        if col not in df.columns:
            frappe.throw(_("Excel file is missing required column: {0}").format(col))

    created_records = set()
    updated_records = set()

    for idx, row in df.iterrows():
        sol_id = str(row["Branch Code"]).strip() if pd.notnull(row["Branch Code"]) else None
        if not sol_id:
            continue

        if pd.isnull(row["Date of publish"]):
            continue

        raw_publish_date = pd.to_datetime(row["Date of publish"])
        date_of_publish = raw_publish_date.strftime("%Y-%m-%d")

        month_name = raw_publish_date.strftime("%B")
        financial_year = get_financial_year(raw_publish_date)

        # Default values when Date of Closure is not present
        date_of_closure = None
        turnaround_time_days = "Awaiting date of closure"
        status = "Pending"

        # If Date of Closure is present, validate & update Status & Turnaround Time
        if pd.notnull(row.get("Date of closure")):
            raw_closure_date = pd.to_datetime(row["Date of closure"])
            
            # Validation: Date of closure cannot be earlier than Date of publish
            if raw_closure_date < raw_publish_date:
                frappe.throw(
                    _("Row {0}: Date of closure ({1}) cannot be earlier than Date of publish ({2}) for Branch Code {3}").format(
                        idx + 2, 
                        raw_closure_date.strftime("%Y-%m-%d"), 
                        date_of_publish, 
                        sol_id
                    )
                )

            date_of_closure = raw_closure_date.strftime("%Y-%m-%d")
            
            # Days difference (Closure Date - Publish Date)
            diff_days = (raw_closure_date - raw_publish_date).days
            turnaround_time_days = str(diff_days)
            status = "Completed"

        branch_name = frappe.db.get_value("Sahayog Branch", sol_id, "branch") or "Unknown"
        parent_name = f"{sol_id} - {branch_name} - {financial_year}"

        # Fetch or Create Parent Record
        if frappe.db.exists("Audit and Compliance", parent_name):
            doc = frappe.get_doc("Audit and Compliance", parent_name)
            updated_records.add(parent_name)
        else:
            doc = frappe.get_doc({
                "doctype": "Audit and Compliance",
                "sol_id": sol_id,
                "branch_name": branch_name,
                "year": financial_year,
                "com_visit_compliance": []
            })
            doc.insert(ignore_permissions=True)
            created_records.add(parent_name)

        # Check existing row by month
        existing_row = None
        for child_row in doc.com_visit_compliance:
            if child_row.month == month_name:
                existing_row = child_row
                break

        row_data = {
            "month": month_name,
            "date_of_publish": date_of_publish,
            "status": status,
            "date_of_closure": date_of_closure,
            "turnaround_time_days": turnaround_time_days
        }

        if existing_row:
            existing_row.update(row_data)
        else:
            doc.append("com_visit_compliance", row_data)

        doc.save(ignore_permissions=True)

    frappe.db.commit()

    summary_msg = _("Processing Complete!<br><b>Created Parent Records:</b> {0}<br><b>Updated Parent Records:</b> {1}").format(
        len(created_records), len(updated_records)
    )

    return {"status": "success", "message": summary_msg}