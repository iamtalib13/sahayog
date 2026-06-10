frappe.query_reports["Report Preference Report"] = {
	"filters": [
		{
			"fieldname": "user",
			"label": __("User"),
			"fieldtype": "Link",
			"options": "User"
		},
		{
			"fieldname": "zone",
			"label": __("Zone"),
			"fieldtype": "Link",
			"options": "Zone"
		},
		{
			"fieldname": "region",
			"label": __("Region"),
			"fieldtype": "Link",
			"options": "Region"
		},
		{
			"fieldname": "sol_id",
			"label": __("SOL ID"),
			"fieldtype": "Link",
			"options": "Sahayog Branch"
		}
	]
};
