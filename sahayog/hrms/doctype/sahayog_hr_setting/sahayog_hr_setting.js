// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Sahayog HR Setting", {
	refresh(frm) {
		const user_roles = frappe.user_roles || [];
		const is_hr_manager = user_roles.includes("HR Manager");
		const is_system_manager = user_roles.includes("System Manager");
		const is_hr_support = user_roles.includes("HR Support Manager") || user_roles.includes("HR Support Executive");

		// JSON mein allow_hr_to_mark_attendance read_only:1 hai,
		// isliye baki roles ke liye ise wapas editable karna padega.
		if (!is_hr_manager || is_system_manager || is_hr_support) {
			frm.set_df_property("allow_hr_to_mark_attendance", "read_only", 0);
		}

		// HR Manager (jo System Manager / HR Support nahi hai):
		// sirf allow_hr_to_mark_attendance editable, baki sab read-only.
		if (is_hr_manager && !is_system_manager && !is_hr_support) {
			frm.set_df_property("allow_hr_to_mark_attendance", "read_only", 0);
			const layout_types = ["Section Break", "Column Break", "Tab Break"];
			(frm.meta.fields || []).forEach((field) => {
				if (
					field.fieldname &&
					field.fieldname !== "allow_hr_to_mark_attendance" &&
					!layout_types.includes(field.fieldtype)
				) {
					frm.set_df_property(field.fieldname, "read_only", 1);
				}
			});
		}

		if (!frm.doc.employee_master || (is_hr_manager && !is_system_manager && !is_hr_support)) return;

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

		frm.add_custom_button(__("Load File Headers"), () => {
			load_file_headers(frm);
		}, __("Action"));
	},

	employee_master(frm) {
		if (frm.doc.employee_master) {
			load_file_headers(frm);
		}
	},
});

function load_file_headers(frm) {
	frappe.call({
		method: "sahayog.api.employee_master_import.get_file_headers",
		callback: (res) => {
			if (!res.message || !res.message.headers || !res.message.headers.length) {
				frappe.msgprint(__("No headers found in the uploaded file."));
				return;
			}

			const mappings = res.message.mappings || [];
			frm.clear_table("field_mappings");

			mappings.forEach((m) => {
				const row = frm.add_child("field_mappings");
				row.source_column = m.source_column;
				row.target_field = m.target_field || m.source_column.toLowerCase().replace(/[\s\-_.]+/g, "_");
				row.is_mandatory = 0;
				row.enabled = 1;
			});

			frm.refresh_field("field_mappings");
			frappe.msgprint(__("{0} field mappings loaded from file.", [mappings.length]));
		},
	});
}

function run_batch_import(frm, mode) {
	const action_label = mode === "insert" ? __("Insert") : __("Update");
	const batch_size = 250;

	frappe.call({
		method: "sahayog.hrms.doctype.sahayog_hr_setting.sahayog_hr_setting.init_import",
		args: { mode: mode, batch_size: batch_size },
		freeze: true,
		freeze_message: __("Reading file and preparing import..."),
		callback: async (res) => {
			if (!res.message) return;
			const total_rows = res.message.total_rows;
			const eff_batch_size = res.message.batch_size || batch_size;
			const total_batches = res.message.total_batches;

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
				const current_row_count = Math.min((b + 1) * eff_batch_size, total_rows);
				const pct = Math.round(((b + 1) / total_batches) * 100);

				frappe.show_progress(
					progress_title,
					pct,
					100,
					__("Processing record {0} of {1}...", [current_row_count, total_rows])
				);

				try {
					const batch_res = await call_batch_with_retry(mode, b, eff_batch_size, 3);

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
					const rows_in_batch = Math.min(eff_batch_size, total_rows - b * eff_batch_size);
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
					aggregated.errors.push(`Record range ${b * eff_batch_size + 1} to ${current_row_count} failed after retries: ${err_msg}`);
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
