frappe.ui.form.on('Workspace', {
    refresh: function (frm) {
        //make non read only to public check field in workspace
        frm.set_df_property("public", "read_only", 0);
    },
});