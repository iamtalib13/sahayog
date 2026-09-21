frappe.query_reports["EDR Report"] = {
	"filters": [
		{"fieldname": "from_date", "label": __("From Date"), "fieldtype": "Date", "default": frappe.datetime.get_today()},
		{"fieldname": "to_date", "label": __("To Date"), "fieldtype": "Date", "default": frappe.datetime.get_today()},
		{"fieldname": "zone", "label": __("Zone"), "fieldtype": "Data"},
		{"fieldname": "branch", "label": __("Branch"), "fieldtype": "Link", "options": "Sahayog Branch"},
		{"fieldname": "designation", "label": __("Designation"), "fieldtype": "Link", "options": "Designation"}
	],
	"onload": function(report) {
		report.page.add_inner_button(__('Clear Filters'), function () {
			report.filters.forEach(f => f.set_value(''));
			report.refresh();
		}).addClass('btn-secondary');

		report.page.add_inner_button(__('Download CSV'), function () {
			let filters = report.get_values();
			frappe.call({
				method: "sahayog.sahayog.report.edr_report.edr_report.download_csv",
				args: { filters: JSON.stringify(filters) },
				freeze: true,
				callback: function(r) {
					if (r.message) {
						let blob = new Blob([r.message], { type: "text/csv" });
						let url = window.URL.createObjectURL(blob);
						let a = document.createElement("a");
						a.href = url;
						a.download = "EDR Report.csv";
						a.click();
						window.URL.revokeObjectURL(url);
					}
				}
			});
		}).addClass('btn-primary');
			// Hide Frappe standard Actions dropdown button
		let hide_actions_interval = setInterval(() => {
			let $actions = report.page.wrapper.find('.actions-btn-group, [data-label="Actions"]');
			if ($actions.length) {
				$actions.attr('style', 'display: none !important');
			}
		}, 50);
		setTimeout(() => clearInterval(hide_actions_interval), 2000);
	}
};
