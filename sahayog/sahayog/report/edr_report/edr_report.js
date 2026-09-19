frappe.query_reports["EDR Report"] = {
	"filters": [
		{"fieldname": "from_date", "label": __("From Date"), "fieldtype": "Date"},
		{"fieldname": "to_date", "label": __("To Date"), "fieldtype": "Date"},
		{"fieldname": "zone", "label": __("Zone"), "fieldtype": "Data"},
		{"fieldname": "branch", "label": __("Branch"), "fieldtype": "Link", "options": "Sahayog Branch"},
		{"fieldname": "designation", "label": __("Designation"), "fieldtype": "Link", "options": "Designation"}
	]
};
