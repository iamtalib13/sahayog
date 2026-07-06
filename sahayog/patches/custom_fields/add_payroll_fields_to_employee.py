import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    """Add payroll custom fields to Employee doctype"""
    
    custom_fields = {
        "Employee": [
            {
                "fieldname": "custom_medical_deduction",
                "label": "Medical Deduction (Monthly)",
                "fieldtype": "Currency",
                "insert_after": "ctc",
                "precision": 2,
                "description": "Monthly medical deduction amount"
            },
            {
                "fieldname": "custom_staff_loan_emi",
                "label": "Staff Loan EMI",
                "fieldtype": "Currency",
                "insert_after": "custom_medical_deduction",
                "precision": 2,
                "description": "Monthly staff loan EMI deduction"
            }
        ]
    }
    
    create_custom_fields(custom_fields, update=True)
    
    frappe.db.commit()
    print("✅ Added payroll custom fields to Employee doctype")
