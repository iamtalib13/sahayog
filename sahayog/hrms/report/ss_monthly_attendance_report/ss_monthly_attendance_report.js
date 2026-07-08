// Copyright (c) 2024, Sahayog and contributors
// For license information, please see license.txt

frappe.query_reports["SS Monthly Attendance Report"] = {
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
		{
			"fieldname": "designation",
			"label": __("Designation"),
			"fieldtype": "Link",
			"options": "Designation"
		}
	],
	
	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		
		// Color code attendance columns
		if (column.fieldname == "present" && value > 0) {
			value = `<span style="color: #16a34a; font-weight: 600;">${value}</span>`;
		} else if (column.fieldname == "absent" && value > 0) {
			value = `<span style="color: #dc2626; font-weight: 600;">${value}</span>`;
		} else if (column.fieldname == "half_day" && value > 0) {
			value = `<span style="color: #4338ca; font-weight: 600;">${value}</span>`;
		} else if (column.fieldname == "on_leave" && value > 0) {
			value = `<span style="color: #d97706; font-weight: 600;">${value}</span>`;
		}
		
		return value;
	},
	
	"onload": function(report) {
		// Add custom button for date shortcuts
		report.page.add_inner_button(__("This Month"), function() {
			frappe.query_report.set_filter_value("from_date", frappe.datetime.month_start());
			frappe.query_report.set_filter_value("to_date", frappe.datetime.month_end());
		});
		
		report.page.add_inner_button(__("Last Month"), function() {
			let last_month_start = frappe.datetime.add_months(frappe.datetime.month_start(), -1);
			let last_month_end = frappe.datetime.add_days(frappe.datetime.month_start(), -1);
			frappe.query_report.set_filter_value("from_date", last_month_start);
			frappe.query_report.set_filter_value("to_date", last_month_end);
		});
		
		report.page.add_inner_button(__("Last 3 Months"), function() {
			let three_months_ago = frappe.datetime.add_months(frappe.datetime.month_start(), -2);
			frappe.query_report.set_filter_value("from_date", three_months_ago);
			frappe.query_report.set_filter_value("to_date", frappe.datetime.month_end());
		});
	}
};
