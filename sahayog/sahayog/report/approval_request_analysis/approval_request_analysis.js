frappe.query_reports["Approval Request Analysis"] = {
	"filters": [
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1),
			"reqd": 1
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today(),
			"reqd": 1
		},
		{
			"fieldname": "employee",
			"label": __("Employee"),
			"fieldtype": "Link",
			"options": "Employee"
		},
		{
			"fieldname": "category",
			"label": __("Category"),
			"fieldtype": "Link",
			"options": "Approval Category"
		},
		{
			"fieldname": "approval_status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options": "\nDraft\nPending Approval\nApproved\nRejected"
		}
	],

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

	"onload": function(report) {
		// Force styles after a small delay to ensure DataTable has rendered
		setTimeout(() => {
			frappe.dom.set_style(`
				/* Force Horizontal Scroll and prevent squeezing */
				.frappe-list .result-list, .dt-instance-1 {
					overflow-x: auto !important;
				}

				.data-table {
					table-layout: auto !important;
					width: max-content !important;
					min-width: 100% !important;
				}

				/* Target cells directly to force widths */
				.dt-cell {
					white-space: nowrap !important;
					display: flex !important;
					align-items: center !important;
					border-right: 1px solid #f0f0f0 !important;
					min-width: 150px !important; /* Default min-width */
				}

				/* Specific Widths based on column index (as fieldname targeting is tricky in DT) */
				.dt-cell[data-col-index="4"] { min-width: 400px !important; } /* Title */
				.dt-cell[data-col-index="8"] { min-width: 500px !important; } /* Remark */

				.dt-header .dt-cell {
					font-weight: bold !important;
					background-color: #f8f9fa !important;
				}
				
				/* Fix header/body alignment sync */
				.dt-header, .dt-body {
					width: max-content !important;
					min-width: 100% !important;
				}
			`);
		}, 500);
	}
};
