frappe.listview_settings["Asset"] = {
	onload(listview) {
		// Add "Remove Serial" under the "Actions" dropdown group
		listview.page.add_inner_button(__("Remove Serial"), () => {
			let d = new frappe.ui.Dialog({
				title: __("Upload File to Remove Serial Numbers"),
				fields: [
					{
						fieldname: "info",
						fieldtype: "HTML",
						options: `
							<div style="background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
								<strong>File Template Instructions:</strong>
								<ul style="margin: 5px 0 0 20px; padding: 0;">
									<li>Upload a <code>.csv</code> or <code>.xlsx</code> file.</li>
									<li>Column 1 Header: <strong>Asset Code</strong> (Asset name/ID)</li>
									<li>Column 2 Header: <strong>Serial No</strong> (Must be exactly <code>N/A</code> to clear)</li>
									<li>This action will only clear the serial number of assets where the second column has the value <strong>N/A</strong>.</li>
								</ul>
							</div>
						`
					},
					{
						label: __("Attach Excel or CSV File"),
						fieldname: "upload_file",
						fieldtype: "Attach",
						reqd: 1
					}
				],
				primary_action_label: __("Remove Serials"),
				primary_action(values) {
					frappe.call({
						method: "sahayog.doc_events.asset.remove_serial_by_file",
						args: {
							file_url: values.upload_file
						},
						freeze: true,
						freeze_message: __("Processing file..."),
						callback: function(r) {
							if (r.message && r.message.success) {
								let msg = __("Serial numbers removed from {0} assets successfully.", [r.message.updated_count]);
								if (r.message.errors && r.message.errors.length > 0) {
									msg += "<br><br><strong style='color:red;'>Errors / Warnings:</strong><div style='max-height: 150px; overflow-y: auto; border: 1px solid #dcdcdc; padding: 8px; margin-top: 5px; font-family: monospace; font-size: 11px; background-color: #f9f9f9;'>" + r.message.errors.join("<br>") + "</div>";
								}
								frappe.msgprint({
									title: __("Process Completed"),
									message: msg,
									indicator: (r.message.errors && r.message.errors.length > 0) ? "orange" : "green"
								});
								d.hide();
								listview.refresh();
							} else if (r.message && r.message.error) {
								frappe.msgprint({
									title: __("Error"),
									message: __(r.message.error),
									indicator: "red"
								});
							}
						}
					});
				}
			});
			d.show();
		}, __("Actions"));

		// Add "Update Serial" under the "Actions" dropdown group
		listview.page.add_inner_button(__("Update Serial"), () => {
			let d = new frappe.ui.Dialog({
				title: __("Upload File to Update Serial Numbers"),
				fields: [
					{
						fieldname: "info",
						fieldtype: "HTML",
						options: `
							<div style="background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
								<strong>File Template Instructions:</strong>
								<ul style="margin: 5px 0 0 20px; padding: 0;">
									<li>Upload a <code>.csv</code> or <code>.xlsx</code> file.</li>
									<li>Column 1 Header: <strong>Asset Code</strong> (Asset name/ID)</li>
									<li>Column 2 Header: <strong>Serial No</strong> (New serial number value)</li>
									<li>If the serial number does not exist in the <strong>Serial No</strong> DocType, it will be automatically created first.</li>
									<li>If the Serial No column contains <strong>N/A</strong> or is empty, the serial number for that asset will be cleared.</li>
								</ul>
							</div>
						`
					},
					{
						label: __("Attach Excel or CSV File"),
						fieldname: "upload_file",
						fieldtype: "Attach",
						reqd: 1
					}
				],
				primary_action_label: __("Update Serials"),
				primary_action(values) {
					frappe.call({
						method: "sahayog.doc_events.asset.update_serial_by_file",
						args: {
							file_url: values.upload_file
						},
						freeze: true,
						freeze_message: __("Processing file..."),
						callback: function(r) {
							if (r.message && r.message.success) {
								let msg = __("Updated {0} assets successfully.", [r.message.updated_count]);
								if (r.message.errors && r.message.errors.length > 0) {
									msg += "<br><br><strong style='color:red;'>Errors / Warnings:</strong><div style='max-height: 150px; overflow-y: auto; border: 1px solid #dcdcdc; padding: 8px; margin-top: 5px; font-family: monospace; font-size: 11px; background-color: #f9f9f9;'>" + r.message.errors.join("<br>") + "</div>";
								}
								frappe.msgprint({
									title: __("Process Completed"),
									message: msg,
									indicator: (r.message.errors && r.message.errors.length > 0) ? "orange" : "green"
								});
								d.hide();
								listview.refresh();
							} else if (r.message && r.message.error) {
								frappe.msgprint({
									title: __("Error"),
									message: __(r.message.error),
									indicator: "red"
								});
							}
						}
					});
				}
			});
			d.show();
		}, __("Actions"));
	}
};
