import io
import re
import pandas as pd
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, date_diff, cint


class BranchScoreCardDeductions(Document):

    def autoname(self):
        if not (self.sol_id and self.branch_name and self.year):
            frappe.throw(
                _("SOL ID, Branch Name, and Year are mandatory fields required to generate the record name.")
            )
        self.name = f"{self.sol_id} - {self.branch_name} - {self.year}"

    def validate(self):
        if self.year:
            self.year = str(self.year).split('-')[0].strip()

        # KYC Deviation Table Backend Handling & Validation
        if self.kyc_deviation:
            for row in self.kyc_deviation:
                if row.date_of_deviation:
                    pass


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
def download_kyc_deviation_template():
    columns = ["Sol ID", "Date of Deviation", "Deviation Days"]
    generate_excel_response(columns, "KYC_Deviation_Template.xlsx", "KYC Deviation")


@frappe.whitelist()
def process_kyc_deviation_excel(file_url):
    if not file_url:
        frappe.throw(_("Please upload a valid Excel file."))

    file_doc = frappe.get_doc("File", {"file_url": file_url})
    file_path = file_doc.get_full_path()

    df = pd.read_excel(file_path)

    required_cols = ["Sol ID", "Date of Deviation", "Deviation Days"]
    for col in required_cols:
        if col not in df.columns:
            frappe.throw(_("Excel file is missing required column: {0}").format(col))

    created_records = set()
    updated_records = set()

    for idx, row in df.iterrows():
        sol_id = str(row["Sol ID"]).strip() if pd.notnull(row["Sol ID"]) else None
        if not sol_id:
            continue

        if pd.isnull(row["Date of Deviation"]):
            continue

        raw_dev_date = pd.to_datetime(row["Date of Deviation"])
        date_of_deviation = raw_dev_date.strftime("%Y-%m-%d")
        
        # FIX: Define month_name here so it's available for row_data
        month_name = raw_dev_date.strftime("%B")

        financial_year = get_financial_year(raw_dev_date)

        # Robust parsing to handle text like "15 Days" or numbers properly
        raw_dev_days = row.get("Deviation Days")
        deviation_days = 0
        if pd.notnull(raw_dev_days):
            if isinstance(raw_dev_days, (int, float)):
                deviation_days = cint(raw_dev_days)
            else:
                numbers = re.findall(r'\d+', str(raw_dev_days))
                if numbers:
                    deviation_days = cint(numbers[0])

        # Fetch Branch Name from 'Sahayog Branch' using SOL ID
        branch_name = frappe.db.get_value("Sahayog Branch", sol_id, "branch") or "Unknown"
        parent_name = f"{sol_id} - {branch_name} - {financial_year}"

        # Fetch or Create Parent Document with proper batch check
        if parent_name in created_records:
            doc = frappe.get_doc("Branch Score Card Deductions", parent_name)
        elif frappe.db.exists("Branch Score Card Deductions", parent_name):
            doc = frappe.get_doc("Branch Score Card Deductions", parent_name)
            if parent_name not in updated_records and parent_name not in created_records:
                updated_records.add(parent_name)
        else:
            doc = frappe.get_doc({
                "doctype": "Branch Score Card Deductions",
                "sol_id": sol_id,
                "branch_name": branch_name,
                "year": financial_year,
                "kyc_deviation": []
            })
            doc.insert(ignore_permissions=True)
            created_records.add(parent_name)

        # Check if row with the same date of deviation already exists
        existing_row = None
        for child_row in doc.kyc_deviation:
            if child_row.date_of_deviation:
                existing_date = str(child_row.date_of_deviation).split(" ")[0]
                if existing_date == date_of_deviation:
                    existing_row = child_row
                    break

        row_data = {
            "date_of_deviation": date_of_deviation,
            "deviation_days": deviation_days,
            "month": month_name
        }

        if existing_row:
            existing_row.update(row_data)
        else:
            doc.append("kyc_deviation", row_data)

        doc.save(ignore_permissions=True)

    frappe.db.commit()

    summary_msg = _("Processing Complete!<br><b>Created Parent Records:</b> {0}<br><b>Updated Parent Records:</b> {1}").format(
        len(created_records), len(updated_records)
    )

    return {"status": "success", "message": summary_msg}