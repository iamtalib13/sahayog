// Copyright (c) 2026, Administrator and contributors
// For license information, please see license.txt

frappe.ui.form.on('MAC Activity', {
	refresh: function(frm) {
		frm.trigger('toggle_remark_mandatory');
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
