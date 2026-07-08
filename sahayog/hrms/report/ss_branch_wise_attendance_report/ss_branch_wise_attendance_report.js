// Copyright (c) 2024, Sahayog and contributors
// For license information, please see license.txt

frappe.query_reports["SS Branch-wise Attendance Report"] = {
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
			"fieldname": "branch",
			"label": __("Branch"),
			"fieldtype": "Link",
			"options": "Branch"
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
		}
	],
	
	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		
		// Color code attendance percentage
		if (column.fieldname == "attendance_pct") {
			let pct = parseFloat(value);
			if (pct >= 90) {
				value = `<span style="color: #16a34a; font-weight: 700;">${value}%</span>`;
			} else if (pct >= 75) {
				value = `<span style="color: #d97706; font-weight: 700;">${value}%</span>`;
			} else if (pct < 75) {
				value = `<span style="color: #dc2626; font-weight: 700;">${value}%</span>`;
			}
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
		
		report.page.add_inner_button(__("Current Quarter"), function() {
			let quarter_start = frappe.datetime.add_months(frappe.datetime.month_start(), -(frappe.datetime.now_date().getMonth() % 3));
			frappe.query_report.set_filter_value("from_date", quarter_start);
			frappe.query_report.set_filter_value("to_date", frappe.datetime.month_end());
		});
	}
};
