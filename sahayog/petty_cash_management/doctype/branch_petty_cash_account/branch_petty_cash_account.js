frappe.ui.form.on('Branch Petty Cash Account', {
    refresh: function (frm) {
        toggle_entity_fields(frm);
        frm.trigger('toggle_unsettled_cash_field');

        // const is_admin = ;
        if (frappe.session.user === 'Administrator') {
            frm.set_df_property('current_balance', 'read_only', 0);
        }
        // frm.set_df_property('current_balance', 'read_only', !is_admin,);



        const can_edit = (frappe.user_roles || []).includes('HO Petty Cash Manager');
        frm.set_df_property('is_fund_source', 'read_only', can_edit ? 0 : 1);
        frm.toggle_enable('is_fund_source', can_edit);

        if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager')) {
            frm.set_df_property('monthly_limit', 'read_only', 0);
            frm.set_df_property('gl_sub_code', 'read_only', 0);
            frm.set_df_property('status', 'read_only', 0);
        } else {
            frm.set_df_property('monthly_limit', 'read_only', 1);
            frm.set_df_property('gl_sub_code', 'read_only', 1);
            frm.set_df_property('status', 'read_only', 1);
        }

        if (frm.doc.branch && !frm.doc.gl_sub_code) {
            frm.trigger('generate_gl_code');
        }

        if (!frm.is_new() && frm.doc.gl_sub_code) {
            frm.add_custom_button(__('Sync Finacle Balance'), function () {
                frm.trigger('get_finacle_balance');
            });
        }

        let is_admin = frappe.session.user === 'Administrator';
        let is_ho_manager = frappe.user.has_role('HO Petty Cash Manager');

        if (!is_admin && !is_ho_manager) {
            frm.set_df_property('go_live_date', 'read_only', 1);
        } else {
            frm.set_df_property('go_live_date', 'read_only', 0);
        }

        frm.trigger('toggle_unsettled_cash_field');


    },

    onload: function (frm) {
        toggle_entity_fields(frm);
    },

    toggle_unsettled_cash_field: function (frm) {
        frappe.db.get_single_value('Sahayog Settings', 'enable_unsettled_cash_flow')
            .then((value) => {
                frm.set_df_property('go_live_date', 'read_only', 1);

                if (frappe.session.user === 'Administrator') {
                    frm.set_df_property('go_live_date', 'read_only', 0);
                }
                // const show_unsettled_cash = cint(value) === 1;
                const show_unsettled_cash = Number(value) === 1;
                frm.toggle_display('unsettled_cash', show_unsettled_cash);
            });
    },

    get_finacle_balance: function (frm) {
        frappe.call({
            method: "sahayog.petty_cash_management.api.branch_petty_cash_account_balance_fetch.fetch_finacle_balance",
            args: {
                branch: frm.doc.branch
            },
            freeze: true,
            freeze_message: __("Syncing with Finacle..."),
            callback: function (r) {
                if (r.message != null) {
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

    // branch: function(frm) {
    //     if (frm.doc.branch) {
    //         frappe.db.get_value('Sahayog Branch', frm.doc.branch, 'branch_type')
    //             .then(r => {
    //                 if (r && r.message) {
    //                     let b_type = r.message.branch_type;

    //                     if (!frm.doc.monthly_limit || frm.doc.monthly_limit == 0) {
    //                         if (b_type === "Metro") {
    //                             frm.set_value('monthly_limit', 30000);
    //                         } else {
    //                             frm.set_value('monthly_limit', 25000);
    //                         }
    //                     }
    //                 }
    //             });

    //         frm.trigger('generate_gl_code');
    //     }
    // },

    // generate_gl_code: function(frm) {
    //     if (frm.doc.branch) {
    //         let account_suffix = "01390200001";
    //         let full_code = frm.doc.branch + account_suffix;
    //         frm.set_value('gl_sub_code', full_code);
    //     }
    // }


    // skip creating GL code for branch petty cash account
    // branch: function (frm) {
    //     if (frm.doc.branch) {
    //         frappe.db.get_value('Sahayog Branch', frm.doc.branch, 'branch_type')
    //             .then(r => {
    //                 if (r && r.message) {
    //                     let b_type = r.message.branch_type;

    //                     if (!frm.doc.monthly_limit || frm.doc.monthly_limit == 0) {
    //                         if (b_type === "Metro") {
    //                             frm.set_value('monthly_limit', 30000);
    //                         } else {
    //                             frm.set_value('monthly_limit', 25000);
    //                         }
    //                     }

    //                     if (b_type === "Zonal") {
    //                         frm.set_value('gl_sub_code', '');
    //                     } else {
    //                         frm.trigger('generate_gl_code');
    //                     }
    //                 }
    //             });
    //     } else {
    //         frm.set_value('gl_sub_code', '');
    //     }
    // },


    branch: function (frm) {
        if (frm.doc.branch) {
            frappe.db.get_value('Sahayog Branch', frm.doc.branch, ['branch_type', 'entity_id', 'entity_type'])
                .then(r => {
                    if (r && r.message) {
                        let b_type = r.message.branch_type;

                        if (!frm.doc.monthly_limit || frm.doc.monthly_limit == 0) {
                            if (b_type === "Metro") {
                                frm.set_value('monthly_limit', 30000);
                            } else {
                                frm.set_value('monthly_limit', 25000);
                            }
                        }

                        if (b_type === "Zonal") {
                            frm.set_value('gl_sub_code', '');
                            frm.set_value('entity_id', r.message.entity_id || '');
                            frm.set_value('entity_type', r.message.entity_type || '');
                        } else {
                            frm.set_value('entity_id', '');
                            frm.set_value('entity_type', '');
                            frm.trigger('generate_gl_code');
                        }
                    }
                });
        } else {
            frm.set_value('gl_sub_code', '');
            frm.set_value('entity_id', '');
            frm.set_value('entity_type', '');
        }
    },

    generate_gl_code: function (frm) {
        if (!frm.doc.branch) {
            frm.set_value('gl_sub_code', '');
            return;
        }

        if (frm.doc.branch_type === "Zonal") {
            frm.set_value('gl_sub_code', '');
            return;
        }

        let account_suffix = "01390200001";
        let full_code = frm.doc.branch + account_suffix;
        frm.set_value('gl_sub_code', full_code);
    }
});


function toggle_entity_fields(frm) {
    const is_admin = frappe.session.user === 'Administrator';

    frm.set_df_property('entity_id', 'read_only', is_admin ? 0 : 1);
    frm.set_df_property('entity_type', 'read_only', is_admin ? 0 : 1);
}