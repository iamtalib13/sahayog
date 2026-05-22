frappe.ui.form.on('Asset', {
	refresh: function(frm) {
		if (frm.is_new()) {
			frm.set_value('is_existing_asset', 1);
			frm.set_value('asset_owner', 'Company');
		}

		// Array of fieldnames that should only be visible to 'System Manager'
		const system_manager_only_fields = [
			'is_composite_asset',
			'depreciation_schedule_sb',
			'accounting_dimensions_section',
			'insurance_details',
			'asset_owner',
			'asset_owner_company'
		];

		const is_system_manager = frappe.user.has_role('System Manager');

		system_manager_only_fields.forEach(field => {
			frm.toggle_display(field, is_system_manager);
		});
	}
});
