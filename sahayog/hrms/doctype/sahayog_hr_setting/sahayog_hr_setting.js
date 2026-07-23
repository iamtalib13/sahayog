// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Sahayog HR Setting", {
	refresh(frm) {
		if (!frm.doc.employee_master) return;

		frm.add_custom_button(__("Insert Employee"), () => {
			frappe.confirm(
				__("Are you sure you want to insert new employees from the uploaded file?"),
				() => {
					run_batch_import(frm, "insert");
				}
			);
		}, __("Action"));

		frm.add_custom_button(__("Update Employee"), () => {
			frappe.confirm(
				__("Are you sure you want to update existing employees from the uploaded file?"),
				() => {
					run_batch_import(frm, "update");
				}
			);
		}, __("Action"));
	},
});

function run_batch_import(frm, mode) {
	const action_label = mode === "insert" ? __("Insert") : __("Update");
	const batch_size = 250;

	frappe.call({
		method: "sahayog.hrms.doctype.sahayog_hr_setting.sahayog_hr_setting.init_import",
		args: { mode: mode, batch_size: batch_size },
		freeze: true,
		freeze_message: __("Reading file and calculating batches..."),
		callback: async (res) => {
			if (!res.message) return;
			const { total_rows, total_batches } = res.message;

			if (!total_rows || total_rows === 0) {
				frappe.msgprint(__("No data rows found in the uploaded file."));
				return;
			}

			let aggregated = {
				inserted: 0,
				updated: 0,
				skipped: 0,
				failed: 0,
				errors: [],
				inserted_numbers: [],
				updated_numbers: [],
			};

			const progress_title = __("{0}ing Employees ({1} Records)", [action_label, total_rows]);

			for (let b = 0; b < total_batches; b++) {
				const current_row_count = Math.min((b + 1) * batch_size, total_rows);
				const pct = Math.round(((b + 1) / total_batches) * 100);

				frappe.show_progress(
					progress_title,
					pct,
					100,
					__("Processing batch {0} of {1} ({2}/{3} rows)...", [b + 1, total_batches, current_row_count, total_rows])
				);

				try {
					const batch_res = await call_batch_with_retry(mode, b, batch_size, 3);

					if (batch_res && batch_res.message) {
						const m = batch_res.message;
						aggregated.inserted += m.inserted || 0;
						aggregated.updated += m.updated || 0;
						aggregated.skipped += m.skipped || 0;
						aggregated.failed += m.failed || 0;
						if (m.errors && m.errors.length) {
							aggregated.errors.push(...m.errors);
						}
						if (m.inserted_numbers && m.inserted_numbers.length) {
							aggregated.inserted_numbers.push(...m.inserted_numbers);
						}
						if (m.updated_numbers && m.updated_numbers.length) {
							aggregated.updated_numbers.push(...m.updated_numbers);
						}
					}
				} catch (err) {
					console.error("Error in batch " + (b + 1), err);
					const rows_in_batch = Math.min(batch_size, total_rows - b * batch_size);
					aggregated.failed += rows_in_batch;

					let err_msg = "Network or server connection error";
					if (err) {
						if (typeof err === "string") err_msg = err;
						else if (err.message) err_msg = err.message;
						else if (err.statusText && err.status === 0) err_msg = "Network request failed (status 0)";
						else if (err._server_messages) {
							try {
								const msgs = JSON.parse(err._server_messages);
								err_msg = msgs.map((m) => JSON.parse(m).message).join("; ");
							} catch (e) {
								err_msg = err._server_messages;
							}
						} else {
							err_msg = JSON.stringify(err);
						}
					}
					aggregated.errors.push(`Batch ${b + 1} failed after retries: ${err_msg}`);
				}
			}

			frappe.show_progress(progress_title, 100, 100, __("Finalizing summary..."));

			frappe.call({
				method: "sahayog.hrms.doctype.sahayog_hr_setting.sahayog_hr_setting.finish_import",
				args: { mode: mode, summary_data: aggregated },
				callback: (final_res) => {
					setTimeout(() => {
						frappe.hide_progress();
					}, 800);
					frm.refresh();
					frappe.msgprint({
						title: __("Import Complete"),
						message: final_res.message || __("Done"),
						indicator: mode === "insert" ? "green" : "blue",
					});
				},
			});
		},
	});
}

async function call_batch_with_retry(mode, batch_index, batch_size, max_retries = 3) {
	for (let attempt = 1; attempt <= max_retries; attempt++) {
		try {
			const res = await frappe.call({
				method: "sahayog.hrms.doctype.sahayog_hr_setting.sahayog_hr_setting.process_batch",
				args: { mode: mode, batch_index: batch_index, batch_size: batch_size },
			});
			return res;
		} catch (err) {
			console.warn(`Batch ${batch_index + 1} attempt ${attempt} failed:`, err);
			if (attempt === max_retries) {
				throw err;
			}
			// Wait 1.5s before retrying
			await new Promise((resolve) => setTimeout(resolve, 1500));
		}
	}
}
