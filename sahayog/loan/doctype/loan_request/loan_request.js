// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

function validateIndianPhone(phone) {
	// Indian mobile numbers: 10 digits, starts with 6-9
	const regex = /^[6-9]\d{9}$/;
	return regex.test(phone);
}

frappe.ui.form.on("Loan Request", {
	refresh(frm) {
		// Hide Head Office Approval section when status is Draft
		frm.toggle_display("head_office_approval_section", frm.doc.status !== "Draft");
		frm.toggle_display("scheme_code", frm.doc.status !== "Draft");
		frm.toggle_display("approved_loan_amount", frm.doc.status !== "Draft");
		frm.toggle_display("column_break_ho", frm.doc.status !== "Draft");
		frm.toggle_display("remark", frm.doc.status !== "Draft");

		// Show "Create Loan Application" button only when Approved
		if (frm.doc.status === "Approved") {
			frm.add_custom_button(__('Create Loan Application'), function() {
				frappe.call({
					method: 'create_loan_application',
					doc: frm.doc,
					callback: function(r) {
						if (r.message) {
							frappe.msgprint(__('Loan Application {0} created successfully', [r.message]));
							frappe.set_route('Form', 'Loan Application', r.message);
						}
					}
				});
			}).addClass('btn-primary');
		}
	},

	mobile_number(frm) {
		const phone = frm.doc.mobile_number;

		if (!phone) return;

		// Remove any non-digit characters
		const cleanPhone = phone.replace(/\D/g, "");

		// Check length
		if (cleanPhone.length > 10) {
			frm.set_value("mobile_number", cleanPhone.slice(0, 10));
			frappe.show_alert({
				message: __("Mobile number cannot exceed 10 digits"),
				indicator: "red"
			}, 3);
			return;
		}

		// Validate Indian phone format (starts with 6-9)
		if (cleanPhone.length === 10 && !validateIndianPhone(cleanPhone)) {
			frappe.show_alert({
				message: __("Invalid mobile number. Must start with 6, 7, 8, or 9"),
				indicator: "orange"
			}, 3);
			frm.set_value("mobile_number", "");
			return;
		}
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
