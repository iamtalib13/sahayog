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
	],
	"onload": function(report) {
		report.page.add_inner_button(__('Clear Filters'), function () {
			report.filters.forEach(f => f.set_value(''));
			report.refresh();
		}).addClass('btn-secondary');

			// Hide Frappe standard Actions dropdown button
		let hide_actions_interval = setInterval(() => {
			let $actions = report.page.wrapper.find('.actions-btn-group, [data-label="Actions"]');
			if ($actions.length) {
				$actions.attr('style', 'display: none !important');
			}
		}, 50);
		setTimeout(() => clearInterval(hide_actions_interval), 2000);

		report.page.add_inner_button(__('Download CSV'), function () {
			let filters = report.get_values();
			frappe.call({
				method: "sahayog.loan.report.gold_loan_verification.gold_loan_verification.download_csv",
				args: { filters: JSON.stringify(filters) },
				freeze: true,
				callback: function(r) {
					if (r.message) {
						let blob = new Blob([r.message], { type: "text/csv" });
						let url = window.URL.createObjectURL(blob);
						let a = document.createElement("a");
						a.href = url;
						a.download = "Gold Loan Verification.csv";
						a.click();
						window.URL.revokeObjectURL(url);
					}
				}
			});
		}).addClass('btn-primary');
	}
};
