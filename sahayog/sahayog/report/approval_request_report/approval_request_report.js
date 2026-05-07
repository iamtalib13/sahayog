frappe.query_reports["Approval Request Report"] = {
	
// Filters for the Approval Request Report to filter by date range, employee, and approval status
	"filters": [
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": ""
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": ""
		},
		{
			"fieldname": "employee",
			"label": __("Employee"),
			"fieldtype": "Link",
			"options": "Employee"
		},
		{
			"fieldname": "approval_status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options": "\nDraft\nPending Approval\nApproved\nRejected"
		}
	],

// Formatter to display approval status with colored indicators in the Approval Request Report
	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname === "approval_status") {
			const status_colors = {
				"Approved": "green",
				"Pending Approval": "orange",
				"Rejected": "red",
				"Draft": "gray"
			};
			const color = status_colors[data.approval_status] || "gray";
			value = `<span class="indicator-pill ${color}">${data.approval_status}</span>`;
		}

		return value;
	},

// Onload function to clear filters and add buttons for Clear Filters and Export in the Approval Request Report
	"onload": function(report) {
		// Strictly clear filters on load
		report.set_filter_value('from_date', "");
		report.set_filter_value('to_date', "");

		// Clear Filters Button
		report.page.add_inner_button(__('Clear Filters'), function () {
			report.filters.forEach(f => f.set_value(''));
			report.refresh();
		}).addClass('btn-secondary');

		// Export Button - Beside Clear Filters
		if (frappe.user.has_role("System Manager") || frappe.user.has_role("Administrator")) {
		report.page.add_inner_button(__('Export'), function () {
			frappe.query_report.export_report();
		}).addClass('btn-primary');
	 }
	}
};
