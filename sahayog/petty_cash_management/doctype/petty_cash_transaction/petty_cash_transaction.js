// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Petty Cash Transaction", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on('Petty Cash Transaction', {
    onload: function(frm) {
        if (frm.is_new()) {
            frappe.db.get_value('Employee',
                { user_id: frappe.session.user, status: 'Active' },
                'sahayog_branch'
            ).then(r => {
                if (r && r.message && r.message.sahayog_branch) {
                    frm.set_value('branch', r.message.sahayog_branch);
                }
            });
        }
    }
});
