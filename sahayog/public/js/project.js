frappe.ui.form.on('Project', {
    refresh: function (frm) {
        if (frappe.session.user !== 'Administrator') {
            frm.set_df_property('is_active', 'read_only', 1);
            frm.set_df_property('percent_complete_method', 'read_only', 1);
            frm.set_df_property('customer_details', 'hidden', 1);
            frm.set_df_property('users_section', 'hidden', 1);
        } else {
            frm.set_df_property('is_active', 'read_only', 0);
            frm.set_df_property('percent_complete_method', 'read_only', 0);
        }
    },
});