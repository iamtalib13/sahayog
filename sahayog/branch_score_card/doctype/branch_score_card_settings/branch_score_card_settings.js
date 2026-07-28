// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Score Card Settings", {
	refresh(frm) { frm.trigger("render_master_widget"); },
	after_save(frm) { frm.trigger("render_master_widget"); },

	render_master_widget(frm) {
		const wrapper = frm.get_field("function_widget").$wrapper;
		wrapper.empty();

		// ── Styles ──────────────────────────────────────────────────────────────
		if (!document.getElementById("mw-styles")) {
			const s = document.createElement("style");
			s.id = "mw-styles";
			s.textContent = `
			@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

			.mw-root * { box-sizing: border-box; }
			.mw-root {
				font-family: 'Inter', var(--font-stack, sans-serif);
				font-size: 13px;
				margin: 8px 0 20px;
			}

			/* ── Outer card ── */
			.mw-card {
				border: 1px solid var(--border-color);
				border-radius: 10px;
				background: var(--card-bg, #fff);
				box-shadow: 0 1px 6px rgba(0,0,0,0.06);
				overflow: hidden;
			}

			/* ── Top toolbar ── */
			.mw-toolbar {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 12px 16px;
				background: var(--subtle-fg, #fafafa);
				border-bottom: 1px solid var(--border-color);
				gap: 10px;
			}
			.mw-toolbar-title {
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.mw-toolbar-icon {
				width: 28px; height: 28px;
				background: var(--primary-light, #dceeff);
				border-radius: 6px;
				display: flex; align-items: center; justify-content: center;
				color: var(--primary, #0176d3);
				font-size: 13px;
				flex-shrink: 0;
			}
			.mw-toolbar-label {
				font-size: 13px;
				font-weight: 700;
				color: var(--text-color);
			}
			.mw-toolbar-sub {
				font-size: 11px;
				color: var(--text-muted);
				margin-top: 1px;
			}
			.mw-toolbar-right {
				display: flex;
				align-items: center;
				gap: 8px;
				flex-shrink: 0;
			}
			.mw-counts {
				font-size: 11px;
				color: var(--text-muted);
				background: var(--border-color);
				border-radius: 20px;
				padding: 2px 9px;
			}
			.mw-add-func-btn {
				display: flex;
				align-items: center;
				gap: 5px;
				background: var(--primary, #0176d3);
				color: #fff;
				border: none;
				border-radius: 6px;
				padding: 7px 14px;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				font-family: inherit;
				transition: filter 0.15s, transform 0.1s;
				letter-spacing: 0.01em;
			}
			.mw-add-func-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
			.mw-add-func-btn:active { transform: translateY(0); }

			/* ── Body ── */
			.mw-body { padding: 10px 12px 12px; }

			/* ── Empty state ── */
			.mw-empty {
				display: flex;
				flex-direction: column;
				align-items: center;
				padding: 44px 24px;
				gap: 8px;
				text-align: center;
			}
			.mw-empty-icon {
				width: 52px; height: 52px;
				background: var(--subtle-fg, #f3f4f6);
				border-radius: 50%;
				display: flex; align-items: center; justify-content: center;
				color: var(--text-muted);
				font-size: 22px;
				margin-bottom: 6px;
			}
			.mw-empty-title { font-size: 14px; font-weight: 700; color: var(--text-color); }
			.mw-empty-sub { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
			.mw-empty-cta {
				margin-top: 10px;
				display: flex; align-items: center; gap: 6px;
				background: transparent;
				color: var(--primary, #0176d3);
				border: 1.5px dashed var(--primary, #0176d3);
				border-radius: 7px;
				padding: 8px 20px;
				font-size: 13px;
				font-weight: 600;
				cursor: pointer;
				font-family: inherit;
				transition: background 0.15s;
			}
			.mw-empty-cta:hover { background: var(--primary-light, #e8f4ff); }

			/* ── Function group ── */
			.mw-func-group {
				border: 1px solid var(--border-color);
				border-radius: 8px;
				margin-bottom: 8px;
				overflow: hidden;
				transition: box-shadow 0.15s;
				animation: mw-fadein 0.2s ease both;
			}
			.mw-func-group:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.07); }

			/* Function header row */
			.mw-func-header {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 10px 14px;
				background: var(--subtle-fg, #f7f8fa);
				cursor: pointer;
				user-select: none;
				border-bottom: 1px solid transparent;
				transition: background 0.12s;
			}
			.mw-func-group.open .mw-func-header {
				border-bottom-color: var(--border-color);
			}
			.mw-func-header:hover { background: var(--highlight-color, #f0f5ff); }

			.mw-func-chevron {
				color: var(--text-muted);
				font-size: 10px;
				width: 16px;
				transition: transform 0.18s ease;
				flex-shrink: 0;
			}
			.mw-func-group.open .mw-func-chevron { transform: rotate(90deg); }

			.mw-func-icon {
				width: 22px; height: 22px;
				background: var(--primary-light, #dceeff);
				border-radius: 5px;
				display: flex; align-items: center; justify-content: center;
				color: var(--primary, #0176d3);
				font-size: 11px;
				flex-shrink: 0;
			}
			.mw-func-name {
				flex: 1;
				font-weight: 600;
				font-size: 13px;
				color: var(--text-color);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.mw-func-name.editing-name { font-weight: 500; }
			.mw-func-param-count {
				font-size: 11px;
				color: var(--text-muted);
				background: var(--border-color);
				border-radius: 20px;
				padding: 1px 8px;
				flex-shrink: 0;
				font-weight: 600;
				transition: background 0.2s, color 0.2s;
			}
			.mw-func-param-count.has-params {
				background: var(--primary-light, #dceeff);
				color: var(--primary, #0176d3);
			}
			.mw-func-actions {
				display: flex;
				gap: 2px;
				flex-shrink: 0;
			}
			.mw-func-btn {
				width: 26px; height: 26px;
				border: none; background: transparent;
				border-radius: 5px;
				display: flex; align-items: center; justify-content: center;
				color: var(--text-muted);
				font-size: 12px;
				cursor: pointer;
				transition: background 0.12s, color 0.12s;
				font-family: inherit;
			}
			.mw-func-btn:hover { background: var(--border-color); color: var(--text-color); }
			.mw-func-btn.del:hover { background: #ffe5e5; color: #c0392b; }

			/* ── Inline Function name edit (in header) ── */
			.mw-func-name-input {
				flex: 1;
				height: 26px;
				border: 1.5px solid var(--primary, #0176d3);
				border-radius: 5px;
				padding: 0 8px;
				font-size: 13px;
				font-weight: 600;
				color: var(--text-color);
				background: var(--card-bg, #fff);
				outline: none;
				box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
				font-family: inherit;
				min-width: 0;
			}
			.mw-header-save {
				height: 26px; padding: 0 10px;
				background: var(--primary, #0176d3); color: #fff;
				border: none; border-radius: 5px;
				font-size: 11px; font-weight: 600;
				cursor: pointer; font-family: inherit; white-space: nowrap;
				transition: filter 0.12s;
			}
			.mw-header-save:hover { filter: brightness(1.1); }
			.mw-header-cancel {
				height: 26px; padding: 0 8px;
				background: transparent; color: var(--text-muted);
				border: 1px solid var(--border-color); border-radius: 5px;
				font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap;
			}

			/* ── Parameters panel (inside function group) ── */
			.mw-param-body { padding: 6px 12px 10px; }

			/* Tree lines */
			.mw-param-list { padding: 0; }
			.mw-param-item {
				display: flex;
				flex-direction: column;
				position: relative;
				padding-left: 20px;
				margin-bottom: 1px;
				animation: mw-fadein 0.15s ease both;
			}
			.mw-param-item:not(:last-child)::before {
				content: '';
				position: absolute;
				left: 7px; top: 28px; bottom: -1px;
				width: 1.5px;
				background: var(--border-color);
				border-radius: 1px;
			}
			.mw-param-item::after {
				content: '';
				position: absolute;
				left: 7px; top: 17px;
				width: 13px; height: 1.5px;
				background: var(--border-color);
				border-radius: 1px;
			}

			/* Parameter row */
			.mw-param-row {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 6px 10px;
				border-radius: 6px;
				border: 1.5px solid transparent;
				transition: background 0.12s;
			}
			.mw-param-row:hover { background: var(--highlight-color, #f0f5ff); }
			.mw-param-row.is-editing {
				background: #fffbf0;
				border-color: #f0c040;
			}
			.mw-param-sr {
				min-width: 20px;
				text-align: right;
				font-size: 11px;
				font-weight: 600;
				color: var(--text-muted);
				flex-shrink: 0;
				line-height: 1;
			}
			.mw-param-dot {
				width: 6px; height: 6px;
				border-radius: 50%;
				border: 1.5px solid var(--text-muted);
				flex-shrink: 0;
				transition: border-color 0.15s;
			}
			.mw-param-row:hover .mw-param-dot { border-color: var(--primary, #0176d3); }
			.mw-param-row.is-editing .mw-param-dot { border-color: #e0a800; background: #ffe08a; }
			.mw-param-name {
				flex: 1;
				font-weight: 500;
				color: var(--text-color);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.mw-param-actions {
				display: flex; gap: 2px;
				opacity: 0;
				transition: opacity 0.15s;
				flex-shrink: 0;
			}
			.mw-param-row:hover .mw-param-actions,
			.mw-param-row.is-editing .mw-param-actions { opacity: 1; }
			.mw-icon-btn {
				width: 24px; height: 24px;
				border: none; background: transparent;
				border-radius: 4px;
				display: flex; align-items: center; justify-content: center;
				color: var(--text-muted);
				font-size: 11px; cursor: pointer;
				transition: background 0.12s, color 0.12s;
				font-family: inherit;
			}
			.mw-icon-btn:hover { background: var(--border-color); color: var(--text-color); }
			.mw-icon-btn.del:hover { background: #ffe5e5; color: #c0392b; }

			/* Inline param row edit */
			.mw-row-input {
				flex: 1; height: 26px;
				border: 1.5px solid var(--primary, #0176d3);
				border-radius: 4px; padding: 0 8px;
				font-size: 13px; font-weight: 500;
				color: var(--text-color); background: var(--card-bg, #fff);
				outline: none;
				box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
				font-family: inherit; min-width: 0;
			}
			.mw-row-save {
				height: 24px; padding: 0 10px;
				background: var(--primary, #0176d3); color: #fff;
				border: none; border-radius: 4px;
				font-size: 11px; font-weight: 600;
				cursor: pointer; font-family: inherit; white-space: nowrap;
			}
			.mw-row-save:hover { filter: brightness(1.1); }
			.mw-row-cancel {
				height: 24px; padding: 0 8px;
				background: transparent; color: var(--text-muted);
				border: 1px solid var(--border-color); border-radius: 4px;
				font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap;
			}

			/* Add parameter row */
			.mw-add-param-row {
				display: none;
				align-items: center;
				gap: 8px;
				padding: 6px 10px;
				margin-top: 4px;
				border-radius: 6px;
				border: 1.5px dashed var(--primary, #0176d3);
				background: var(--primary-light, #f0f7ff);
				animation: mw-fadein 0.15s ease;
			}
			.mw-add-param-row.visible { display: flex; }
			.mw-add-param-input {
				flex: 1; height: 26px;
				border: 1.5px solid var(--primary, #0176d3);
				border-radius: 4px; padding: 0 8px;
				font-size: 13px; font-weight: 500;
				color: var(--text-color); background: #fff;
				outline: none;
				box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
				font-family: inherit; min-width: 0;
			}
			.mw-add-param-save {
				height: 26px; padding: 0 12px;
				background: var(--primary, #0176d3); color: #fff;
				border: none; border-radius: 4px;
				font-size: 11px; font-weight: 600;
				cursor: pointer; font-family: inherit; white-space: nowrap;
				transition: filter 0.12s;
			}
			.mw-add-param-save:hover { filter: brightness(1.1); }
			.mw-add-param-cancel {
				height: 26px; padding: 0 9px;
				background: transparent; color: var(--text-muted);
				border: 1px solid var(--border-color); border-radius: 4px;
				font-size: 11px; cursor: pointer; font-family: inherit; white-space: nowrap;
			}

			/* Foot of param panel: add button */
			.mw-add-param-btn {
				display: flex; align-items: center; gap: 5px;
				background: transparent;
				color: var(--primary, #0176d3);
				border: none;
				padding: 5px 10px;
				font-size: 12px; font-weight: 600;
				cursor: pointer; font-family: inherit;
				border-radius: 5px;
				margin-top: 4px;
				transition: background 0.12s;
			}
			.mw-add-param-btn:hover { background: var(--primary-light, #e8f4ff); }

			/* ── Add Function inline form ── */
			.mw-add-func-form {
				display: none;
				align-items: center;
				gap: 8px;
				padding: 10px 14px;
				border: 1.5px dashed var(--primary, #0176d3);
				border-radius: 8px;
				background: var(--primary-light, #f0f7ff);
				margin-bottom: 8px;
				animation: mw-fadein 0.15s ease;
			}
			.mw-add-func-form.visible { display: flex; }
			.mw-add-func-input {
				flex: 1; height: 30px;
				border: 1.5px solid var(--primary, #0176d3);
				border-radius: 6px; padding: 0 10px;
				font-size: 13px; font-weight: 600;
				color: var(--text-color); background: #fff;
				outline: none;
				box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
				font-family: inherit;
			}
			.mw-add-func-save {
				height: 30px; padding: 0 14px;
				background: var(--primary, #0176d3); color: #fff;
				border: none; border-radius: 6px;
				font-size: 12px; font-weight: 600;
				cursor: pointer; font-family: inherit; white-space: nowrap;
				transition: filter 0.12s;
			}
			.mw-add-func-save:hover { filter: brightness(1.1); }
			.mw-add-func-cancel {
				height: 30px; padding: 0 12px;
				background: transparent; color: var(--text-muted);
				border: 1px solid var(--border-color); border-radius: 6px;
				font-size: 12px; cursor: pointer; font-family: inherit; white-space: nowrap;
			}

			/* ── Skeleton ── */
			.mw-skel-group {
				border: 1px solid var(--border-color);
				border-radius: 8px;
				margin-bottom: 8px;
				overflow: hidden;
			}
			.mw-skel-header {
				display: flex; align-items: center; gap: 10px;
				padding: 10px 14px;
				background: var(--subtle-fg, #f7f8fa);
			}
			.mw-skel {
				border-radius: 4px;
				background: linear-gradient(90deg,
					var(--border-color) 25%,
					var(--subtle-fg, #f0f0f0) 50%,
					var(--border-color) 75%
				);
				background-size: 200% 100%;
				animation: mw-shimmer 1.3s infinite;
			}
			@keyframes mw-shimmer { to { background-position: -200% 0; } }
			@keyframes mw-fadein {
				from { opacity: 0; transform: translateY(-4px); }
				to   { opacity: 1; transform: translateY(0); }
			}

			/* ── Keyboard hint ── */
			.mw-kbd-hint {
				font-size: 10px; color: var(--text-muted);
				padding: 2px 10px 6px;
				display: flex; gap: 10px; align-items: center;
			}
			.mw-kbd {
				display: inline-flex; align-items: center;
				background: var(--subtle-fg, #f3f3f3);
				border: 1px solid var(--border-color);
				border-radius: 3px;
				padding: 0 5px; font-size: 10px; font-weight: 600;
				color: var(--text-muted); height: 16px;
			}
			`;
			document.head.appendChild(s);
		}

		// ── State ────────────────────────────────────────────────────────────────
		let functions = []; // [{ name, function, params: [], open: bool }]

		// ── Build toolbar ────────────────────────────────────────────────────────
		const widget = $(`
			<div class="mw-root">
				<div class="mw-card">
					<div class="mw-toolbar">
						<div class="mw-toolbar-title">
							<div class="mw-toolbar-icon"><i class="fa fa-sitemap"></i></div>
							<div>
								<div class="mw-toolbar-label">Function &amp; Parameter Manager</div>
								<div class="mw-toolbar-sub">Manage all Functions and their Parameters</div>
							</div>
						</div>
						<div class="mw-toolbar-right">
							<span class="mw-counts" id="mw-counts">Loading…</span>
							<button class="mw-add-func-btn" id="mw-add-func-btn">
								<i class="fa fa-plus"></i> New Function
							</button>
						</div>
					</div>
					<div class="mw-body" id="mw-body">
						<!-- skeleton -->
						<div id="mw-skeleton">
							${[80, 55, 70].map(w => `
								<div class="mw-skel-group">
									<div class="mw-skel-header">
										<div class="mw-skel" style="width:16px;height:16px;border-radius:4px"></div>
										<div class="mw-skel" style="width:${w}%;height:13px"></div>
									</div>
								</div>
							`).join("")}
						</div>
						<!-- content -->
						<div id="mw-content" style="display:none">
							<div class="mw-add-func-form" id="mw-add-func-form">
								<i class="fa fa-cube" style="color:var(--primary);font-size:13px;flex-shrink:0"></i>
								<input class="mw-add-func-input" id="mw-add-func-input" type="text" placeholder="Function name…" autocomplete="off" />
								<button class="mw-add-func-save" id="mw-add-func-save">Save</button>
								<button class="mw-add-func-cancel" id="mw-add-func-cancel">Cancel</button>
							</div>
							<div id="mw-func-list"></div>
						</div>
					</div>
				</div>
			</div>
		`);
		wrapper.append(widget);

		// ── Render all functions ─────────────────────────────────────────────────
		function renderAll() {
			widget.find("#mw-skeleton").hide();
			const content = widget.find("#mw-content").show();
			const list    = widget.find("#mw-func-list").empty();

			// Counts
			const totalParams = functions.reduce((s, f) => s + (f.params || []).length, 0);
			widget.find("#mw-counts").text(
				`${functions.length} Function${functions.length !== 1 ? "s" : ""} · ${totalParams} Parameter${totalParams !== 1 ? "s" : ""}`
			);

			if (!functions.length) {
				list.html(`
					<div class="mw-empty">
						<div class="mw-empty-icon"><i class="fa fa-sitemap"></i></div>
						<div class="mw-empty-title">No Functions yet</div>
						<div class="mw-empty-sub">Create your first Function to start organizing<br>Parameters for the Score Card.</div>
						<button class="mw-empty-cta" id="mw-empty-cta">
							<i class="fa fa-plus"></i> Create first Function
						</button>
					</div>
				`);
				list.find("#mw-empty-cta").on("click", () => showAddFuncForm());
				return;
			}

			functions.forEach((f, fi) => renderFuncGroup(f, fi, list));
		}

		// ── Render one function group ────────────────────────────────────────────
		function renderFuncGroup(f, fi, container) {
			const paramCount = (f.params || []).length;
			// Index-based safe key — avoids special chars (/, spaces, etc.) breaking selectors
			const safeKey = `fn${fi}`;

			const group = $(`
				<div class="mw-func-group ${f.open ? "open" : ""}" data-safe-key="${safeKey}" style="animation-delay:${fi * 0.05}s">
					<!-- Function header -->
					<div class="mw-func-header">
						<i class="fa fa-chevron-right mw-func-chevron"></i>
						<div class="mw-func-icon"><i class="fa fa-cube"></i></div>
						<div class="mw-func-name">${frappe.utils.escape_html(f.function)}</div>
						<span class="mw-func-param-count ${paramCount ? "has-params" : ""}">${paramCount}</span>
						<div class="mw-func-actions">
							<button class="mw-func-btn edit-func-btn" title="Rename"
								data-name="${f.name}" data-value="${frappe.utils.escape_html(f.function)}">
								<i class="fa fa-pencil"></i>
							</button>
							<button class="mw-func-btn del del-func-btn" title="Delete Function"
								data-name="${f.name}" data-label="${frappe.utils.escape_html(f.function)}">
								<i class="fa fa-trash-o"></i>
							</button>
						</div>
					</div>

					<!-- Parameters panel -->
					<div class="mw-param-body" style="${f.open ? "" : "display:none"}">
						<div class="mw-param-list" data-param-key="${safeKey}">
							${(f.params || []).length === 0 ? `
								<div style="padding:10px 8px;color:var(--text-muted);font-size:12px;display:flex;align-items:center;gap:6px;">
									<i class="fa fa-info-circle" style="opacity:.5"></i>
									No parameters yet
								</div>
							` : ""}
						</div>
						<div class="mw-add-param-row" data-add-key="${safeKey}">
							<i class="fa fa-tag" style="color:var(--primary);font-size:11px;flex-shrink:0"></i>
							<input class="mw-add-param-input" type="text" placeholder="Parameter name…" autocomplete="off" />
							<button class="mw-add-param-save">Save</button>
							<button class="mw-add-param-cancel">Cancel</button>
						</div>
						<div class="mw-kbd-hint" style="display:none">
							<span><span class="mw-kbd">↵</span> save</span>
							<span><span class="mw-kbd">Esc</span> cancel</span>
						</div>
						<button class="mw-add-param-btn" data-func-name="${f.name}">
							<i class="fa fa-plus"></i> Add Parameter
						</button>
					</div>
				</div>
			`);

			// Render existing params
			const paramListEl = group.find(`.mw-param-list[data-param-key="${safeKey}"]`);
			if (f.params && f.params.length) {
				paramListEl.empty();
				f.params.forEach((p, pi) => {
					paramListEl.append(buildParamItem(p, pi));
				});
			}

			container.append(group);
			bindGroupEvents(group, f, safeKey);
		}

		// ── Build a single param item DOM ────────────────────────────────────────
		function buildParamItem(p, pi) {
			const sr = pi + 1;
			return $(`
				<div class="mw-param-item" style="animation-delay:${pi * 0.04}s">
					<div class="mw-param-row" data-name="${p.name}">
						<span class="mw-param-sr">${sr}.</span>
						<div class="mw-param-dot"></div>
						<div class="mw-param-name">${frappe.utils.escape_html(p.parameter)}</div>
						<div class="mw-param-actions">
							<button class="mw-icon-btn edit-param-btn" title="Edit"
								data-name="${p.name}"
								data-value="${frappe.utils.escape_html(p.parameter)}">
								<i class="fa fa-pencil"></i>
							</button>
							<button class="mw-icon-btn del del-param-btn" title="Delete"
								data-name="${p.name}">
								<i class="fa fa-trash-o"></i>
							</button>
						</div>
					</div>
				</div>
			`);
		}

		// ── Bind events per group ────────────────────────────────────────────────
		function bindGroupEvents(group, f, safeKey) {

			// Toggle open/close
			group.find(".mw-func-header").on("click", function (e) {
				// Ignore clicks on action buttons or inputs
				if ($(e.target).closest(".mw-func-actions, input, button:not(.mw-func-header)").length) return;
				f.open = !f.open;
				group.toggleClass("open", f.open);
				group.find(".mw-param-body").slideToggle(180);
			});

			// ── Rename Function (inline in header) ──
			group.find(".edit-func-btn").on("click", function (e) {
				e.stopPropagation();
				const name  = $(this).data("name");
				const value = $(this).data("value");
				const header = group.find(".mw-func-header");
				const nameEl = header.find(".mw-func-name");
				const actEl  = header.find(".mw-func-actions");

				// Already editing?
				if (nameEl.hasClass("editing-name")) return;
				nameEl.addClass("editing-name");
				nameEl.html(`<input class="mw-func-name-input" type="text" value="${frappe.utils.escape_html(value)}" autocomplete="off" />`);
				actEl.html(`
					<button class="mw-header-save">Save</button>
					<button class="mw-header-cancel">Cancel</button>
				`);
				const input = nameEl.find(".mw-func-name-input");
				input.focus().select();

				const doSave = () => {
					const val = input.val().trim();
					if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
					updateFunction(name, val);
				};
				const doCancel = () => loadAll();

				actEl.find(".mw-header-save").on("click", doSave);
				actEl.find(".mw-header-cancel").on("click", doCancel);
				input.on("keydown", e => {
					if (e.key === "Enter")  doSave();
					if (e.key === "Escape") doCancel();
				});
			});

			// ── Delete Function ──
			group.find(".del-func-btn").on("click", function (e) {
				e.stopPropagation();
				const name  = $(this).data("name");
				const label = $(this).data("label");
				frappe.confirm(
					`Delete Function <b>${label}</b> and all its Parameters?`,
					() => deleteFunction(name, label)
				);
			});

			// ── Add Parameter ──
			group.find(".mw-add-param-btn").on("click", function () {
				const addRow = group.find(`.mw-add-param-row[data-add-key="${safeKey}"]`);
				const hint   = group.find(".mw-kbd-hint");
				group.find(".mw-param-row.is-editing").each(function () { cancelParamEdit($(this)); });
				addRow.addClass("visible");
				hint.show();
				addRow.find(".mw-add-param-input").val("").focus();
			});

			// Add param: save
			const addRow = () => group.find(`.mw-add-param-row[data-add-key="${safeKey}"]`);
			group.find(`.mw-add-param-row[data-add-key="${safeKey}"] .mw-add-param-save`).on("click", function () {
				const val = addRow().find(".mw-add-param-input").val().trim();
				if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
				createParameter(f.name, val, group, safeKey);
			});
			// Add param: cancel
			group.find(`.mw-add-param-row[data-add-key="${safeKey}"] .mw-add-param-cancel`).on("click", function () {
				hideAddParamRow(group, safeKey);
			});
			// Add param: keyboard
			group.find(`.mw-add-param-row[data-add-key="${safeKey}"] .mw-add-param-input`).on("keydown", function (e) {
				if (e.key === "Enter")  addRow().find(".mw-add-param-save").trigger("click");
				if (e.key === "Escape") hideAddParamRow(group, safeKey);
			});

			// ── Edit Parameter (inline row) ──
			group.on("click", ".edit-param-btn", function () {
				const btn     = $(this);
				const name    = btn.data("name");
				const current = btn.data("value");
				const row     = btn.closest(".mw-param-row");
				const nameDiv = row.find(".mw-param-name");
				const actions = row.find(".mw-param-actions");

				// Cancel others
				group.find(".mw-param-row.is-editing").each(function () { cancelParamEdit($(this)); });
				hideAddParamRow(group, key);

				row.addClass("is-editing");
				row.data("orig-name", nameDiv.html());
				row.data("orig-actions", actions.html());

				nameDiv.html(`<input class="mw-row-input" type="text" value="${frappe.utils.escape_html(current)}" autocomplete="off" />`);
				actions.css("opacity","1").html(`
					<button class="mw-row-save">Save</button>
					<button class="mw-row-cancel">Cancel</button>
				`);

				const input = nameDiv.find(".mw-row-input");
				input.focus().select();

				const doSave = () => {
					const val = input.val().trim();
					if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
					updateParameter(name, val);
				};
				actions.find(".mw-row-save").on("click", doSave);
				actions.find(".mw-row-cancel").on("click", () => cancelParamEdit(row));
				input.on("keydown", e => {
					if (e.key === "Enter")  doSave();
					if (e.key === "Escape") cancelParamEdit(row);
				});
			});

			// ── Delete Parameter ──
			group.on("click", ".del-param-btn", function () {
				const name  = $(this).data("name");
				const label = $(this).closest(".mw-param-row").find(".mw-param-name").text().trim();
				frappe.confirm(`Delete parameter <b>${label}</b>?`, () => deleteParameter(name, label));
			});
		}

		function cancelParamEdit(row) {
			row.find(".mw-param-name").html(row.data("orig-name"));
			row.find(".mw-param-actions").css("opacity","").html(row.data("orig-actions"));
			row.removeClass("is-editing");
		}
		function hideAddParamRow(group, safeKey) {
			group.find(`.mw-add-param-row[data-add-key="${safeKey}"]`).removeClass("visible");
			group.find(".mw-kbd-hint").hide();
		}

		// ── Add Function form ────────────────────────────────────────────────────
		function showAddFuncForm() {
			widget.find("#mw-add-func-form").addClass("visible").show();
			widget.find("#mw-add-func-input").val("").focus();
		}
		function hideAddFuncForm() {
			widget.find("#mw-add-func-form").removeClass("visible").hide();
			widget.find("#mw-add-func-input").val("");
		}

		widget.find("#mw-add-func-btn").on("click", () => showAddFuncForm());
		widget.find("#mw-add-func-cancel").on("click", () => hideAddFuncForm());
		widget.find("#mw-add-func-save").on("click", () => {
			const val = widget.find("#mw-add-func-input").val().trim();
			if (!val) { frappe.show_alert({ message: "Function name cannot be empty.", indicator: "red" }); return; }
			createFunction(val);
		});
		widget.find("#mw-add-func-input").on("keydown", e => {
			if (e.key === "Enter")  widget.find("#mw-add-func-save").trigger("click");
			if (e.key === "Escape") hideAddFuncForm();
		});

		// ── API: Load all Functions + their Parameters ────────────────────────────
		function loadAll() {
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Function",
					fields: ["name", "function"],
					order_by: "creation asc",
					limit_page_length: 500,
				},
				callback(r) {
					const funcs = r.message || [];
					if (!funcs.length) {
						functions = [];
						renderAll();
						return;
					}
					// Preserve open state
					const openMap = {};
					functions.forEach(f => { openMap[f.name] = f.open; });

					functions = funcs.map(f => ({
						...f,
						params: [],
						open: openMap[f.name] !== undefined ? openMap[f.name] : false,
					}));

					// Fetch params for all functions in parallel
					let done = 0;
					functions.forEach(f => {
						frappe.call({
							method: "frappe.client.get_list",
							args: {
								doctype: "Parameter",
								filters: { function: f.name },
								fields: ["name", "parameter"],
								order_by: "creation asc",
								limit_page_length: 500,
							},
							callback(r2) {
								f.params = r2.message || [];
								done++;
								if (done === functions.length) renderAll();
							},
						});
					});
				},
			});
		}

		// ── API: CRUD ─────────────────────────────────────────────────────────────
		function createFunction(val) {
			frappe.call({
				method: "frappe.client.insert",
				args: { doc: { doctype: "Function", function: val } },
				callback(r) {
					if (!r.exc) {
						hideAddFuncForm();
						frappe.show_alert({ message: `Function <b>${val}</b> created.`, indicator: "green" });
						loadAll();
					}
				},
			});
		}

		function updateFunction(name, val) {
			frappe.call({
				method: "frappe.client.set_value",
				args: { doctype: "Function", name, fieldname: "function", value: val },
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: "Function renamed.", indicator: "green" });
						loadAll();
					}
				},
			});
		}

		function deleteFunction(name, label) {
			// Delete all its parameters first, then the function
			frappe.call({
				method: "frappe.client.get_list",
				args: { doctype: "Parameter", filters: { function: name }, fields: ["name"], limit_page_length: 500 },
				callback(r) {
					const params = r.message || [];
					const delParam = (i) => {
						if (i >= params.length) {
							// Now delete the function
							frappe.call({
								method: "frappe.client.delete",
								args: { doctype: "Function", name },
								callback(r2) {
									if (!r2.exc) {
										frappe.show_alert({ message: `Function <b>${label}</b> deleted.`, indicator: "orange" });
										loadAll();
									}
								},
							});
							return;
						}
						frappe.call({
							method: "frappe.client.delete",
							args: { doctype: "Parameter", name: params[i].name },
							callback() { delParam(i + 1); },
						});
					};
					delParam(0);
				},
			});
		}

		function createParameter(funcName, val, group, key) {
			frappe.call({
				method: "frappe.client.insert",
				args: { doc: { doctype: "Parameter", function: funcName, parameter: val } },
				callback(r) {
					if (!r.exc) {
						hideAddParamRow(group, key);
						frappe.show_alert({ message: `Parameter <b>${val}</b> added.`, indicator: "green" });
						loadAll();
					}
				},
			});
		}

		function updateParameter(name, val) {
			frappe.call({
				method: "frappe.client.set_value",
				args: { doctype: "Parameter", name, fieldname: "parameter", value: val },
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: "Parameter updated.", indicator: "green" });
						loadAll();
					}
				},
			});
		}

		function deleteParameter(name, label) {
			frappe.call({
				method: "frappe.client.delete",
				args: { doctype: "Parameter", name },
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: `Parameter <b>${label}</b> deleted.`, indicator: "orange" });
						loadAll();
					}
				},
			});
		}

		// ── Boot ──────────────────────────────────────────────────────────────────
		loadAll();
	},
});
