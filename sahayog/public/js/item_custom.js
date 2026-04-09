frappe.ui.form.on('Item', {
	refresh(frm) {
		// Remove is_stock_item dependency for has_serial_no and serial_no_series
		frm.set_df_property('has_serial_no', 'depends_on', '');
		frm.set_df_property('serial_no_series', 'depends_on', 'has_serial_no');
		frm.set_df_property('has_batch_no', 'depends_on', '');
	}
});
