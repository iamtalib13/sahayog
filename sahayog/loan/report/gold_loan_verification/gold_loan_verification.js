frappe.query_reports["Gold Loan Verification"] = {
	"filters": [
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1)
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today()
		},
		{
			"fieldname": "branch_code",
			"label": __("Branch"),
			"fieldtype": "Link",
			"options": "Sahayog Branch"
		},
		{
			"fieldname": "status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options": "\nDraft\nPending\nApproved\nRejected\nDisbursed\nCancelled"
		}
	]
};
