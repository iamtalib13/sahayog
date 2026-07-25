frappe.query_reports["SS Leave Transaction Report"] = {
	"filters": [
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.month_start(),
			"reqd": 1
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.month_end(),
			"reqd": 1
		},
		{
			"fieldname": "employee",
			"label": __("Employee"),
			"fieldtype": "Link",
			"options": "Employee",
			"get_query": function() {
				return {
					"filters": {
						"custom_is_support_staff": 1
					}
				};
			}
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
			"fieldname": "leave_type",
			"label": __("Leave Type"),
			"fieldtype": "Link",
			"options": "Leave Type"
		}
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname == "leaves") {
			if (value > 0) {
				value = `<span style="color:#16a34a; font-weight:600;">+${value}</span>`;
			} else if (value < 0) {
				value = `<span style="color:#dc2626; font-weight:600;">${value}</span>`;
			}
		}
		return value;
	}
};
