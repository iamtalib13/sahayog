frappe.listview_settings["Employee"] = {
	onload: function (listview) {
		// 1. Process Relieved Employees Action
		listview.page.add_inner_button(
			__("Process Relieved Employees"),
			function () {
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

						frappe.confirm(
							__(
								"Found <b>{0}</b> Active employee(s) whose relieving date has passed.<br><br>Are you sure you want to mark these <b>{0}</b> employee(s) as <b>'Left'</b> and disable their linked User accounts?",
								[count]
							),
							function () {
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

		// 2. Sync from ZingHR Action
		listview.page.add_inner_button(
			__("Sync from ZingHR (Bulk)"),
			function () {
				show_zinghr_sync_dialog(listview);
			},
			__("Actions")
		);
	},
};

function show_zinghr_sync_dialog(listview) {
	const dialog = new frappe.ui.Dialog({
		title: __("Sync Employees from ZingHR"),
		fields: [
			{
				fieldname: "sync_mode",
				fieldtype: "Select",
				label: __("Sync Mode"),
				options: [
					{ label: __("Bulk Insert & Update (All)"), value: "all" },
					{ label: __("Bulk Insert Only (New Employees)"), value: "insert_only" },
					{ label: __("Bulk Update Only (Existing Employees)"), value: "update_only" },
				],
				default: "all",
				reqd: 1,
			},
			{
				fieldname: "col_break_1",
				fieldtype: "Column Break",
			},
			{
				fieldname: "batch_selection",
				fieldtype: "Select",
				label: __("How Many Records to Sync?"),
				options: [
					{ label: __("1 Batch (100 Records - Quick Sync)"), value: "1" },
					{ label: __("5 Batches (500 Records)"), value: "5" },
					{ label: __("10 Batches (1,000 Records)"), value: "10" },
					{ label: __("All Records (Full Sync)"), value: "all" },
				],
				default: "1",
				reqd: 1,
			},
			{
				fieldname: "section_execution",
				fieldtype: "Section Break",
				label: __("Execution Mode"),
			},
			{
				fieldname: "execution_type",
				fieldtype: "Select",
				label: __("Run Mode"),
				options: [
					{ label: __("Live Progress in Desk (Recommended - See real-time progress)"), value: "live" },
					{ label: __("Run in Background Queue (RQ Worker)"), value: "background" },
				],
				default: "live",
				reqd: 1,
			},
			{
				fieldname: "section_dates",
				fieldtype: "Section Break",
				label: __("Date Filters (Optional)"),
			},
			{
				fieldname: "from_date",
				fieldtype: "Date",
				label: __("From Date"),
				description: __("Filter records updated from this date (leave blank for all)"),
			},
			{
				fieldname: "col_break_2",
				fieldtype: "Column Break",
			},
			{
				fieldname: "to_date",
				fieldtype: "Date",
				label: __("To Date"),
				description: __("Filter records updated to this date (leave blank for all)"),
			},
		],
		primary_action_label: __("Start Sync"),
		primary_action: async function () {
			const values = dialog.get_values();
			if (!values) return;

			const sync_mode = values.sync_mode || "all";
			const batch_choice = values.batch_selection || "1";
			const execution_type = values.execution_type || "live";
			const from_date = values.from_date || null;
			const to_date = values.to_date || null;
			const max_batches = batch_choice === "all" ? 0 : parseInt(batch_choice, 10);
			const page_size = 100;

			dialog.hide();

			if (execution_type === "background") {
				// Background worker execution
				const bg_args = {
					sync_mode: sync_mode,
					page_size: page_size,
					run_in_background: 1,
				};
				if (from_date) bg_args.from_date = from_date;
				if (to_date) bg_args.to_date = to_date;
				if (max_batches > 0) bg_args.max_pages = max_batches;

				frappe.call({
					method: "sahayog.integration_zinghr.bulk_sync_from_zinghr",
					args: bg_args,
					freeze: true,
					freeze_message: __("Starting ZingHR background job..."),
					callback: function (r) {
						if (r && r.message) {
							if (r.message.status === "error") {
								frappe.msgprint({
									title: __("Sync Error"),
									indicator: "red",
									message: r.message.message || __("Failed to start background sync."),
								});
								return;
							}
							frappe.show_alert({
								message: __("ZingHR Bulk Sync queued in background!"),
								indicator: "green",
							}, 8);
							frappe.msgprint({
								title: __("Sync Queued in Background"),
								indicator: "blue",
								message: __(
									"{0}<br><br>You can track job progress in <a href='/app/rq-job' target='_blank'><b>Background Jobs (RQ Jobs)</b></a>.",
									[r.message.message || __("Background sync started.")]
								),
							});
						}
					},
					error: function (err) {
						let msg = __("Failed to start background sync.");
						if (typeof err === "string") msg = err;
						else if (err && err.message) msg = typeof err.message === "string" ? err.message : JSON.stringify(err.message);
						else if (err && err.responseJSON) {
							if (err.responseJSON._server_messages) {
								try {
									const msgs = JSON.parse(err.responseJSON._server_messages);
									msg = msgs.map((m) => JSON.parse(m).message).join("<br>");
								} catch (e) {}
							} else if (err.responseJSON.exc) {
								try {
									msg = JSON.parse(err.responseJSON.exc)[0] || msg;
								} catch (e) {
									msg = err.responseJSON.exc;
								}
							}
						}
						frappe.msgprint({
							title: __("Sync Error"),
							indicator: "red",
							message: msg,
						});
					},
				});
				return;
			}

			// Live Progress Execution in Desk
			let current_page = 1;
			let total_fetched = 0;
			let total_inserted = 0;
			let total_updated = 0;
			let total_skipped = 0;
			let all_errors = [];
			let total_records_available = 0;

			const progress_title = __("Syncing Employees from ZingHR");
			frappe.show_progress(progress_title, 5, 100, __("Connecting to ZingHR API..."));

			try {
				while (true) {
					const live_args = {
						page_number: current_page,
						page_size: page_size,
						sync_mode: sync_mode,
					};
					if (from_date) live_args.from_date = from_date;
					if (to_date) live_args.to_date = to_date;

					const batch_resp = await new Promise((resolve, reject) => {
						frappe.call({
							method: "sahayog.integration_zinghr.sync_zinghr_batch",
							args: live_args,
							callback: (res) => resolve(res.message),
							error: (err) => reject(err),
						});
					});

					if (!batch_resp || !batch_resp.fetched || batch_resp.fetched === 0) {
						break;
					}

					total_records_available = batch_resp.total_records || total_records_available;
					total_fetched += batch_resp.fetched;
					total_inserted += batch_resp.inserted || 0;
					total_updated += batch_resp.updated || 0;
					total_skipped += batch_resp.skipped || 0;
					if (batch_resp.errors && batch_resp.errors.length) {
						all_errors.push(...batch_resp.errors);
					}

					const eff_total = max_batches > 0 ? max_batches * page_size : total_records_available;
					const pct = eff_total > 0 ? Math.min(Math.round((total_fetched / eff_total) * 100), 100) : 50;

					frappe.show_progress(
						progress_title,
						pct,
						100,
						__("Batch {0}: Processed {1} records (Inserted: {2}, Updated: {3}, Skipped: {4})...", [
							current_page,
							total_fetched,
							total_inserted,
							total_updated,
							total_skipped,
						])
					);

					if (max_batches > 0 && current_page >= max_batches) {
						break;
					}

					if (batch_resp.fetched < page_size || total_fetched >= total_records_available) {
						break;
					}

					current_page++;
				}

				frappe.show_progress(progress_title, 100, 100, __("Sync finished!"));
				setTimeout(() => {
					frappe.hide_progress();
				}, 1200);

				const summary_html = `
					<div style="font-size:13px;line-height:1.8;">
						<b>Total Fetched from ZingHR:</b> ${total_fetched}<br>
						<b>New Employees Inserted:</b> <span style="color:green;font-weight:bold">${total_inserted}</span><br>
						<b>Existing Employees Updated:</b> <span style="color:blue;font-weight:bold">${total_updated}</span><br>
						<b>Skipped (Exited / Duplicate):</b> ${total_skipped}<br>
						<b>Errors:</b> <span style="color:${all_errors.length ? "red" : "green"};font-weight:bold">${all_errors.length}</span>
						${all_errors.length ? `<br><br><small style="color:red">${all_errors.slice(0, 5).join("<br>")}</small>` : ""}
					</div>
				`;

				frappe.msgprint({
					title: __("ZingHR Bulk Sync Complete"),
					indicator: all_errors.length > 0 ? "orange" : "green",
					message: summary_html,
				});

				listview.refresh();
			} catch (error) {
				console.error("ZingHR sync error:", error);
				frappe.hide_progress();
				let err_msg = "An error occurred during sync.";
				if (typeof error === "string") err_msg = error;
				else if (error && error.message) err_msg = error.message;
				frappe.msgprint({
					title: __("Sync Stopped with Error"),
					indicator: "red",
					message: err_msg,
				});
				listview.refresh();
			}
		},
	});

	dialog.show();
}
