frappe.listview_settings["Employee"] = {
	onload: function (listview) {
		listview.page.add_inner_button(
			__("Process Relieved Employees"),
			function () {
				// 1. Fetch real-time count first
				frappe.call({
					method: "sahayog.tasks.get_relieved_employees_count",
					freeze: true,
					freeze_message: __("Checking relieved employees..."),
					callback: function (res) {
						const count = res.message || 0;

						if (count === 0) {
							frappe.msgprint({
								title: __("No Records Found"),
								indicator: "blue",
								message: __("There are currently <b>0</b> Active employees with a past relieving date."),
							});
							return;
						}

						// 2. Show confirmation modal with exact count
						frappe.confirm(
							__(
								"Found <b>{0}</b> Active employee(s) whose relieving date has passed.<br><br>Are you sure you want to mark these <b>{0}</b> employee(s) as <b>'Left'</b> and disable their linked User accounts?",
								[count]
							),
							function () {
								// 3. Execute bulk process
								frappe.call({
									method: "sahayog.tasks.auto_process_relieved_employees",
									freeze: true,
									freeze_message: __("Processing {0} relieved employees...", [count]),
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
				});
			},
			__("Actions")
		);
	},
};
