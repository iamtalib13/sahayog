// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Function", {
	refresh(frm) { frm.trigger("render_tree_widget"); },
	after_save(frm) { frm.trigger("render_tree_widget"); },

	render_tree_widget(frm) {
		const wrapper = frm.get_field("function_widget").$wrapper;
		wrapper.empty();

		// ── Styles ────────────────────────────────────────────────────────────
		if (!document.getElementById("tw-styles")) {
			const s = document.createElement("style");
			s.id = "tw-styles";
			s.textContent = `
			.tw-root {
				font-family: var(--font-stack, 'Inter', sans-serif);
				font-size: 13px;
				margin: 6px 0 16px;
				user-select: none;
			}

			/* ── Tree container ── */
			.tw-tree {
				border: 1px solid var(--border-color);
				border-radius: 6px;
				background: var(--card-bg, #fff);
				padding: 12px 16px 16px;
				overflow: hidden;
			}

			/* ── Generic node row ── */
			.tw-node {
				display: flex;
				align-items: center;
				position: relative;
				min-height: 30px;
				padding: 2px 0;
			}

			/* ── Tree lines via pseudo-elements ── */
			.tw-children {
				margin-left: 18px;
				position: relative;
			}
			/* Vertical trunk */
			.tw-children::before {
				content: '';
				position: absolute;
				left: 8px;
				top: 0;
				bottom: 14px;
				width: 1px;
				background: var(--border-color);
			}
			/* Horizontal branch per child */
			.tw-child-wrap {
				position: relative;
				padding-left: 22px;
			}
			.tw-child-wrap::before {
				content: '';
				position: absolute;
				left: 8px;
				top: 16px;
				width: 14px;
				height: 1px;
				background: var(--border-color);
			}

			/* ── Toggle chevron ── */
			.tw-toggle {
				width: 18px;
				height: 18px;
				display: flex;
				align-items: center;
				justify-content: center;
				cursor: pointer;
				color: var(--text-muted);
				flex-shrink: 0;
				border-radius: 3px;
				transition: background 0.12s, color 0.12s;
				margin-right: 4px;
			}
			.tw-toggle:hover {
				background: var(--highlight-color, #eef0f8);
				color: var(--text-color);
			}
			.tw-toggle i {
				font-size: 10px;
				transition: transform 0.18s;
			}
			.tw-toggle.collapsed i { transform: rotate(-90deg); }

			/* ── Node icon ── */
			.tw-icon {
				font-size: 13px;
				margin-right: 6px;
				flex-shrink: 0;
			}
			.tw-icon.root  { color: var(--primary, #0176d3); }
			.tw-icon.leaf  { color: var(--text-muted); }

			/* ── Node label ── */
			.tw-label {
				flex: 1;
				display: flex;
				align-items: center;
				gap: 6px;
				cursor: default;
				border-radius: 4px;
				padding: 3px 6px;
				transition: background 0.12s;
				min-width: 0;
			}
			.tw-label:hover { background: var(--highlight-color, #f0f4ff); }
			.tw-label.selected { background: var(--primary-light, #e8f4ff); }

			.tw-label-text {
				font-weight: 500;
				color: var(--text-color);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.tw-label-text.root-text {
				font-weight: 700;
				font-size: 14px;
			}
			.tw-label-sub {
				font-size: 11px;
				color: var(--text-muted);
				font-weight: 400;
			}

			/* ── Count badge ── */
			.tw-badge {
				font-size: 11px;
				font-weight: 600;
				color: var(--text-muted);
				background: var(--border-color);
				border-radius: 10px;
				padding: 1px 7px;
				flex-shrink: 0;
			}

			/* ── Action buttons (appear on hover) ── */
			.tw-actions {
				display: flex;
				gap: 2px;
				margin-left: 4px;
				opacity: 0;
				transition: opacity 0.15s;
			}
			.tw-label:hover + .tw-actions,
			.tw-actions:hover { opacity: 1; }
			.tw-node:hover .tw-actions { opacity: 1; }
			.tw-root-node .tw-actions { opacity: 1; }

			.tw-btn {
				border: none;
				background: transparent;
				cursor: pointer;
				border-radius: 4px;
				padding: 3px 7px;
				font-size: 11px;
				font-weight: 600;
				color: var(--text-muted);
				transition: background 0.12s, color 0.12s;
				display: flex;
				align-items: center;
				gap: 3px;
				white-space: nowrap;
			}
			.tw-btn:hover { background: var(--highlight-color, #eef0f8); color: var(--text-color); }
			.tw-btn.add   { color: var(--primary, #0176d3); }
			.tw-btn.add:hover { background: #e8f4ff; color: var(--primary, #0176d3); }
			.tw-btn.del:hover { background: #fff0f0; color: #c0392b; }

			/* ── Inline edit form ── */
			.tw-form-wrap {
				padding: 8px 0 4px 0;
			}
			.tw-form {
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 7px 10px;
				border: 1px solid var(--primary, #0176d3);
				border-radius: 5px;
				background: var(--card-bg, #fff);
				box-shadow: 0 0 0 3px rgba(1,118,211,0.08);
			}
			.tw-form-icon { color: var(--primary, #0176d3); font-size: 12px; flex-shrink: 0; }
			.tw-input {
				flex: 1;
				border: none;
				outline: none;
				font-size: 13px;
				font-weight: 500;
				color: var(--text-color);
				background: transparent;
				min-width: 160px;
			}
			.tw-input::placeholder { color: var(--text-muted); font-weight: 400; }
			.tw-form-save {
				background: var(--primary, #0176d3);
				color: #fff;
				border: none;
				border-radius: 4px;
				padding: 4px 12px;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: filter 0.12s;
				white-space: nowrap;
			}
			.tw-form-save:hover { filter: brightness(1.1); }
			.tw-form-cancel {
				background: transparent;
				color: var(--text-muted);
				border: 1px solid var(--border-color);
				border-radius: 4px;
				padding: 4px 10px;
				font-size: 12px;
				cursor: pointer;
				transition: color 0.12s;
				white-space: nowrap;
			}
			.tw-form-cancel:hover { color: var(--text-color); }

			/* ── Row editing state ── */
			.tw-node.tw-row-editing .tw-label {
				background: transparent;
				flex: 1;
				padding: 0;
			}
			.tw-row-input {
				flex: 1;
				height: 26px;
				border: 1px solid var(--primary, #0176d3);
				border-radius: 4px;
				padding: 0 8px;
				font-size: 13px;
				font-weight: 500;
				color: var(--text-color);
				background: var(--card-bg, #fff);
				outline: none;
				box-shadow: 0 0 0 2px rgba(1,118,211,0.12);
				min-width: 120px;
			}
			.tw-row-save {
				height: 26px;
				padding: 0 10px;
				background: var(--primary, #0176d3);
				color: #fff;
				border: none;
				border-radius: 4px;
				font-size: 11px;
				font-weight: 600;
				cursor: pointer;
				white-space: nowrap;
				transition: filter 0.12s;
			}
			.tw-row-save:hover { filter: brightness(1.1); }
			.tw-row-cancel {
				height: 26px;
				padding: 0 8px;
				background: transparent;
				color: var(--text-muted);
				border: 1px solid var(--border-color);
				border-radius: 4px;
				font-size: 11px;
				cursor: pointer;
				white-space: nowrap;
				transition: color 0.12s;
			}
			.tw-row-cancel:hover { color: var(--text-color); }

			/* ── Loading / empty ── */
			.tw-empty {
				padding: 20px 8px;
				color: var(--text-muted);
				font-size: 12px;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.tw-spinner { animation: tw-spin 0.8s linear infinite; display: inline-block; }
			@keyframes tw-spin { to { transform: rotate(360deg); } }
			`;
			document.head.appendChild(s);
		}

		// ── Not saved guard ───────────────────────────────────────────────────
		if (frm.is_new()) {
			wrapper.html(`
				<div class="tw-root">
					<div class="tw-tree">
						<div class="tw-empty">
							<i class="fa fa-info-circle"></i>
							Save the Function first to manage Parameters.
						</div>
					</div>
				</div>
			`);
			return;
		}

		const funcName = frm.doc.function || frm.doc.name;
		let treeOpen  = true;  // root expanded state
		let params    = [];    // current params list

		// ── Build full tree DOM ───────────────────────────────────────────────
		function buildTree() {
			const root = $(`<div class="tw-root"><div class="tw-tree"></div></div>`);
			const tree = root.find(".tw-tree");

			// ── Root node ────────────────────────────────────────────────────
			const rootNode = $(`
				<div class="tw-node tw-root-node">
					<div class="tw-toggle ${treeOpen ? "" : "collapsed"}" id="tw-root-toggle">
						<i class="fa fa-chevron-down"></i>
					</div>
					<i class="fa fa-cube tw-icon root"></i>
					<div class="tw-label" id="tw-root-label">
						<span class="tw-label-text root-text">${frappe.utils.escape_html(funcName)}</span>
						<span class="tw-label-sub">Function</span>
						<span class="tw-badge" id="tw-badge">${params.length}</span>
					</div>
					<div class="tw-actions">
						<button class="tw-btn add" id="tw-add-root">
							<i class="fa fa-plus"></i> Add Parameter
						</button>
					</div>
				</div>
			`);
			tree.append(rootNode);

			// ── Children container ────────────────────────────────────────────
			const childrenWrap = $(`<div class="tw-children" id="tw-children"></div>`);
			if (!treeOpen) childrenWrap.hide();
			tree.append(childrenWrap);

			if (!params.length) {
				childrenWrap.append(`
					<div class="tw-child-wrap">
						<div class="tw-empty">
							<i class="fa fa-tag" style="opacity:.4"></i>
							No parameters yet.
						</div>
					</div>
				`);
			} else {
				params.forEach((p, i) => {
					const isLast = (i === params.length - 1);
					const childWrap = $(`<div class="tw-child-wrap" data-name="${p.name}"></div>`);

					if (isLast) {
						// Last child: shorten the vertical trunk
						childWrap.css({ position: "relative" });
					}

					const leafNode = $(`
						<div class="tw-node">
							<i class="fa fa-tag tw-icon leaf"></i>
							<div class="tw-label tw-leaf-label">
								<span class="tw-label-text">
									${frappe.utils.escape_html(p.parameter)}
								</span>
							</div>
							<div class="tw-actions">
								<button class="tw-btn add tw-edit-btn"
									data-name="${p.name}"
									data-value="${frappe.utils.escape_html(p.parameter)}">
									<i class="fa fa-pencil"></i> Edit
								</button>
								<button class="tw-btn del tw-del-btn" data-name="${p.name}">
									<i class="fa fa-trash-o"></i>
								</button>
							</div>
						</div>
					`);
					childWrap.append(leafNode);
					childrenWrap.append(childWrap);
				});
			}

			// ── Add-form slot (appended inside children) ───────────────────
			const formSlot = $(`<div class="tw-child-wrap tw-form-slot" style="display:none"></div>`);
			childrenWrap.append(formSlot);

			return root;
		}

		// ── Render ────────────────────────────────────────────────────────────
		function render() {
			wrapper.empty();
			const tree = buildTree();
			wrapper.append(tree);
			bindEvents();
		}

		// ── Inline form ───────────────────────────────────────────────────────
		function showAddForm() {
			// Remove any open form
			wrapper.find(".tw-form-wrap").remove();

			// Make sure children visible
			wrapper.find("#tw-children").show();
			treeOpen = true;
			wrapper.find("#tw-root-toggle").removeClass("collapsed");

			const slot = wrapper.find(".tw-form-slot");
			slot.show();
			slot.html(`
				<div class="tw-form-wrap">
					<div class="tw-form">
						<i class="fa fa-tag tw-form-icon"></i>
						<input class="tw-input tw-add-input" type="text" placeholder="Parameter name…" />
						<button class="tw-form-save tw-add-save">Save</button>
						<button class="tw-form-cancel tw-add-cancel">Cancel</button>
					</div>
				</div>
			`);
			slot.find(".tw-add-input").focus();

			slot.find(".tw-add-save").on("click", () => {
				const val = slot.find(".tw-add-input").val().trim();
				if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
				doCreate(val);
			});
			slot.find(".tw-add-input").on("keydown", e => {
				if (e.key === "Enter")  slot.find(".tw-add-save").trigger("click");
				if (e.key === "Escape") { slot.hide().empty(); }
			});
			slot.find(".tw-add-cancel").on("click", () => slot.hide().empty());
		}

		function showEditForm(editBtn, name, current) {
			// Restore any previously editing row first
			wrapper.find(".tw-node.tw-row-editing").each(function () {
				cancelRowEdit($(this));
			});

			const node    = editBtn.closest(".tw-node");
			const label   = node.find(".tw-label");
			const actions = node.find(".tw-actions");

			// Store original label HTML to restore on cancel
			node.addClass("tw-row-editing");
			node.data("orig-label", label.html());
			node.data("orig-actions", actions.html());

			// Replace label content with input
			label.html(`
				<input
					class="tw-row-input"
					type="text"
					value="${frappe.utils.escape_html(current)}"
				/>
			`);

			// Replace action buttons with Save / Cancel
			actions.css("opacity", "1").html(`
				<button class="tw-row-save">Save</button>
				<button class="tw-row-cancel">Cancel</button>
			`);

			const input = label.find(".tw-row-input");
			input.focus().select();

			// Save
			const doSave = () => {
				const val = input.val().trim();
				if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
				doUpdate(name, val);
			};

			// Cancel — restore original
			const doCancel = () => cancelRowEdit(node);

			actions.find(".tw-row-save").on("click", doSave);
			actions.find(".tw-row-cancel").on("click", doCancel);
			input.on("keydown", e => {
				if (e.key === "Enter")  doSave();
				if (e.key === "Escape") doCancel();
			});
		}

		function cancelRowEdit(node) {
			const label   = node.find(".tw-label");
			const actions = node.find(".tw-actions");
			label.html(node.data("orig-label"));
			actions.css("opacity", "").html(node.data("orig-actions"));
			node.removeClass("tw-row-editing");
		}

		// ── API ───────────────────────────────────────────────────────────────
		function loadList() {
			wrapper.empty();
			wrapper.html(`
				<div class="tw-root"><div class="tw-tree">
					<div class="tw-empty">
						<i class="fa fa-circle-o-notch tw-spinner"></i> Loading…
					</div>
				</div></div>
			`);
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
					render();
				},
			});
		}

		function doCreate(val) {
			frappe.call({
				method: "frappe.client.insert",
				args: { doc: { doctype: "Parameter", function: frm.doc.name, parameter: val } },
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: `"${val}" added.`, indicator: "green" });
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
							frappe.show_alert({ message: `"${label}" deleted.`, indicator: "orange" });
							loadList();
						}
					},
				});
			});
		}

		// ── Event binding ─────────────────────────────────────────────────────
		function bindEvents() {
			// Toggle expand/collapse
			wrapper.find("#tw-root-toggle").on("click", function () {
				treeOpen = !treeOpen;
				$(this).toggleClass("collapsed", !treeOpen);
				wrapper.find("#tw-children").toggle(treeOpen);
			});

			// Add parameter
			wrapper.find("#tw-add-root").on("click", () => showAddForm());

			// Edit — inline within same row
			wrapper.on("click", ".tw-edit-btn", function () {
				const name    = $(this).data("name");
				const current = $(this).data("value");
				showEditForm($(this), name, current);
			});

			// Delete
			wrapper.on("click", ".tw-del-btn", function () {
				const name  = $(this).data("name");
				const label = $(this).closest(".tw-node").find(".tw-label-text").text().trim();
				doDelete(name, label);
			});
		}

		// ── Boot ──────────────────────────────────────────────────────────────
		loadList();
	},
});
