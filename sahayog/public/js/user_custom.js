frappe.ui.form.on("User", {
	refresh: function (frm) {
		const is_system_manager = frappe.user.has_role("System Manager");
		frm.set_df_property("enabled", "read_only", is_system_manager ? 0 : 1);
		frm.set_df_property("enabled", "hidden", is_system_manager ? 0 : 1);
	},
});
