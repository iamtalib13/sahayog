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

	// Branch change -> auto-fetch branch details
	frappe.web_form.on('branch', (field, value) => {
		if (value) {
			frappe.call({
				method: 'frappe.client.get',
				args: {
					doctype: 'Sahayog Branch',
					name: value
				},
				callback: function(r) {
					if (r.message) {
						frappe.web_form.set_value('branch_name', r.message.branch);
						frappe.web_form.set_value('branch_code', r.message.branch_code || r.message.sol_id);
						frappe.web_form.set_value('zone', r.message.zone);
						frappe.web_form.set_value('region', r.message.region);
					}
				}
			});
		}
	});
});
