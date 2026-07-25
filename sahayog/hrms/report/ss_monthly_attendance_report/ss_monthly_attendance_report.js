frappe.query_reports["SS Monthly Attendance Report"] = {
	"filters": [
		{
			"fieldname": "month",
			"label": __("Attendance Month"),
			"fieldtype": "Select",
			"options": [
				{ "label": __("January"), "value": 1 },
				{ "label": __("February"), "value": 2 },
				{ "label": __("March"), "value": 3 },
				{ "label": __("April"), "value": 4 },
				{ "label": __("May"), "value": 5 },
				{ "label": __("June"), "value": 6 },
				{ "label": __("July"), "value": 7 },
				{ "label": __("August"), "value": 8 },
				{ "label": __("September"), "value": 9 },
				{ "label": __("October"), "value": 10 },
				{ "label": __("November"), "value": 11 },
				{ "label": __("December"), "value": 12 },
			],
		},
		{
			"fieldname": "year",
			"label": __("Year"),
			"fieldtype": "Int",
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"hidden": 1,
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"hidden": 1,
		},
		{
			"fieldname": "employee",
			"label": __("Employee"),
			"fieldtype": "Link",
			"options": "Employee",
			"get_query": function() {
				return {
					"filters": {
						"custom_is_support_staff": 1,
						"status": "Active"
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
	],

	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (!column.fieldname || !column.fieldname.includes("_")) {
			return value;
		}

		var color_map = {
			"P": "#16a34a",
			"WO-P": "#059669",
			"H-P": "#059669",
			"A": "#dc2626",
			"HD": "#4338ca",
			"CL": "#d97706",
			"SiL": "#d97706",
			"EL": "#d97706",
			"CO": "#d97706",
			"MatL": "#d97706",
			"PatL": "#d97706",
			"LWP": "#ef4444",
			"L": "#d97706",
			"H": "#3b82f6",
			"WO": "#6b7280",
		};
		var color = color_map[value];
		if (color) {
			value = `<span style="color:${color}; font-weight:600;" title="${getCodeTitle(value)}">${value}</span>`;
		}
		return value;
	},

	"onload": function(report) {
		var today = new Date();
		var m = today.getMonth() + 1;
		var y = today.getFullYear();
		// If today is 26th or later, attendance cycle is NEXT month
		if (today.getDate() >= 26) {
			m += 1;
			if (m > 12) { m = 1; y += 1; }
		}
		frappe.query_report.set_filter_value("month", m);
		frappe.query_report.set_filter_value("year", y);

		report.page.add_inner_button(__("Attendance Cycle (26th\u201325th)"), function() {
			frappe.query_report.refresh();
		});
	}
};

function getCodeTitle(code) {
	var titles = {
		"P": "Present",
		"A": "Absent",
		"WO": "Weekly Off",
		"H": "Holiday",
		"WO-P": "Weekly Off - Worked (Present)",
		"H-P": "Holiday - Worked (Present)",
		"CL": "Casual Leave",
		"SiL": "Sick Leave",
		"EL": "Earned Leave",
		"CO": "Compensatory Off",
		"LWP": "Leave Without Pay",
		"MatL": "Maternity Leave",
		"PatL": "Paternity Leave",
		"HD": "Half Day",
		"L": "Leave (Other)",
	};
	return titles[code] || code;
}
