import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
	fields = {
		"Purchase Receipt": [
			{
				"fieldname": "custom_invoice_number",
				"label": "Invoice Number",
				"fieldtype": "Data",
				"insert_after": "company",
			},
			{
				"fieldname": "custom_invoice_date",
				"label": "Invoice Date",
				"fieldtype": "Date",
				"insert_after": "custom_invoice_number",
			},
		]
	}
	create_custom_fields(fields)
	frappe.db.commit()
	frappe.clear_cache()
