frappe.query_reports["SS Attendance Regularization and In Out Report"] = {
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
		}
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname == "attendance_status") {
			var colors = {"Present": "#16a34a", "Absent": "#dc2626", "Half Day": "#4338ca", "On Leave": "#d97706"};
			if (colors[value]) {
				value = `<span style="color:${colors[value]}; font-weight:600;">${value}</span>`;
			}
		}
		if (column.fieldname == "correction_status") {
			var colors = {"Pending": "#d97706", "Approved": "#16a34a", "Rejected": "#dc2626", "Draft": "#6b7280"};
			if (colors[value]) {
				value = `<span style="color:${colors[value]}; font-weight:600;">${value}</span>`;
			}
		}
		return value;
	}
};
