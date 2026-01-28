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
            frm.set_df_property('gl_sub_code', 'read_only', 0); // Editable
            frm.set_df_property('status', 'read_only', 0); // Editable
        } else {
            frm.set_df_property('monthly_limit', 'read_only', 1); // Read-only
            frm.set_df_property('gl_sub_code', 'read_only', 1); // Read-only
            frm.set_df_property('status', 'read_only', 1); // Read-only
        }

        // [NEW] Generate GL Code on refresh if branch exists
        if (frm.doc.branch && !frm.doc.gl_sub_code) {
            frm.trigger('generate_gl_code');
        }

         // Only show button if GL Code exists
        if (!frm.is_new() && frm.doc.gl_sub_code) {
            frm.add_custom_button(__('Sync Finacle Balance'), function() {
                frm.trigger('get_finacle_balance');
            });
        }
        
    },

        get_finacle_balance: function(frm) {
        frappe.call({
            method: "sahayog.petty_cash_management.api.branch_petty_cash_account_balance_fetch.fetch_finacle_balance",
            args: {
                branch: frm.doc.branch
            },
            freeze: true,
            freeze_message: __("Syncing with Finacle..."),
            callback: function(r) {
                if (r.message != null) {
                    // 1. Reload the document
                    // This updates the UI with the saved value and keeps the form "Clean" (Saved)
                    frm.reload_doc();

                    frappe.msgprint({
                        title: __('Success'),
                        indicator: 'green',
                        message: __('Balance Synced: <b>{0}</b>', [format_currency(r.message)])
                    });
                }
            }
        });
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

            // 2. [NEW] Auto-generate GL Code immediately
            frm.trigger('generate_gl_code');
        }
    },

     // [NEW] Custom function to generate GL code on frontend
    generate_gl_code: function(frm) {
        if (frm.doc.branch) {
            let account_suffix = "01390200001";
            let full_code = frm.doc.branch + account_suffix;
            frm.set_value('gl_sub_code', full_code);
        }
    }
});

