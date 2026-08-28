frappe.listview_settings["Employee"] = {
	onload: function (listview) {
		listview.page.add_inner_button(
			__("Process Relieved Employees"),
			function () {
				frappe.confirm(
					__(
						"Are you sure you want to mark all Active employees with past relieving date as 'Left' and disable their User accounts?"
					),
					function () {
						frappe.call({
							method: "sahayog.tasks.auto_process_relieved_employees",
							freeze: true,
							freeze_message: __("Processing relieved employees..."),
							callback: function (r) {
								if (r.message) {
									frappe.msgprint({
										title: __("Process Completed"),
										indicator: r.message.error_count > 0 ? "orange" : "green",
										message: r.message.message,
									});
									listview.refresh();
								}
							},
						});
					}
				);
			},
			__("Actions")
		);
	},
};
