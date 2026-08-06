// Copyright (c) 2026, Administrator and contributors
// For license information, please see license.txt

frappe.ui.form.on('MAC Activity', {
	onload: function(frm) {
		if (frm.is_new() && frappe.session.user !== 'Administrator') {
			frappe.call({
				method: 'sahayog.scrm.doctype.mac_activity.mac_activity.get_logged_in_employee_details',
				callback: function(r) {
					if (r.message && r.message.employee_id) {
						frm.set_value('employee', r.message.employee_id);
						if (r.message.employee_name) {
							frm.set_value('employee_name', r.message.employee_name);
						}
						if (r.message.sahayog_branch) {
							frm.set_value('branch', r.message.sahayog_branch);
						}
						// Disable editing for non-admins
						const is_admin = frappe.user_roles.includes('System Manager') || frappe.session.user === 'Administrator';
						if (!is_admin) {
							frm.set_df_property('employee', 'read_only', 1);
							frm.set_df_property('employee_name', 'read_only', 1);
							frm.set_df_property('branch', 'read_only', 1);
						}
					}
				}
			});
		}
	},
	refresh: function(frm) {
		frm.trigger('toggle_remark_mandatory');
		const is_admin = frappe.user_roles.includes('System Manager') || frappe.session.user === 'Administrator';
		if (!frm.is_new() || !is_admin) {
			frm.set_df_property('employee', 'read_only', 1);
			frm.set_df_property('employee_name', 'read_only', 1);
			frm.set_df_property('branch', 'read_only', 1);
		}
	},
	employee: function(frm) {
		if (frm.doc.employee) {
			frappe.call({
				method: 'sahayog.scrm.doctype.mac_activity.mac_activity.get_employee_details',
				args: {
					employee: frm.doc.employee
				},
				callback: function(r) {
					if (r.message) {
						if (r.message.employee_name) {
							frm.set_value('employee_name', r.message.employee_name);
						}
						if (r.message.sahayog_branch) {
							frm.set_value('branch', r.message.sahayog_branch);
						}
					}
				}
			});
		}
	},
	status: function(frm) {
		frm.trigger('toggle_remark_mandatory');
	},
	toggle_remark_mandatory: function(frm) {
		frm.toggle_reqd('remark', frm.doc.status === 'Cancelled');
	},
	paid_unpaid: function(frm) {
		if (frm.doc.paid_unpaid === 'Unpaid') {
			frm.set_value('estimated_cost', 0);
		}
	}
});
