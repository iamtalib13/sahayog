// Copyright (c) 2024, Sahayog and contributors
// For license information, please see license.txt

frappe.query_reports["SS Employee Master Report"] = {
	"filters": [
		{
			"fieldname": "status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options": ["", "Active", "Left", "Resigned", "Retired"],
			"default": ""
		},
		{
			"fieldname": "branch",
			"label": __("Branch"),
			"fieldtype": "Link",
			"options": "Branch"
		},
		{
			"fieldname": "department",
			"label": __("Department"),
			"fieldtype": "Link",
			"options": "Department"
		},
		{
			"fieldname": "designation",
			"label": __("Designation"),
			"fieldtype": "Link",
			"options": "Designation"
		},
		{
			"fieldname": "employment_type",
			"label": __("Employment Type"),
			"fieldtype": "Link",
			"options": "Employment Type"
		},
		{
			"fieldname": "zone",
			"label": __("Zone"),
			"fieldtype": "Data"
		},
		{
			"fieldname": "region",
			"label": __("Region"),
			"fieldtype": "Data"
		},
		{
			"fieldname": "from_date_of_joining",
			"label": __("From Date of Joining"),
			"fieldtype": "Date",
			"default": ""
		},
		{
			"fieldname": "to_date_of_joining",
			"label": __("To Date of Joining"),
			"fieldtype": "Date",
			"default": ""
		},
		{
			"fieldname": "from_relieving_date",
			"label": __("From Relieving Date"),
			"fieldtype": "Date",
			"default": ""
		},
		{
			"fieldname": "to_relieving_date",
			"label": __("To Relieving Date"),
			"fieldtype": "Date",
			"default": ""
		}
	],
	
	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		
		// Color code status column
		if (column.fieldname == "status") {
			if (value && value.includes("Active")) {
				value = `<span style="color: #16a34a; font-weight: 600;">${value}</span>`;
			} else if (value && (value.includes("Left") || value.includes("Resigned"))) {
				value = `<span style="color: #dc2626; font-weight: 600;">${value}</span>`;
			}
		}
		
		return value;
	}
};
