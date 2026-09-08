frappe.ui.form.on("Employee", {
	refresh: function (frm) {
		if (!frm.is_new() && (frm.doc.employee_number || frm.doc.name)) {
			frm.add_custom_button(
				__("Update from ZingHR"),
				function () {
					const emp_id = frm.doc.employee_number || frm.doc.name;
					frappe.confirm(
						__(
							"Are you sure you want to fetch and update employee <b>{0}</b> details from ZingHR?",
							[emp_id]
						),
						function () {
							frappe.call({
								method: "sahayog.integration_zinghr.sync_employee_from_zinghr",
								args: {
									employee_name: frm.doc.name,
								},
								freeze: true,
								freeze_message: __("Updating employee details from ZingHR..."),
								callback: function (r) {
									if (r.message && r.message.status === "success") {
										frappe.show_alert({
											message: __(
												"Employee {0} updated successfully from ZingHR!",
												[emp_id]
											),
											indicator: "green",
										});
										frm.reload_doc();
									} else {
										frappe.msgprint({
											title: __("ZingHR Sync Notice"),
											indicator:
												r.message && r.message.status === "not_found"
													? "orange"
													: "red",
											message:
												r.message && r.message.message
													? r.message.message
													: __("Failed to update from ZingHR."),
										});
									}
								},
							});
						}
					);
				},
				__("Actions")
			);
		}
	},
});
