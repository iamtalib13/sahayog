// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Function", {
	refresh(frm) { frm.trigger("render_tree_widget"); },
	after_save(frm) { frm.trigger("render_tree_widget"); },

	render_tree_widget(frm) {
		const wrapper = frm.get_field("function_widget").$wrapper;
		wrapper.empty();

		// ── Styles ─────────────────────────────────────────────────────────────
		if (!document.getElementById("tw-styles")) {
			const s = document.createElement("style");
			s.id = "tw-styles";
			s.textContent = `
			@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

			.tw-root * { box-sizing: border-box; }
			.tw-root {
				font-family: 'Inter', var(--font-stack, sans-serif);
				font-size: 13px;
				margin: 8px 0 20px;
			}

			/* ── Card shell ── */
			.tw-card {
				border: 1px solid var(--border-color);
				border-radius: 10px;
				background: var(--card-bg, #fff);
				box-shadow: 0 1px 6px rgba(0,0,0,0.06);
				overflow: hidden;
			}

			/* ── Card header ── */
			.tw-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 12px 16px;
				border-bottom: 1px solid var(--border-color);
				background: var(--subtle-fg, #fafafa);
				gap: 10px;
			}
			.tw-header-left {
				display: flex;
				align-items: center;
				gap: 10px;
				flex: 1;
				min-width: 0;
			}
			.tw-toggle-btn {
				width: 22px;
				height: 22px;
				border-radius: 5px;
				border: 1px solid var(--border-color);
				background: var(--card-bg, #fff);
				display: flex;
				align-items: center;
				justify-content: center;
				cursor: pointer;
				transition: background 0.15s, border-color 0.15s;
				flex-shrink: 0;
				color: var(--text-muted);
				font-size: 10px;
			}
			.tw-toggle-btn:hover {
				background: var(--primary-light, #e8f4ff);
				border-color: var(--primary, #0176d3);
				color: var(--primary, #0176d3);
			}
			.tw-toggle-btn i { transition: transform 0.2s ease; }
			.tw-toggle-btn.collapsed i { transform: rotate(-90deg); }

			.tw-header-info { min-width: 0; }
			.tw-header-label {
				font-size: 10px;
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.07em;
				color: var(--text-muted);
				margin-bottom: 1px;
			}
			.tw-header-name {
				font-size: 14px;
				font-weight: 700;
				color: var(--text-color);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.tw-header-right {
				display: flex;
				align-items: center;
				gap: 8px;
				flex-shrink: 0;
			}
			.tw-count-pill {
				font-size: 11px;
				font-weight: 600;
				color: var(--text-muted);
				background: var(--border-color);
				border-radius: 20px;
				padding: 2px 9px;
				min-width: 24px;
				text-align: center;
				transition: background 0.2s, color 0.2s;
			}
			.tw-count-pill.has-items {
				background: var(--primary-light, #dceeff);
				color: var(--primary, #0176d3);
			}
			.tw-add-btn {
				display: flex;
				align-items: center;
				gap: 5px;
				background: var(--primary, #0176d3);
				color: #fff;
				border: none;
				border-radius: 6px;
				padding: 6px 13px;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: filter 0.15s, transform 0.1s;
				letter-spacing: 0.01em;
				font-family: inherit;
			}
			.tw-add-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
			.tw-add-btn:active { transform: translateY(0); filter: brightness(0.97); }

			/* ── Tree body ── */
			.tw-body {
				padding: 8px 0 4px;
				transition: all 0.2s ease;
			}

			/* ── Empty state ── */
			.tw-empty-state {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: 36px 24px;
				gap: 8px;
				text-align: center;
			}
			.tw-empty-icon {
				width: 44px;
				height: 44px;
				background: var(--subtle-fg, #f3f4f6);
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				color: var(--text-muted);
				font-size: 18px;
				margin-bottom: 4px;
			}
			.tw-empty-title {
				font-size: 13px;
				font-weight: 600;
				color: var(--text-color);
			}
			.tw-empty-sub {
				font-size: 12px;
				color: var(--text-muted);
				line-height: 1.5;
			}
			.tw-empty-cta {
				margin-top: 6px;
				display: flex;
				align-items: center;
				gap: 5px;
				background: transparent;
				color: var(--primary, #0176d3);
				border: 1.5px dashed var(--primary, #0176d3);
				border-radius: 6px;
				padding: 6px 16px;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: background 0.15s;
				font-family: inherit;
			}
			.tw-empty-cta:hover { background: var(--primary-light, #e8f4ff); }

			/* ── Tree lines + rows ── */
			.tw-tree-list { padding: 0 12px 8px; }
			.tw-tree-item {
				display: flex;
				flex-direction: column;
				position: relative;
				padding-left: 20px;
				margin-bottom: 1px;
			}
			/* Vertical trunk line */
			.tw-tree-item:not(:last-child)::before {
				content: '';
				position: absolute;
				left: 7px;
				top: 28px;
				bottom: -1px;
				width: 1.5px;
				background: var(--border-color);
				border-radius: 1px;
			}
			/* Horizontal branch line */
			.tw-tree-item::after {
				content: '';
				position: absolute;
				left: 7px;
				top: 18px;
				width: 13px;
				height: 1.5px;
				background: var(--border-color);
				border-radius: 1px;
			}

			/* ── Parameter row ── */
			.tw-param-row {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 7px 10px;
				border-radius: 7px;
				cursor: default;
				transition: background 0.12s;
				border: 1.5px solid transparent;
			}
			.tw-param-row:hover { background: var(--highlight-color, #f0f5ff); }
			.tw-param-row.is-editing {
				background: #fffbf0;
				border-color: #f0c040;
				border-radius: 7px;
			}

			.tw-param-dot {
				width: 7px;
				height: 7px;
				border-radius: 50%;
				background: var(--border-color);
				flex-shrink: 0;
				border: 1.5px solid var(--text-muted);
				transition: border-color 0.15s, background 0.15s;
			}
			.tw-param-row:hover .tw-param-dot { border-color: var(--primary, #0176d3); }
			.tw-param-row.is-editing .tw-param-dot { border-color: #e0a800; background: #ffe08a; }

			.tw-param-name {
				flex: 1;
				font-weight: 500;
				color: var(--text-color);
				font-size: 13px;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			/* ── Row actions ── */
			.tw-row-actions {
				display: flex;
				gap: 2px;
				opacity: 0;
				transition: opacity 0.15s;
				flex-shrink: 0;
			}
			.tw-param-row:hover .tw-row-actions,
			.tw-param-row.is-editing .tw-row-actions { opacity: 1; }

			.tw-icon-btn {
				width: 26px;
				height: 26px;
				display: flex;
				align-items: center;
				justify-content: center;
				border: none;
				background: transparent;
				border-radius: 5px;
				cursor: pointer;
				color: var(--text-muted);
				font-size: 12px;
				transition: background 0.12s, color 0.12s;
				font-family: inherit;
			}
			.tw-icon-btn:hover { background: var(--border-color); color: var(--text-color); }
			.tw-icon-btn.del:hover { background: #ffe5e5; color: #c0392b; }

			/* ── Inline row edit ── */
			.tw-row-input {
				flex: 1;
				height: 28px;
				border: 1.5px solid var(--primary, #0176d3);
				border-radius: 5px;
				padding: 0 9px;
				font-size: 13px;
				font-weight: 500;
				color: var(--text-color);
				background: var(--card-bg, #fff);
				outline: none;
				box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
				font-family: inherit;
				min-width: 0;
			}
			.tw-row-save {
				height: 26px;
				padding: 0 11px;
				background: var(--primary, #0176d3);
				color: #fff;
				border: none;
				border-radius: 5px;
				font-size: 11px;
				font-weight: 600;
				cursor: pointer;
				font-family: inherit;
				white-space: nowrap;
				transition: filter 0.12s;
			}
			.tw-row-save:hover { filter: brightness(1.1); }
			.tw-row-cancel {
				height: 26px;
				padding: 0 9px;
				background: transparent;
				color: var(--text-muted);
				border: 1px solid var(--border-color);
				border-radius: 5px;
				font-size: 11px;
				font-weight: 600;
				cursor: pointer;
				font-family: inherit;
				white-space: nowrap;
				transition: border-color 0.12s, color 0.12s;
			}
			.tw-row-cancel:hover { color: var(--text-color); border-color: var(--text-muted); }

			/* ── Add-param inline form (new row) ── */
			.tw-add-row {
				display: none;
				align-items: center;
				gap: 8px;
				padding: 7px 10px;
				border-radius: 7px;
				border: 1.5px dashed var(--primary, #0176d3);
				background: var(--primary-light, #f0f7ff);
				margin: 4px 12px 8px;
				animation: tw-fade-in 0.15s ease;
			}
			.tw-add-row.visible { display: flex; }
			.tw-add-row-icon { color: var(--primary, #0176d3); font-size: 11px; flex-shrink: 0; }
			.tw-add-input {
				flex: 1;
				height: 28px;
				border: 1.5px solid var(--primary, #0176d3);
				border-radius: 5px;
				padding: 0 9px;
				font-size: 13px;
				font-weight: 500;
				color: var(--text-color);
				background: #fff;
				outline: none;
				box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
				font-family: inherit;
				min-width: 0;
			}
			.tw-add-save {
				height: 26px;
				padding: 0 12px;
				background: var(--primary, #0176d3);
				color: #fff;
				border: none;
				border-radius: 5px;
				font-size: 11px;
				font-weight: 600;
				cursor: pointer;
				font-family: inherit;
				white-space: nowrap;
				transition: filter 0.12s;
			}
			.tw-add-save:hover { filter: brightness(1.1); }
			.tw-add-cancel {
				height: 26px;
				padding: 0 9px;
				background: transparent;
				color: var(--text-muted);
				border: 1px solid var(--border-color);
				border-radius: 5px;
				font-size: 11px;
				cursor: pointer;
				font-family: inherit;
			}

			/* ── Skeleton loading ── */
			.tw-skeleton-wrap { padding: 8px 12px 12px; }
			.tw-skeleton-row {
				display: flex;
				align-items: center;
				gap: 10px;
				padding: 7px 10px;
				margin-bottom: 2px;
			}
			.tw-skel {
				border-radius: 4px;
				background: linear-gradient(90deg, var(--border-color) 25%, var(--subtle-fg, #f0f0f0) 50%, var(--border-color) 75%);
				background-size: 200% 100%;
				animation: tw-shimmer 1.3s infinite;
			}
			.tw-skel-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
			.tw-skel-line { height: 12px; }
			@keyframes tw-shimmer { to { background-position: -200% 0; } }
			@keyframes tw-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
			.tw-tree-item { animation: tw-fade-in 0.18s ease both; }

			/* ── Keyboard hint ── */
			.tw-kbd-hint {
				font-size: 10px;
				color: var(--text-muted);
				padding: 4px 16px 10px;
				display: none;
				gap: 10px;
				align-items: center;
			}
			.tw-add-row.visible ~ .tw-kbd-hint,
			.tw-kbd-hint.visible { display: flex; }
			.tw-kbd {
				display: inline-flex;
				align-items: center;
				background: var(--subtle-fg, #f3f3f3);
				border: 1px solid var(--border-color);
				border-radius: 3px;
				padding: 0 5px;
				font-size: 10px;
				font-weight: 600;
				color: var(--text-muted);
				height: 16px;
			}
			`;
			document.head.appendChild(s);
		}

		// ── Guard: unsaved ──────────────────────────────────────────────────────
		if (frm.is_new()) {
			wrapper.html(`
				<div class="tw-root">
					<div class="tw-card">
						<div class="tw-empty-state">
							<div class="tw-empty-icon"><i class="fa fa-save"></i></div>
							<div class="tw-empty-title">Save first</div>
							<div class="tw-empty-sub">Save this Function to start managing Parameters.</div>
						</div>
					</div>
				</div>
			`);
			return;
		}

		const funcName = frappe.utils.escape_html(frm.doc.function || frm.doc.name);
		let params    = [];
		let treeOpen  = true;

		// ── Build DOM ───────────────────────────────────────────────────────────
		function buildUI() {
			return $(`
				<div class="tw-root">
					<div class="tw-card">

						<!-- Header -->
						<div class="tw-header">
							<div class="tw-header-left">
								<button class="tw-toggle-btn" id="tw-toggle">
									<i class="fa fa-chevron-down"></i>
								</button>
								<div class="tw-header-info">
									<div class="tw-header-label">Function</div>
									<div class="tw-header-name">${funcName}</div>
								</div>
							</div>
							<div class="tw-header-right">
								<span class="tw-count-pill" id="tw-count">–</span>
								<button class="tw-add-btn" id="tw-add-btn">
									<i class="fa fa-plus"></i> Add Parameter
								</button>
							</div>
						</div>

						<!-- Body -->
						<div class="tw-body" id="tw-body">
							<!-- skeleton -->
							<div class="tw-skeleton-wrap" id="tw-skeleton">
								${[70,50,85].map(w => `
									<div class="tw-skeleton-row">
										<div class="tw-skel tw-skel-dot"></div>
										<div class="tw-skel tw-skel-line" style="width:${w}%"></div>
									</div>
								`).join("")}
							</div>
							<!-- list -->
							<div class="tw-tree-list" id="tw-list" style="display:none"></div>
							<!-- add row -->
							<div class="tw-add-row" id="tw-add-row">
								<i class="fa fa-tag tw-add-row-icon"></i>
								<input class="tw-add-input" id="tw-add-input" type="text" placeholder="Enter parameter name…" autocomplete="off" />
								<button class="tw-add-save" id="tw-add-save">Save</button>
								<button class="tw-add-cancel" id="tw-add-cancel">Cancel</button>
							</div>
							<div class="tw-kbd-hint" id="tw-kbd-hint">
								<span><span class="tw-kbd">↵ Enter</span> to save</span>
								<span><span class="tw-kbd">Esc</span> to cancel</span>
							</div>
						</div>

					</div>
				</div>
			`);
		}

		// ── Render list ──────────────────────────────────────────────────────────
		function renderList() {
			const list    = widget.find("#tw-list");
			const count   = widget.find("#tw-count");
			const skeleton = widget.find("#tw-skeleton");

			skeleton.hide();
			list.show().empty();

			count.text(params.length);
			count.toggleClass("has-items", params.length > 0);

			if (!params.length) {
				list.html(`
					<div class="tw-empty-state">
						<div class="tw-empty-icon"><i class="fa fa-tags"></i></div>
						<div class="tw-empty-title">No parameters yet</div>
						<div class="tw-empty-sub">Parameters help define measurable criteria<br>for this Function.</div>
						<button class="tw-empty-cta" id="tw-empty-add">
							<i class="fa fa-plus"></i> Add first parameter
						</button>
					</div>
				`);
				list.find("#tw-empty-add").on("click", () => showAddRow());
				return;
			}

			params.forEach((p, i) => {
				const item = $(`
					<div class="tw-tree-item" style="animation-delay:${i * 0.04}s">
						<div class="tw-param-row" data-name="${p.name}">
							<div class="tw-param-dot"></div>
							<div class="tw-param-name">${frappe.utils.escape_html(p.parameter)}</div>
							<div class="tw-row-actions">
								<button class="tw-icon-btn edit-btn" title="Edit"
									data-name="${p.name}"
									data-value="${frappe.utils.escape_html(p.parameter)}">
									<i class="fa fa-pencil"></i>
								</button>
								<button class="tw-icon-btn del" title="Delete" data-name="${p.name}">
									<i class="fa fa-trash-o"></i>
								</button>
							</div>
						</div>
					</div>
				`);
				list.append(item);
			});
		}

		// ── Inline row edit ──────────────────────────────────────────────────────
		function showRowEdit(btn) {
			// Cancel any open row edit
			widget.find(".tw-param-row.is-editing").each(function () {
				cancelRowEdit($(this));
			});
			// Close add row if open
			hideAddRow();

			const row     = btn.closest(".tw-param-row");
			const name    = btn.data("name");
			const current = btn.data("value");
			const nameDiv = row.find(".tw-param-name");
			const actions = row.find(".tw-row-actions");

			row.addClass("is-editing");
			row.data("orig-name", nameDiv.html());
			row.data("orig-actions", actions.html());

			nameDiv.html(`<input class="tw-row-input" type="text" value="${frappe.utils.escape_html(current)}" autocomplete="off" />`);
			actions.css("opacity","1").html(`
				<button class="tw-row-save">Save</button>
				<button class="tw-row-cancel">Cancel</button>
			`);

			const input = nameDiv.find(".tw-row-input");
			input.focus().select();

			const doSave = () => {
				const val = input.val().trim();
				if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
				doUpdate(name, val);
			};
			const doCancel = () => cancelRowEdit(row);

			actions.find(".tw-row-save").on("click", doSave);
			actions.find(".tw-row-cancel").on("click", doCancel);
			input.on("keydown", e => {
				if (e.key === "Enter")  doSave();
				if (e.key === "Escape") doCancel();
			});
		}

		function cancelRowEdit(row) {
			row.find(".tw-param-name").html(row.data("orig-name"));
			row.find(".tw-row-actions").css("opacity","").html(row.data("orig-actions"));
			row.removeClass("is-editing");
		}

		// ── Add row ──────────────────────────────────────────────────────────────
		function showAddRow() {
			// Cancel any editing
			widget.find(".tw-param-row.is-editing").each(function () {
				cancelRowEdit($(this));
			});

			const addRow  = widget.find("#tw-add-row");
			const hint    = widget.find("#tw-kbd-hint");
			const input   = widget.find("#tw-add-input");

			// Expand tree if collapsed
			if (!treeOpen) toggleTree();

			addRow.addClass("visible");
			hint.addClass("visible");
			input.val("").focus();
		}

		function hideAddRow() {
			widget.find("#tw-add-row").removeClass("visible");
			widget.find("#tw-kbd-hint").removeClass("visible");
			widget.find("#tw-add-input").val("");
		}

		// ── Collapse / expand ────────────────────────────────────────────────────
		function toggleTree() {
			treeOpen = !treeOpen;
			const btn  = widget.find("#tw-toggle");
			const body = widget.find("#tw-body");
			btn.toggleClass("collapsed", !treeOpen);
			if (treeOpen) {
				body.slideDown(180);
			} else {
				hideAddRow();
				body.slideUp(180);
			}
		}

		// ── API ──────────────────────────────────────────────────────────────────
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
				callback(r) {
					params = r.message || [];
					renderList();
				},
			});
		}

		function doCreate(val) {
			frappe.call({
				method: "frappe.client.insert",
				args: { doc: { doctype: "Parameter", function: frm.doc.name, parameter: val } },
				callback(r) {
					if (!r.exc) {
						hideAddRow();
						frappe.show_alert({ message: `<b>${val}</b> added.`, indicator: "green" });
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
						frappe.show_alert({ message: "Parameter updated.", indicator: "green" });
						loadList();
					}
				},
			});
		}

		function doDelete(name, label) {
			frappe.confirm(`Delete parameter <b>${label}</b>?`, () => {
				frappe.call({
					method: "frappe.client.delete",
					args: { doctype: "Parameter", name },
					callback(r) {
						if (!r.exc) {
							frappe.show_alert({ message: `<b>${label}</b> deleted.`, indicator: "orange" });
							loadList();
						}
					},
				});
			});
		}

		// ── Wire up events ───────────────────────────────────────────────────────
		function bindEvents() {
			// Expand / collapse
			widget.find("#tw-toggle").on("click", toggleTree);

			// Header add button
			widget.find("#tw-add-btn").on("click", () => showAddRow());

			// Add row: save
			widget.find("#tw-add-save").on("click", () => {
				const val = widget.find("#tw-add-input").val().trim();
				if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
				doCreate(val);
			});
			// Add row: cancel
			widget.find("#tw-add-cancel").on("click", () => hideAddRow());
			// Add row: keyboard
			widget.find("#tw-add-input").on("keydown", e => {
				if (e.key === "Enter")  widget.find("#tw-add-save").trigger("click");
				if (e.key === "Escape") hideAddRow();
			});

			// Edit button (delegated)
			widget.on("click", ".edit-btn", function () {
				showRowEdit($(this));
			});

			// Delete button (delegated)
			widget.on("click", ".tw-icon-btn.del", function () {
				const name  = $(this).data("name");
				const label = $(this).closest(".tw-param-row").find(".tw-param-name").text().trim();
				doDelete(name, label);
			});
		}

		// ── Mount ─────────────────────────────────────────────────────────────────
		const widget = buildUI();
		wrapper.append(widget);
		bindEvents();
		loadList();
	},
});
