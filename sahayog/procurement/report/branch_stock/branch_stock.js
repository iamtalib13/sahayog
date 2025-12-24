// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Branch Stock"] = {
  filters: [],

  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);

    // 🔹 Issue column action
    if (column.fieldname === "issue" && data) {
      return `
				<a
					style="cursor:pointer; text-decoration:underline; font-size:12px;"
					title="Create Material Issue"
					onclick="
						frappe.route_options = {
							stock_entry_type: 'Material Issue'
						};
						frappe.set_route('Form', 'Stock Entry', 'new-stock-entry-1');
					">
					Issue
				</a>
			`;
    }

    return value;
  },
};
