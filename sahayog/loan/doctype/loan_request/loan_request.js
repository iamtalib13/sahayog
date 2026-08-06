// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

function validateIndianPhone(phone) {
	// Indian mobile numbers: 10 digits, starts with 6-9
	const regex = /^[6-9]\d{9}$/;
	return regex.test(phone);
}

frappe.ui.form.on("Loan Request", {
	refresh(frm) {
		frm.clear_custom_buttons();

		// Hide Head Office Approval section when status is Draft
		frm.toggle_display("head_office_approval_section", frm.doc.status !== "Draft");
		frm.toggle_display("scheme_code", frm.doc.status !== "Draft");
		frm.toggle_display("approved_loan_amount", frm.doc.status !== "Draft");
		frm.toggle_display("column_break_ho", frm.doc.status !== "Draft");
		frm.toggle_display("remark", frm.doc.status !== "Draft");

		// Make scheme_code and approved_loan_amount mandatory for Credit Team / HO review
		if (frm.doc.status === "Pending Credit Review") {
			frm.toggle_reqd("scheme_code");
			frm.toggle_reqd("approved_loan_amount", true);

			// Clear default/old values so mandatory check works
			if (frm.doc.approved_loan_amount === "0.000000000" || frm.doc.approved_loan_amount === "0" || frm.doc.approved_loan_amount === "0.00") {
				frm.set_value("approved_loan_amount", "");
			}
		}

		// Branch Loan User buttons - only show if doc is saved and status is Draft
		if (frm.doc.status === "Draft" && !frm.is_new()) {
			frm.add_custom_button(__('Send to Credit Team'), function() {
				frappe.confirm(
					__('Send this Loan Request to Credit Team for review?'),
					function() {
						frm.set_value("status", "Pending Credit Review");
						frm.set_value("approved_loan_amount", "");
						frm.set_value("scheme_code", "");
						frm.save().then(function() {
							frm.reload_doc();
							frappe.show_alert({
								message: __("Loan Request sent to Credit Team"),
								indicator: "green"
							}, 3);
						});
					}
				);
			}).addClass('btn-primary');
		}

		// Credit Loan User buttons (dropdown)
		if (frm.doc.status === "Pending Credit Review") {
			// let dropdown = frm.add_custom_button(__('Credit Team Actions'), null);
			
			frm.add_custom_button(__('Approve'), function() {
				if (!frm.doc.scheme_code) {
					frappe.msgprint(__('Scheme Code is required before approving'));
					return;
				}
				if (!frm.doc.approved_loan_amount || frm.doc.approved_loan_amount === 0 || frm.doc.approved_loan_amount === "0.000000000") {
					frappe.msgprint(__('Approved Loan Amount is required and cannot be zero'));
					return;
				}
				frappe.confirm(
					__('Approve this Loan Request?'),
					function() {
						frm.set_value("status", "Approved");
						frm.save().then(function() {
							frm.reload_doc();
							frappe.show_alert({
								message: __("Loan Request Approved"),
								indicator: "green"
							}, 3);
						});
					}
				);
			}, dropdown);

			frm.add_custom_button(__('Reject'), function() {
				frappe.confirm(
					__('Reject this Loan Request?'),
					function() {
						frm.set_value("status", "Rejected");
						frm.save().then(function() {
							frm.reload_doc();
							frappe.show_alert({
								message: __("Loan Request Rejected"),
								indicator: "red"
							}, 3);
						});
					}
				);
			}, dropdown);

			frm.add_custom_button(__('Send Back'), function() {
				frappe.confirm(
					__('Send this Loan Request back to Branch User?'),
					function() {
						frm.set_value("status", "Sent Back");
						frm.save().then(function() {
							frm.reload_doc();
							frappe.show_alert({
								message: __("Loan Request sent back to Branch User"),
								indicator: "orange"
							}, 3);
						});
					}
				);
			}, dropdown);
		}

		// Approved - Create Loan Application button (Branch Loan User only)
		if (frm.doc.status === "Approved" && frappe.user_roles.includes("Branch Loan User")) {
			frm.add_custom_button(__('Create Loan Application'), function() {
				frappe.call({
					method: 'create_loan_application',
					doc: frm.doc,
					callback: function(r) {
						if (r.message) {
							frappe.new_doc("Loan Application", r.message);
						}
					}
				});
			}).addClass('btn-primary');
		}

		// Rejected/Sent Back - Revise button
		if ((frm.doc.status === "Rejected" || frm.doc.status === "Sent Back") && !frm.is_new()) {
			frm.add_custom_button(__('Revise'), function() {
				frm.set_value("status", "Draft");
				frm.save().then(function() {
					frm.reload_doc();
					frappe.show_alert({
						message: __("Loan Request moved to Draft. You can now edit and resend."),
						indicator: "blue"
					}, 3);
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
