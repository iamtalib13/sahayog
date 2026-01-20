// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Branch Petty Cash Account", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on('Branch Petty Cash Account', {
    refresh: function(frm) {
        // [NEW] Permission Logic for Monthly Limit
        // Only Administrator or HO Petty Cash Manager can edit the limit
        if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager')) {
            frm.set_df_property('monthly_limit', 'read_only', 0); // Editable
        } else {
            frm.set_df_property('monthly_limit', 'read_only', 1); // Read-only
        }
    },

    branch: function(frm) {
        if (frm.doc.branch) {
            frappe.db.get_value('Sahayog Branch', frm.doc.branch, 'branch_type')
                .then(r => {
                    if (r && r.message) {
                        let b_type = r.message.branch_type;
                        
                        // Only auto-set if the limit is currently 0/empty
                        // AND the user actually has permission to change it (optional check, but good for UI)
                        if (!frm.doc.monthly_limit || frm.doc.monthly_limit == 0) {
                            if (b_type === "Metro") {
                                frm.set_value('monthly_limit', 25000);
                            } else {
                                frm.set_value('monthly_limit', 15000);
                            }
                        }
                    }
                });
        }
    }
});

