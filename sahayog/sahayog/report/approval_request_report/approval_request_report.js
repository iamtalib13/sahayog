frappe.query_reports["Approval Request Analysis"] = {
	"filters": [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
			reqd: 1
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1
		},
		{
			fieldname: "employee",
			label: __("Employee"),
			fieldtype: "Link",
			options: "Employee"
		},
		{
			fieldname: "approval_status",
			label: __("Status"),
			fieldtype: "Select",
			options: "\nDraft\nPending Approval\nApproved\nRejected"
		}
	],

	// 🔥 UI IMPROVEMENT (clean + aligned)
	formatter: function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (!data) return value;

		// Status Badge
		if (column.fieldname === "approval_status") {
			const colors = {
				"Approved": "green",
				"Pending Approval": "orange",
				"Rejected": "red",
				"Draft": "gray"
			};
			const color = colors[data.approval_status] || "gray";

			return `<span class="indicator-pill ${color}" 
				style="padding:4px 10px;font-size:12px;">
				${data.approval_status}
			</span>`;
		}

		// Request ID Highlight
		if (column.fieldname === "name") {
			return `<b style="color:#1a73e8;">${value}</b>`;
		}

		// Clean text (no overflow issues)
		return `<span title="${value || ""}">${value || ""}</span>`;
	},

	onload: function(report) {
		report.page.set_title(__("Approval Request Report"));

		// 🔥 Auto refresh when filter changes
		report.page.fields_dict.from_date.$input.on("change", () => report.refresh());
		report.page.fields_dict.to_date.$input.on("change", () => report.refresh());
	}
};