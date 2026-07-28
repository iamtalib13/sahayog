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

		// ── Styles (injected once) ────────────────────────────────────────────
		if (!document.getElementById("pw-styles")) {
			const s = document.createElement("style");
			s.id = "pw-styles";
			s.textContent = `
			/* ── Salesforce-inspired Parameter Widget ── */
			.pw-root {
				font-family: var(--font-stack, 'Inter', sans-serif);
				margin: 4px 0 16px;
				color: var(--text-color);
			}

			/* Title */
			.pw-title-block {
				display: flex;
				align-items: flex-start;
				gap: 0;
				margin-bottom: 16px;
				padding-bottom: 12px;
				border-bottom: 1px solid var(--border-color);
			}
			.pw-title-label {
				font-size: 11px;
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.08em;
				color: var(--text-muted);
				margin-bottom: 2px;
			}
			.pw-title-name {
				font-size: 16px;
				font-weight: 700;
				color: var(--text-color);
				line-height: 1.3;
			}
			.pw-title-dot {
				width: 3px;
				height: 36px;
				background: var(--primary, #0176d3);
				border-radius: 2px;
				margin-right: 10px;
				flex-shrink: 0;
				align-self: center;
			}

			/* Card */
			.pw-card {
				border: 1px solid var(--border-color);
				border-radius: 6px;
				background: var(--card-bg, #fff);
				overflow: hidden;
			}

			/* Card header */
			.pw-card-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 10px 14px;
				background: var(--subtle-fg, #f3f3f3);
				border-bottom: 1px solid var(--border-color);
			}
			.pw-card-header-left {
				display: flex;
				align-items: center;
				gap: 7px;
			}
			.pw-card-label {
				font-size: 12px;
				font-weight: 600;
				color: var(--text-color);
				letter-spacing: 0.02em;
			}
			.pw-count {
				font-size: 11px;
				color: var(--text-muted);
				background: var(--border-color);
				border-radius: 10px;
				padding: 1px 7px;
				font-weight: 600;
			}
			.pw-add-btn {
				display: flex;
				align-items: center;
				gap: 4px;
				background: transparent;
				color: var(--primary, #0176d3);
				border: 1px solid var(--primary, #0176d3);
				border-radius: 4px;
				padding: 4px 11px;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: background 0.15s, color 0.15s;
				line-height: 1.5;
			}
			.pw-add-btn:hover {
				background: var(--primary, #0176d3);
				color: #fff;
			}

			/* Empty state */
			.pw-empty {
				padding: 28px 16px;
				text-align: center;
				color: var(--text-muted);
				font-size: 12px;
				line-height: 1.6;
			}
			.pw-empty-icon {
				display: block;
				font-size: 20px;
				margin-bottom: 6px;
				opacity: 0.35;
			}

			/* Rows */
			.pw-row {
				display: flex;
				align-items: center;
				padding: 9px 14px;
				border-bottom: 1px solid var(--border-color);
				gap: 10px;
				transition: background 0.1s;
			}
			.pw-row:last-child { border-bottom: none; }
			.pw-row:hover { background: var(--highlight-color, #f5f8ff); }

			.pw-row-index {
				font-size: 11px;
				color: var(--text-muted);
				width: 18px;
				text-align: right;
				flex-shrink: 0;
			}
			.pw-row-name {
				flex: 1;
				font-size: 13px;
				color: var(--text-color);
				font-weight: 500;
			}
			.pw-row-name a {
				color: var(--primary, #0176d3);
				text-decoration: none;
				font-weight: 500;
			}
			.pw-row-name a:hover {
				text-decoration: underline;
			}
			.pw-row-actions {
				display: flex;
				gap: 2px;
				opacity: 0;
				transition: opacity 0.15s;
			}
			.pw-row:hover .pw-row-actions { opacity: 1; }

			.pw-icon-btn {
				border: none;
				background: transparent;
				cursor: pointer;
				border-radius: 4px;
				padding: 4px 6px;
				color: var(--text-muted);
				font-size: 12px;
				transition: background 0.15s, color 0.15s;
				display: flex;
				align-items: center;
				gap: 3px;
			}
			.pw-icon-btn:hover {
				background: var(--highlight-color, #eef2ff);
				color: var(--text-color);
			}
			.pw-icon-btn.delete:hover {
				background: #fff0f0;
				color: #c0392b;
			}

			/* Inline form */
			.pw-inline-form {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 10px 14px;
				background: var(--highlight-color, #f8f9fc);
				border-top: 1px solid var(--border-color);
				flex-wrap: wrap;
			}
			.pw-inline-form.editing {
				background: #fffbf0;
				border-top-color: #f0c040;
			}
			.pw-input {
				flex: 1;
				min-width: 200px;
				height: 30px;
				border: 1px solid var(--border-color);
				border-radius: 4px;
				padding: 0 10px;
				font-size: 13px;
				color: var(--text-color);
				background: var(--card-bg, #fff);
				outline: none;
				transition: border-color 0.2s, box-shadow 0.2s;
			}
			.pw-input:focus {
				border-color: var(--primary, #0176d3);
				box-shadow: 0 0 0 2px rgba(1,118,211,0.15);
			}
			.pw-btn-primary {
				height: 30px;
				padding: 0 14px;
				background: var(--primary, #0176d3);
				color: #fff;
				border: none;
				border-radius: 4px;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: background 0.15s;
			}
			.pw-btn-primary:hover { filter: brightness(1.08); }
			.pw-btn-neutral {
				height: 30px;
				padding: 0 12px;
				background: transparent;
				color: var(--text-muted);
				border: 1px solid var(--border-color);
				border-radius: 4px;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: border-color 0.15s, color 0.15s;
			}
			.pw-btn-neutral:hover {
				border-color: var(--text-muted);
				color: var(--text-color);
			}
			.pw-loading {
				padding: 18px;
				text-align: center;
				color: var(--text-muted);
				font-size: 12px;
			}
			`;
			document.head.appendChild(s);
		}

		// ── Widget HTML ───────────────────────────────────────────────────────
		if (frm.is_new()) {
			wrapper.html(`
				<div class="pw-root">
					<div class="pw-card">
						<div class="pw-empty">
							<i class="fa fa-info-circle pw-empty-icon"></i>
							Save the Function first to manage Parameters.
						</div>
					</div>
				</div>
			`);
			return;
		}

		const funcName = frappe.utils.escape_html(frm.doc.function || frm.doc.name);

		const widget = $(`
			<div class="pw-root">
				<div class="pw-title-block">
					<div class="pw-title-dot"></div>
					<div>
						<div class="pw-title-label">Function</div>
						<div class="pw-title-name">${funcName}</div>
					</div>
				</div>
				<div class="pw-card">
					<div class="pw-card-header">
						<div class="pw-card-header-left">
							<span class="pw-card-label">Parameters</span>
							<span class="pw-count">0</span>
						</div>
						<button class="pw-add-btn">
							<i class="fa fa-plus"></i> New
						</button>
					</div>
					<div class="pw-list">
						<div class="pw-loading"><i class="fa fa-circle-o-notch fa-spin"></i>&nbsp; Loading…</div>
					</div>
				</div>
			</div>
		`);
		wrapper.append(widget);

		// ── Render list ───────────────────────────────────────────────────────
		function renderList(params) {
			const list = widget.find(".pw-list");
			list.empty();
			widget.find(".pw-count").text(params.length);

			if (!params.length) {
				list.append(`
					<div class="pw-empty">
						<i class="fa fa-list-ul pw-empty-icon"></i>
						No parameters yet.<br>Click <strong>New</strong> to add one.
					</div>
				`);
				return;
			}

			params.forEach((p, i) => {
				const row = $(`
					<div class="pw-row" data-name="${p.name}">
						<span class="pw-row-index">${i + 1}</span>
						<div class="pw-row-name">
							<a href="/app/parameter/${encodeURIComponent(p.name)}" target="_blank">
								${frappe.utils.escape_html(p.parameter)}
							</a>
						</div>
						<div class="pw-row-actions">
							<button class="pw-icon-btn edit" title="Edit"
								data-name="${p.name}"
								data-value="${frappe.utils.escape_html(p.parameter)}">
								<i class="fa fa-pencil"></i>
							</button>
							<button class="pw-icon-btn delete" title="Delete" data-name="${p.name}">
								<i class="fa fa-trash-o"></i>
							</button>
						</div>
					</div>
				`);
				list.append(row);
			});
		}

		// ── Inline form ───────────────────────────────────────────────────────
		function showForm(mode = "add", name = null, current = "") {
			widget.find(".pw-inline-form").remove();

			const label = mode === "edit" ? "Update" : "Save";
			const cls   = mode === "edit" ? " editing" : "";

			const form = $(`
				<div class="pw-inline-form${cls}">
					<input class="pw-input" type="text" placeholder="Parameter name…" value="${frappe.utils.escape_html(current)}" />
					<button class="pw-btn-primary">${label}</button>
					<button class="pw-btn-neutral">Cancel</button>
				</div>
			`);
			widget.find(".pw-list").append(form);
			form.find(".pw-input").focus();

			form.find(".pw-btn-primary").on("click", () => {
				const val = form.find(".pw-input").val().trim();
				if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
				mode === "edit" ? doUpdate(name, val) : doCreate(val);
			});
			form.find(".pw-input").on("keydown", e => {
				if (e.key === "Enter")  form.find(".pw-btn-primary").trigger("click");
				if (e.key === "Escape") form.find(".pw-btn-neutral").trigger("click");
			});
			form.find(".pw-btn-neutral").on("click", () => form.remove());
		}

		// ── API calls ─────────────────────────────────────────────────────────
		function loadList() {
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Parameter",
					filters: { function: frm.doc.name },
					fields: ["name", "parameter"],
					order_by: "creation asc",
					limit_page_length: 500,
				},
				callback(r) { renderList(r.message || []); },
			});
		}

		function doCreate(val) {
			frappe.call({
				method: "frappe.client.insert",
				args: { doc: { doctype: "Parameter", function: frm.doc.name, parameter: val } },
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: `"${val}" added.`, indicator: "green" });
						widget.find(".pw-inline-form").remove();
						loadList();
					}
				},
			});
		}

		function doUpdate(name, val) {
			frappe.call({
				method: "frappe.client.set_value",
				args: { doctype: "Parameter", name, fieldname: "parameter", value: val },
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: "Updated.", indicator: "green" });
						widget.find(".pw-inline-form").remove();
						loadList();
					}
				},
			});
		}

		function doDelete(name, label) {
			frappe.confirm(`Delete <b>${label}</b>?`, () => {
				frappe.call({
					method: "frappe.client.delete",
					args: { doctype: "Parameter", name },
					callback(r) {
						if (!r.exc) {
							frappe.show_alert({ message: `"${label}" deleted.`, indicator: "orange" });
							loadList();
						}
					},
				});
			});
		}

		// ── Events ────────────────────────────────────────────────────────────
		widget.find(".pw-add-btn").on("click", () => showForm("add"));

		widget.on("click", ".pw-icon-btn.edit", function () {
			showForm("edit", $(this).data("name"), $(this).data("value"));
		});

		widget.on("click", ".pw-icon-btn.delete", function () {
			const name  = $(this).data("name");
			const label = $(this).closest(".pw-row").find(".pw-row-name a").text().trim();
			doDelete(name, label);
		});

		// ── Boot ──────────────────────────────────────────────────────────────
		loadList();
	},
});
