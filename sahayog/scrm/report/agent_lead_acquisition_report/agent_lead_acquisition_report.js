// Copyright (c) 2026, Administrator and contributors
// For license information, please see license.txt

frappe.query_reports["Agent Lead Acquisition Report"] = {
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
			"fieldname": "state",
			"label": __("State"),
			"fieldtype": "Select",
			"options": "\nAndhra Pradesh\nArunachal Pradesh\nAssam\nBihar\nChhattisgarh\nGoa\nGujarat\nHaryana\nHimachal Pradesh\nJharkhand\nKarnataka\nKerala\nMadhya Pradesh\nMaharashtra\nManipur\nMeghalaya\nMizoram\nNagaland\nOdisha\nPunjab\nRajasthan\nSikkim\nTamil Nadu\nTelangana\nTripura\nUttar Pradesh\nUttarakhand\nWest Bengal\nAndaman and Nicobar Islands\nChandigarh\nDadra and Nagar Haveli and Daman and Diu\nDelhi\nJammu and Kashmir\nLadakh\nLakshadweep\nPuducherry"
		},
		{
			"fieldname": "branch",
			"label": __("Sahayog Branch"),
			"fieldtype": "Link",
			"options": "Sahayog Branch"
		},
		{
			"fieldname": "occupation",
			"label": __("Occupation"),
			"fieldtype": "Select",
			"options": "\nRetired\nService\nInsurance Agent\nEx-Banker\nGovt. Officer\nTeacher\nRetail Salesperson\nHousewife/Homemaker\nBusiness Owner\nOthers"
		},
		{
			"fieldname": "status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options": "\nNew\nIn Touch\nInterested\nNot Interested\nOnboarded\nRejected"
		}
	],
	"onload": function(report) {
		// 🚫 Inject CSS to permanently hide Frappe's default 'Actions' dropdown button
		if (!$("#agent-lead-report-custom-css").length) {
			$("<style id='agent-lead-report-custom-css'>")
				.prop("type", "text/css")
				.html(`
					.page-actions .menu-btn-group,
					.page-actions .actions-btn-group,
					.page-actions [data-label="Actions"] {
						display: none !important;
					}
				`)
				.appendTo("head");
		}

		// Clear Filters Button
		report.page.add_inner_button(__('Clear Filters'), function () {
			report.filters.forEach(f => f.set_value(''));
			report.refresh();
		}).addClass('btn-secondary');

		// Download CSV Button
		report.page.add_inner_button(__('Download CSV'), function () {
			frappe.query_report.export_report();
		}).addClass('btn-primary');
	}
};
