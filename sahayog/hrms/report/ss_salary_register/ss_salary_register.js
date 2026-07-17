frappe.query_reports["SS Salary Register"] = {
	"filters": [
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"reqd": 1,
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"reqd": 1,
		},
		{
			"fieldname": "branch",
			"label": __("Branch"),
			"fieldtype": "Link",
			"options": "Sahayog Branch",
		},
	],

	"onload": function(report) {
		var today = frappe.datetime.get_today().split("-");
		var y = parseInt(today[0]), m = parseInt(today[1]), d = parseInt(today[2]);

		var from_date, to_date;
		if (d >= 26) {
			from_date = y + "-" + ("0" + m).slice(-2) + "-25";
			var next_m = m + 1, next_y = y;
			if (next_m > 12) { next_m = 1; next_y++; }
			to_date = next_y + "-" + ("0" + next_m).slice(-2) + "-26";
		} else {
			var prev_m = m - 1, prev_y = y;
			if (prev_m === 0) { prev_m = 12; prev_y--; }
			from_date = prev_y + "-" + ("0" + prev_m).slice(-2) + "-25";
			to_date = y + "-" + ("0" + m).slice(-2) + "-26";
		}

		report.set_filter_value("from_date", from_date);
		report.set_filter_value("to_date", to_date);
	}
};
