frappe.ready(function() {
	// Status change
	frappe.web_form.on('status', (field, value) => {
		frappe.web_form.set_df_property('remark', 'reqd', value === 'Cancelled');
	});

	// Paid/Unpaid change
	frappe.web_form.on('paid_unpaid', (field, value) => {
		if (value === 'Unpaid') {
			frappe.web_form.set_value('estimated_cost', 0);
		}
	});

	// Auto-fill logged-in user details on load
	if (frappe.session.user !== 'Guest') {
		frappe.call({
			method: 'sahayog.scrm.doctype.mac_activity.mac_activity.get_logged_in_employee_details',
			callback: function(r) {
				if (r.message) {
					if (r.message.employee_id) {
						frappe.web_form.set_value('employee', r.message.employee_id);
						frappe.web_form.set_df_property('employee', 'read_only', 1);
					}
					if (r.message.sahayog_branch) {
						frappe.web_form.set_value('branch', r.message.sahayog_branch);
						frappe.web_form.set_df_property('branch', 'read_only', 1);
					}
				}
			}
		});
	}

	// Employee change -> auto-fetch branch and details (safe for guest)
	frappe.web_form.on('employee', (field, value) => {
		if (value) {
			frappe.call({
				method: 'sahayog.scrm.doctype.mac_activity.mac_activity.get_employee_details',
				args: {
					employee: value
				},
				callback: function(r) {
					if (r.message) {
						if (r.message.sahayog_branch) {
							frappe.web_form.set_value('branch', r.message.sahayog_branch);
							// Restrict modifying branch for non-managers
							if (frappe.session.user === 'Guest' || !frappe.user_roles.includes('System Manager')) {
								frappe.web_form.set_df_property('branch', 'read_only', 1);
							}
						}
						if (r.message.branch_details) {
							const bd = r.message.branch_details;
							frappe.web_form.set_value('branch_name', bd.branch);
							frappe.web_form.set_value('branch_code', bd.branch_code);
							frappe.web_form.set_value('zone', bd.zone);
							frappe.web_form.set_value('region', bd.region);
						}
					}
				}
			});
		}
	});

	// Branch change -> auto-fetch branch details (safe for guest)
	frappe.web_form.on('branch', (field, value) => {
		if (value) {
			frappe.call({
				method: 'sahayog.scrm.doctype.mac_activity.mac_activity.get_branch_details',
				args: {
					branch: value
				},
				callback: function(r) {
					if (r.message) {
						frappe.web_form.set_value('branch_name', r.message.branch);
						frappe.web_form.set_value('branch_code', r.message.branch_code);
						frappe.web_form.set_value('zone', r.message.zone);
						frappe.web_form.set_value('region', r.message.region);
					}
				}
			});
		}
	});
});
