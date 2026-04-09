frappe.ui.form.on("Serial No", {
	refresh(frm) {
		// Override the item_code filter (ERPNext core sets is_stock_item:1, has_serial_no:1 on onload)
		// This runs after onload to remove those filters
		frm.set_query("item_code", function () {
			return {};
		});

		frm.trigger("view_ledgers");
	},

	view_ledgers(frm) {
		frm.add_custom_button(__("View Ledgers"), () => {
			frappe.route_options = {
				item_code: frm.doc.item_code,
				serial_no: frm.doc.name,
				posting_date: frappe.datetime.now_date(),
				posting_time: frappe.datetime.now_time(),
			};
			frappe.set_route("query-report", "Serial No Ledger");
		});
	},
});
