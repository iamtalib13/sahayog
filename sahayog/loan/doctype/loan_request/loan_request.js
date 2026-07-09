// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Loan Request", {
	refresh(frm) {
		// Hide Head Office Approval section when status is Draft
		frm.toggle_display("head_office_approval_section", frm.doc.status !== "Draft");
		frm.toggle_display("scheme_code", frm.doc.status !== "Draft");
		frm.toggle_display("approved_loan_amount", frm.doc.status !== "Draft");
		frm.toggle_display("column_break_ho", frm.doc.status !== "Draft");
		frm.toggle_display("remark", frm.doc.status !== "Draft");
	},

	deposit_date(frm) {
		// Auto-calculate vintage when deposit_date changes
		if (frm.doc.deposit_date) {
			let today = frappe.datetime.get_today();
			let days = frappe.datetime.get_diff(today, frm.doc.deposit_date);
			frm.set_value("vintage_complete_days", days);
		} else {
			frm.set_value("vintage_complete_days", 0);
		}
	}
});
