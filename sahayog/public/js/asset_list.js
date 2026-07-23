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
						let m = r.message;
						let indicator = m.error_count > 0 ? "orange" : "green";
						let summary = `<div style="font-family: Inter, sans-serif; font-size: 13px;">`;
						summary += `<div style="margin-bottom: 12px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid ${indicator === "green" ? "#28a745" : "#fd7e14"};">`;
						summary += `<strong style="font-size: 14px; margin-bottom: 8px; display: block;">Remove Serial Summary</strong>`;
						summary += `<table style="width: 100%; border-collapse: collapse;">`;
						summary += `<tr><td style="padding: 3px 0; color: #666;">Total Rows Processed</td><td style="padding: 3px 0; font-weight: 600; text-align: right;">${m.total_rows}</td></tr>`;
						summary += `<tr><td style="padding: 3px 0; color: #28a745;">Successfully Cleared</td><td style="padding: 3px 0; font-weight: 600; color: #28a745; text-align: right;">${m.serial_cleared_count}</td></tr>`;
						summary += `<tr><td style="padding: 3px 0; color: #dc3545;">Failed (Total)</td><td style="padding: 3px 0; font-weight: 600; color: #dc3545; text-align: right;">${m.error_count}</td></tr>`;
						if (m.serial_not_na_count > 0) {
							summary += `<tr><td style="padding: 3px 0; color: #e67e22; padding-left: 16px;">&#8226; Serial Not N/A</td><td style="padding: 3px 0; font-weight: 600; color: #e67e22; text-align: right;">${m.serial_not_na_count}</td></tr>`;
						}
						if (m.asset_not_found_count > 0) {
							summary += `<tr><td style="padding: 3px 0; color: #e67e22; padding-left: 16px;">&#8226; Asset Not Found</td><td style="padding: 3px 0; font-weight: 600; color: #e67e22; text-align: right;">${m.asset_not_found_count}</td></tr>`;
						}
						summary += `</table></div>`;
						if (m.errors && m.errors.length > 0) {
							summary += `<div style="max-height: 200px; overflow-y: auto; border: 1px solid #dcdcdc; border-radius: 4px; padding: 0; font-family: monospace; font-size: 11px;">`;
							summary += `<table style="width: 100%; border-collapse: collapse;">`;
							summary += `<thead><tr style="background: #f1f1f1; position: sticky; top: 0;"><th style="padding: 4px 6px; text-align: left;">Row</th><th style="padding: 4px 6px; text-align: left;">Asset</th><th style="padding: 4px 6px; text-align: left;">Type</th><th style="padding: 4px 6px; text-align: left;">Detail</th></tr></thead><tbody>`;
							m.errors.forEach(function(err) {
								summary += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 4px 6px;">${err.row}</td><td style="padding: 4px 6px;">${err.asset}</td><td style="padding: 4px 6px; color: #dc3545; font-weight: 600;">${err.type}</td><td style="padding: 4px 6px; color: #666;">${err.detail}</td></tr>`;
							});
							summary += `</tbody></table></div>`;
						}
						summary += `</div>`;
						frappe.msgprint({
							title: __("Process Completed"),
							message: summary,
							indicator: indicator
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
						let m = r.message;
						let indicator = m.error_count > 0 ? "orange" : "green";
						let summary = `<div style="font-family: Inter, sans-serif; font-size: 13px;">`;
						summary += `<div style="margin-bottom: 12px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid ${indicator === "green" ? "#28a745" : "#fd7e14"};">`;
						summary += `<strong style="font-size: 14px; margin-bottom: 8px; display: block;">Update Serial Summary</strong>`;
						summary += `<table style="width: 100%; border-collapse: collapse;">`;
						summary += `<tr><td style="padding: 3px 0; color: #666;">Total Rows Processed</td><td style="padding: 3px 0; font-weight: 600; text-align: right;">${m.total_rows}</td></tr>`;
						summary += `<tr><td style="padding: 3px 0; color: #0056b3;">Serial Numbers Set</td><td style="padding: 3px 0; font-weight: 600; color: #0056b3; text-align: right;">${m.serial_set_count}</td></tr>`;
						summary += `<tr><td style="padding: 3px 0; color: #6c757d;">Serial Numbers Cleared</td><td style="padding: 3px 0; font-weight: 600; color: #6c757d; text-align: right;">${m.serial_cleared_count}</td></tr>`;
						summary += `<tr><td style="padding: 3px 0; color: #dc3545;">Failed (Total)</td><td style="padding: 3px 0; font-weight: 600; color: #dc3545; text-align: right;">${m.error_count}</td></tr>`;
						if (m.asset_not_found_count > 0) {
							summary += `<tr><td style="padding: 3px 0; color: #e67e22; padding-left: 16px;">&#8226; Asset Not Found</td><td style="padding: 3px 0; font-weight: 600; color: #e67e22; text-align: right;">${m.asset_not_found_count}</td></tr>`;
						}
						if (m.error_count - m.asset_not_found_count > 0) {
							summary += `<tr><td style="padding: 3px 0; color: #e67e22; padding-left: 16px;">&#8226; Serial Creation Failed</td><td style="padding: 3px 0; font-weight: 600; color: #e67e22; text-align: right;">${m.error_count - m.asset_not_found_count}</td></tr>`;
						}
						summary += `</table></div>`;
						if (m.errors && m.errors.length > 0) {
							summary += `<div style="max-height: 200px; overflow-y: auto; border: 1px solid #dcdcdc; border-radius: 4px; padding: 0; font-family: monospace; font-size: 11px;">`;
							summary += `<table style="width: 100%; border-collapse: collapse;">`;
							summary += `<thead><tr style="background: #f1f1f1; position: sticky; top: 0;"><th style="padding: 4px 6px; text-align: left;">Row</th><th style="padding: 4px 6px; text-align: left;">Asset</th><th style="padding: 4px 6px; text-align: left;">Type</th><th style="padding: 4px 6px; text-align: left;">Detail</th></tr></thead><tbody>`;
							m.errors.forEach(function(err) {
								summary += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 4px 6px;">${err.row}</td><td style="padding: 4px 6px;">${err.asset}</td><td style="padding: 4px 6px; color: #dc3545; font-weight: 600;">${err.type}</td><td style="padding: 4px 6px; color: #666;">${err.detail}</td></tr>`;
							});
							summary += `</tbody></table></div>`;
						}
						summary += `</div>`;
						frappe.msgprint({
							title: __("Process Completed"),
							message: summary,
							indicator: indicator
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
