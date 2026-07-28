// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Function", {
	refresh(frm) {
		frm.trigger("render_parameter_widget");
	},

	after_save(frm) {
		frm.trigger("render_parameter_widget");
	},

	render_parameter_widget(frm) {
		const wrapper = frm.get_field("function_widget").$wrapper;
		wrapper.empty();

		if (frm.is_new()) {
			wrapper.html(`
				<div class="parameter-widget-placeholder">
					<i class="fa fa-info-circle"></i>
					Please save the Function first to manage Parameters.
				</div>
			`);
			return;
		}

		// Inject styles
		if (!document.getElementById("parameter-widget-styles")) {
			const style = document.createElement("style");
			style.id = "parameter-widget-styles";
			style.textContent = `
				.param-widget-wrap {
					font-family: var(--font-stack);
					margin: 12px 0;
				}
				.param-widget-header {
					display: flex;
					align-items: center;
					justify-content: space-between;
					margin-bottom: 14px;
				}
				.param-widget-title {
					font-size: 13px;
					font-weight: 700;
					color: var(--text-color);
					display: flex;
					align-items: center;
					gap: 8px;
				}
				.param-widget-title .param-count-badge {
					background: var(--primary);
					color: #fff;
					border-radius: 10px;
					font-size: 11px;
					padding: 1px 8px;
					font-weight: 600;
				}
				.param-add-btn {
					display: flex;
					align-items: center;
					gap: 6px;
					background: var(--primary);
					color: #fff;
					border: none;
					border-radius: 6px;
					padding: 6px 14px;
					font-size: 12px;
					font-weight: 600;
					cursor: pointer;
					transition: background 0.2s, transform 0.1s;
				}
				.param-add-btn:hover {
					background: var(--primary-dark, #4a5cff);
					transform: translateY(-1px);
				}
				.param-tree {
					border: 1px solid var(--border-color);
					border-radius: 10px;
					overflow: hidden;
					background: var(--card-bg);
					box-shadow: 0 1px 4px rgba(0,0,0,0.06);
				}
				.param-tree-empty {
					padding: 32px 16px;
					text-align: center;
					color: var(--text-muted);
					font-size: 13px;
				}
				.param-tree-empty i {
					display: block;
					font-size: 28px;
					margin-bottom: 8px;
					opacity: 0.4;
				}
				.param-row {
					display: flex;
					align-items: center;
					padding: 10px 16px;
					border-bottom: 1px solid var(--border-color);
					transition: background 0.15s;
					gap: 10px;
				}
				.param-row:last-child {
					border-bottom: none;
				}
				.param-row:hover {
					background: var(--highlight-color, #f4f5f7);
				}
				.param-row-icon {
					color: var(--primary);
					font-size: 14px;
					flex-shrink: 0;
				}
				.param-row-name {
					flex: 1;
					font-size: 13px;
					font-weight: 500;
					color: var(--text-color);
				}
				.param-row-name a {
					color: var(--text-color);
					text-decoration: none;
				}
				.param-row-name a:hover {
					color: var(--primary);
					text-decoration: underline;
				}
				.param-row-actions {
					display: flex;
					gap: 6px;
					opacity: 0;
					transition: opacity 0.15s;
				}
				.param-row:hover .param-row-actions {
					opacity: 1;
				}
				.param-action-btn {
					border: none;
					background: transparent;
					cursor: pointer;
					border-radius: 5px;
					padding: 4px 8px;
					font-size: 12px;
					font-weight: 500;
					transition: background 0.15s, color 0.15s;
				}
				.param-action-btn.edit {
					color: var(--primary);
				}
				.param-action-btn.edit:hover {
					background: var(--primary-light, #eef0ff);
				}
				.param-action-btn.delete {
					color: var(--red, #e74c3c);
				}
				.param-action-btn.delete:hover {
					background: #fff0f0;
				}
				.param-inline-form {
					padding: 14px 16px;
					background: var(--highlight-color, #f8f9fa);
					border-top: 1px solid var(--border-color);
					display: flex;
					gap: 10px;
					align-items: center;
					flex-wrap: wrap;
				}
				.param-inline-input {
					flex: 1;
					min-width: 180px;
					height: 34px;
					border: 1px solid var(--border-color);
					border-radius: 6px;
					padding: 0 12px;
					font-size: 13px;
					background: var(--control-bg);
					color: var(--text-color);
					outline: none;
					transition: border-color 0.2s;
				}
				.param-inline-input:focus {
					border-color: var(--primary);
					box-shadow: 0 0 0 3px var(--primary-light, rgba(82,95,255,0.12));
				}
				.param-save-btn {
					height: 34px;
					padding: 0 16px;
					background: var(--primary);
					color: #fff;
					border: none;
					border-radius: 6px;
					font-size: 12px;
					font-weight: 600;
					cursor: pointer;
					transition: background 0.2s;
				}
				.param-save-btn:hover {
					background: var(--primary-dark, #4a5cff);
				}
				.param-cancel-btn {
					height: 34px;
					padding: 0 14px;
					background: transparent;
					color: var(--text-muted);
					border: 1px solid var(--border-color);
					border-radius: 6px;
					font-size: 12px;
					font-weight: 600;
					cursor: pointer;
					transition: border-color 0.2s;
				}
				.param-cancel-btn:hover {
					border-color: var(--text-muted);
					color: var(--text-color);
				}
				.param-loading {
					padding: 20px;
					text-align: center;
					color: var(--text-muted);
					font-size: 13px;
				}
			`;
			document.head.appendChild(style);
		}

		// Build widget shell
		const widget = $(`
			<div class="param-widget-wrap">
				<div class="param-widget-header">
					<div class="param-widget-title">
						<i class="fa fa-sitemap"></i>
						Parameters
						<span class="param-count-badge">...</span>
					</div>
					<button class="param-add-btn">
						<i class="fa fa-plus"></i> Add Parameter
					</button>
				</div>
				<div class="param-tree">
					<div class="param-loading"><i class="fa fa-spinner fa-spin"></i> Loading...</div>
				</div>
			</div>
		`);

		wrapper.append(widget);

		let editingRow = null; // track which row is being edited

		// ─── Render the parameter list ────────────────────────────────────────
		function renderList(params) {
			const tree = widget.find(".param-tree");
			tree.empty();

			// Update badge count
			widget.find(".param-count-badge").text(params.length);

			if (!params.length) {
				tree.append(`
					<div class="param-tree-empty">
						<i class="fa fa-list-ul"></i>
						No parameters yet. Click "Add Parameter" to create one.
					</div>
				`);
			} else {
				params.forEach((p) => {
					const row = $(`
						<div class="param-row" data-name="${p.name}">
							<i class="fa fa-tag param-row-icon"></i>
							<div class="param-row-name">
								<a href="/app/parameter/${encodeURIComponent(p.name)}" target="_blank">
									${frappe.utils.escape_html(p.parameter)}
								</a>
							</div>
							<div class="param-row-actions">
								<button class="param-action-btn edit" data-name="${p.name}" data-value="${frappe.utils.escape_html(p.parameter)}">
									<i class="fa fa-pencil"></i> Edit
								</button>
								<button class="param-action-btn delete" data-name="${p.name}">
									<i class="fa fa-trash"></i> Delete
								</button>
							</div>
						</div>
					`);
					tree.append(row);
				});
			}
		}

		// ─── Inline form (add / edit) ────────────────────────────────────────
		function showInlineForm(mode = "add", name = null, currentValue = "") {
			// Remove existing form if open
			widget.find(".param-inline-form").remove();
			editingRow = name;

			const form = $(`
				<div class="param-inline-form">
					<input
						class="param-inline-input"
						type="text"
						placeholder="Enter parameter name..."
						value="${frappe.utils.escape_html(currentValue)}"
					/>
					<button class="param-save-btn">${mode === "edit" ? "Update" : "Save"}</button>
					<button class="param-cancel-btn">Cancel</button>
				</div>
			`);

			widget.find(".param-tree").append(form);
			form.find(".param-inline-input").focus();

			// Save
			form.find(".param-save-btn").on("click", function () {
				const val = form.find(".param-inline-input").val().trim();
				if (!val) {
					frappe.msgprint("Parameter name cannot be empty.");
					return;
				}

				if (mode === "add") {
					createParameter(val);
				} else {
					updateParameter(name, val);
				}
			});

			// Enter key
			form.find(".param-inline-input").on("keydown", function (e) {
				if (e.key === "Enter") form.find(".param-save-btn").trigger("click");
				if (e.key === "Escape") form.find(".param-cancel-btn").trigger("click");
			});

			// Cancel
			form.find(".param-cancel-btn").on("click", function () {
				form.remove();
				editingRow = null;
			});
		}

		// ─── CRUD operations ─────────────────────────────────────────────────
		function fetchParameters() {
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Parameter",
					filters: { function: frm.doc.name },
					fields: ["name", "parameter"],
					order_by: "creation asc",
					limit_page_length: 500,
				},
				callback(r) {
					renderList(r.message || []);
				},
			});
		}

		function createParameter(paramName) {
			frappe.call({
				method: "frappe.client.insert",
				args: {
					doc: {
						doctype: "Parameter",
						function: frm.doc.name,
						parameter: paramName,
					},
				},
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: `Parameter "${paramName}" added.`, indicator: "green" });
						widget.find(".param-inline-form").remove();
						fetchParameters();
					}
				},
			});
		}

		function updateParameter(name, newValue) {
			frappe.call({
				method: "frappe.client.set_value",
				args: {
					doctype: "Parameter",
					name: name,
					fieldname: "parameter",
					value: newValue,
				},
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: `Parameter updated.`, indicator: "green" });
						widget.find(".param-inline-form").remove();
						editingRow = null;
						fetchParameters();
					}
				},
			});
		}

		function deleteParameter(name, paramName) {
			frappe.confirm(
				`Are you sure you want to delete <b>${paramName}</b>?`,
				function () {
					frappe.call({
						method: "frappe.client.delete",
						args: { doctype: "Parameter", name: name },
						callback(r) {
							if (!r.exc) {
								frappe.show_alert({ message: `Parameter "${paramName}" deleted.`, indicator: "orange" });
								fetchParameters();
							}
						},
					});
				}
			);
		}

		// ─── Event delegation ─────────────────────────────────────────────────
		widget.find(".param-add-btn").on("click", function () {
			showInlineForm("add");
		});

		widget.on("click", ".param-action-btn.edit", function () {
			const name = $(this).data("name");
			const value = $(this).data("value");
			showInlineForm("edit", name, value);
		});

		widget.on("click", ".param-action-btn.delete", function () {
			const name = $(this).data("name");
			const paramName = $(this).closest(".param-row").find(".param-row-name a").text().trim();
			deleteParameter(name, paramName);
		});

		// ─── Initial load ─────────────────────────────────────────────────────
		fetchParameters();
	},
});
