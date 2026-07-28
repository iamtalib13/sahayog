// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Score Card Settings", {
	refresh(frm) { frm.trigger("render_master_widget"); },
	after_save(frm) { frm.trigger("render_master_widget"); },

	render_master_widget(frm) {
		const wrapper = frm.get_field("function_widget").$wrapper;
		wrapper.empty();

		// ── Styles (once) ──────────────────────────────────────────────────────
		if (!document.getElementById("mw-styles")) {
			const s = document.createElement("style");
			s.id = "mw-styles";
			s.textContent = `
			@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

			.mw * { box-sizing: border-box; }
			.mw {
				font-family: 'Inter', var(--font-stack, sans-serif);
				font-size: 13px;
				margin: 8px 0 20px;
			}

			/* ── Card ── */
			.mw-card {
				border: 1px solid var(--border-color);
				border-radius: 10px;
				background: var(--card-bg, #fff);
				box-shadow: 0 1px 6px rgba(0,0,0,0.06);
				overflow: hidden;
			}

			/* ── Toolbar ── */
			.mw-toolbar {
				display: flex; align-items: center;
				justify-content: space-between;
				padding: 12px 16px;
				background: var(--subtle-fg, #fafafa);
				border-bottom: 1px solid var(--border-color);
				gap: 10px;
			}
			.mw-toolbar-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
			.mw-toolbar-icon {
				width: 28px; height: 28px;
				background: var(--primary-light, #dceeff);
				border-radius: 6px;
				display: flex; align-items: center; justify-content: center;
				color: var(--primary, #0176d3);
				font-size: 13px; flex-shrink: 0;
			}
			.mw-toolbar-label { font-size: 13px; font-weight: 700; color: var(--text-color); }
			.mw-toolbar-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
			.mw-toolbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
			.mw-counts {
				font-size: 11px; color: var(--text-muted);
				background: var(--border-color);
				border-radius: 20px; padding: 2px 9px; font-weight: 600;
			}
			.mw-add-func-btn {
				display: flex; align-items: center; gap: 5px;
				background: var(--primary, #0176d3); color: #fff;
				border: none; border-radius: 6px;
				padding: 7px 14px; font-size: 12px; font-weight: 600;
				cursor: pointer; font-family: inherit;
				transition: filter 0.15s, transform 0.1s; letter-spacing: 0.01em;
			}
			.mw-add-func-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
			.mw-add-func-btn:active { transform: translateY(0); }

			/* ── Add Function inline form ── */
			.mw-add-func-form {
				display: none;
				align-items: center; gap: 8px;
				padding: 10px 16px;
				border-bottom: 1px solid var(--primary, #0176d3);
				background: var(--primary-light, #f0f7ff);
			}
			.mw-add-func-form.open { display: flex; }
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
			.mw-btn-primary {
				height: 30px; padding: 0 14px;
				background: var(--primary, #0176d3); color: #fff;
				border: none; border-radius: 6px;
				font-size: 12px; font-weight: 600;
				cursor: pointer; font-family: inherit; white-space: nowrap;
				transition: filter 0.12s;
			}
			.mw-btn-primary:hover { filter: brightness(1.1); }
			.mw-btn-neutral {
				height: 30px; padding: 0 12px;
				background: transparent; color: var(--text-muted);
				border: 1px solid var(--border-color); border-radius: 6px;
				font-size: 12px; cursor: pointer;
				font-family: inherit; white-space: nowrap;
				transition: color 0.12s, border-color 0.12s;
			}
			.mw-btn-neutral:hover { color: var(--text-color); border-color: var(--text-muted); }

			/* ── Body ── */
			.mw-body { padding: 10px 12px 12px; }

			/* ── Empty state ── */
			.mw-empty {
				display: flex; flex-direction: column;
				align-items: center; padding: 44px 24px;
				gap: 8px; text-align: center;
			}
			.mw-empty-icon {
				width: 52px; height: 52px;
				background: var(--subtle-fg, #f3f4f6); border-radius: 50%;
				display: flex; align-items: center; justify-content: center;
				color: var(--text-muted); font-size: 22px; margin-bottom: 6px;
			}
			.mw-empty-title { font-size: 14px; font-weight: 700; color: var(--text-color); }
			.mw-empty-sub { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
			.mw-empty-cta {
				margin-top: 10px; display: flex; align-items: center; gap: 6px;
				background: transparent; color: var(--primary, #0176d3);
				border: 1.5px dashed var(--primary, #0176d3);
				border-radius: 7px; padding: 8px 20px;
				font-size: 13px; font-weight: 600;
				cursor: pointer; font-family: inherit;
				transition: background 0.15s;
			}
			.mw-empty-cta:hover { background: var(--primary-light, #e8f4ff); }

			/* ── Function group ── */
			.mw-func-group {
				border: 1px solid var(--border-color);
				border-radius: 8px; margin-bottom: 8px; overflow: hidden;
				transition: box-shadow 0.15s;
				animation: mw-fadein 0.2s ease both;
			}
			.mw-func-group:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.07); }

			/* Function header */
			.mw-func-header {
				display: flex; align-items: center; gap: 8px;
				padding: 10px 14px;
				background: var(--subtle-fg, #f7f8fa);
				border-bottom: 1px solid transparent;
				transition: background 0.12s;
				user-select: none;
			}
			.mw-func-group.open .mw-func-header { border-bottom-color: var(--border-color); }
			.mw-func-chevron {
				color: var(--text-muted); font-size: 10px; width: 16px;
				transition: transform 0.18s ease; flex-shrink: 0; cursor: pointer;
			}
			.mw-func-group.open .mw-func-chevron { transform: rotate(90deg); }
			.mw-func-icon {
				width: 22px; height: 22px;
				background: var(--primary-light, #dceeff); border-radius: 5px;
				display: flex; align-items: center; justify-content: center;
				color: var(--primary, #0176d3); font-size: 11px; flex-shrink: 0;
			}
			.mw-func-name {
				flex: 1; font-weight: 600; font-size: 13px;
				color: var(--text-color);
				white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
				cursor: pointer;
			}
			.mw-func-param-count {
				font-size: 11px; font-weight: 600;
				color: var(--text-muted); background: var(--border-color);
				border-radius: 20px; padding: 1px 8px; flex-shrink: 0;
				transition: background 0.2s, color 0.2s;
			}
			.mw-func-param-count.has { background: var(--primary-light, #dceeff); color: var(--primary, #0176d3); }
			.mw-func-actions { display: flex; gap: 2px; flex-shrink: 0; }
			.mw-func-btn {
				width: 26px; height: 26px; border: none; background: transparent;
				border-radius: 5px; display: flex; align-items: center; justify-content: center;
				color: var(--text-muted); font-size: 12px; cursor: pointer;
				transition: background 0.12s, color 0.12s; font-family: inherit;
			}
			.mw-func-btn:hover { background: var(--border-color); color: var(--text-color); }
			.mw-func-btn.del:hover { background: #ffe5e5; color: #c0392b; }

			/* Rename input in header */
			.mw-func-name-input {
				flex: 1; height: 26px;
				border: 1.5px solid var(--primary, #0176d3); border-radius: 5px;
				padding: 0 8px; font-size: 13px; font-weight: 600;
				color: var(--text-color); background: var(--card-bg, #fff);
				outline: none; box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
				font-family: inherit; min-width: 0;
			}
			.mw-hdr-save {
				height: 26px; padding: 0 10px;
				background: var(--primary, #0176d3); color: #fff;
				border: none; border-radius: 5px;
				font-size: 11px; font-weight: 600;
				cursor: pointer; font-family: inherit; white-space: nowrap;
				transition: filter 0.12s;
			}
			.mw-hdr-save:hover { filter: brightness(1.1); }
			.mw-hdr-cancel {
				height: 26px; padding: 0 8px;
				background: transparent; color: var(--text-muted);
				border: 1px solid var(--border-color); border-radius: 5px;
				font-size: 11px; cursor: pointer;
				font-family: inherit; white-space: nowrap;
			}

			/* ── Param panel ── */
			.mw-param-body { padding: 6px 12px 10px; }
			.mw-param-list { }

			/* Tree lines */
			.mw-param-item {
				position: relative; padding-left: 20px; margin-bottom: 1px;
				animation: mw-fadein 0.15s ease both;
			}
			.mw-param-item:not(:last-child)::before {
				content: ''; position: absolute;
				left: 7px; top: 28px; bottom: -1px;
				width: 1.5px; background: var(--border-color); border-radius: 1px;
			}
			.mw-param-item::after {
				content: ''; position: absolute;
				left: 7px; top: 17px; width: 13px; height: 1.5px;
				background: var(--border-color); border-radius: 1px;
			}

			/* Param row */
			.mw-param-row {
				display: flex; align-items: center; gap: 7px;
				padding: 6px 10px; border-radius: 6px;
				border: 1.5px solid transparent;
				transition: background 0.12s;
			}
			.mw-param-row:hover { background: var(--highlight-color, #f0f5ff); }
			.mw-param-row.editing { background: #fffbf0; border-color: #f0c040; }

			.mw-param-sr {
				min-width: 20px; text-align: right;
				font-size: 11px; font-weight: 600;
				color: var(--text-muted); flex-shrink: 0;
			}
			.mw-param-dot {
				width: 6px; height: 6px; border-radius: 50%;
				border: 1.5px solid var(--text-muted); flex-shrink: 0;
				transition: border-color 0.15s;
			}
			.mw-param-row:hover .mw-param-dot { border-color: var(--primary, #0176d3); }
			.mw-param-row.editing .mw-param-dot { border-color: #e0a800; background: #ffe08a; }
			.mw-param-name {
				flex: 1; font-weight: 500; color: var(--text-color);
				white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
			}
			.mw-param-actions {
				display: flex; gap: 2px; opacity: 0;
				transition: opacity 0.15s; flex-shrink: 0;
			}
			.mw-param-row:hover .mw-param-actions,
			.mw-param-row.editing .mw-param-actions { opacity: 1; }
			.mw-icon-btn {
				width: 24px; height: 24px; border: none; background: transparent;
				border-radius: 4px; display: flex; align-items: center; justify-content: center;
				color: var(--text-muted); font-size: 11px; cursor: pointer;
				transition: background 0.12s, color 0.12s; font-family: inherit;
			}
			.mw-icon-btn:hover { background: var(--border-color); color: var(--text-color); }
			.mw-icon-btn.del:hover { background: #ffe5e5; color: #c0392b; }

			/* Inline row edit */
			.mw-row-input {
				flex: 1; height: 26px;
				border: 1.5px solid var(--primary, #0176d3); border-radius: 4px;
				padding: 0 8px; font-size: 13px; font-weight: 500;
				color: var(--text-color); background: var(--card-bg, #fff);
				outline: none; box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
				font-family: inherit; min-width: 0;
			}
			.mw-row-save {
				height: 24px; padding: 0 10px;
				background: var(--primary, #0176d3); color: #fff;
				border: none; border-radius: 4px;
				font-size: 11px; font-weight: 600;
				cursor: pointer; font-family: inherit; white-space: nowrap;
				transition: filter 0.12s;
			}
			.mw-row-save:hover { filter: brightness(1.1); }
			.mw-row-cancel {
				height: 24px; padding: 0 8px;
				background: transparent; color: var(--text-muted);
				border: 1px solid var(--border-color); border-radius: 4px;
				font-size: 11px; cursor: pointer;
				font-family: inherit; white-space: nowrap;
			}

			/* Add param row */
			.mw-add-param-row {
				display: none; align-items: center; gap: 8px;
				padding: 6px 10px; margin-top: 4px; border-radius: 6px;
				border: 1.5px dashed var(--primary, #0176d3);
				background: var(--primary-light, #f0f7ff);
			}
			.mw-add-param-row.open { display: flex; }
			.mw-add-param-input {
				flex: 1; height: 26px;
				border: 1.5px solid var(--primary, #0176d3); border-radius: 4px;
				padding: 0 8px; font-size: 13px; font-weight: 500;
				color: var(--text-color); background: #fff;
				outline: none; box-shadow: 0 0 0 3px rgba(1,118,211,0.10);
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
				font-size: 11px; cursor: pointer;
				font-family: inherit; white-space: nowrap;
			}

			/* Add param button */
			.mw-add-param-btn {
				display: flex; align-items: center; gap: 5px;
				background: transparent; color: var(--primary, #0176d3);
				border: none; padding: 5px 10px;
				font-size: 12px; font-weight: 600;
				cursor: pointer; font-family: inherit;
				border-radius: 5px; margin-top: 4px;
				transition: background 0.12s;
			}
			.mw-add-param-btn:hover { background: var(--primary-light, #e8f4ff); }

			/* No params */
			.mw-no-params {
				padding: 10px 8px; color: var(--text-muted);
				font-size: 12px; display: flex; align-items: center; gap: 6px;
			}

			/* Skeleton */
			.mw-skel-group {
				border: 1px solid var(--border-color);
				border-radius: 8px; margin-bottom: 8px; overflow: hidden;
			}
			.mw-skel-header {
				display: flex; align-items: center; gap: 10px;
				padding: 10px 14px; background: var(--subtle-fg, #f7f8fa);
			}
			.mw-skel {
				border-radius: 4px;
				background: linear-gradient(90deg,
					var(--border-color) 25%,
					var(--subtle-fg, #f0f0f0) 50%,
					var(--border-color) 75%);
				background-size: 200% 100%;
				animation: mw-shimmer 1.3s infinite;
			}
			@keyframes mw-shimmer { to { background-position: -200% 0; } }
			@keyframes mw-fadein {
				from { opacity: 0; transform: translateY(-4px); }
				to   { opacity: 1; transform: translateY(0); }
			}

			/* Kbd hint */
			.mw-kbd-hint {
				font-size: 10px; color: var(--text-muted);
				padding: 2px 10px 6px; display: none;
				gap: 10px; align-items: center;
			}
			.mw-kbd-hint.open { display: flex; }
			.mw-kbd {
				display: inline-flex; align-items: center;
				background: var(--subtle-fg, #f3f3f3);
				border: 1px solid var(--border-color);
				border-radius: 3px; padding: 0 5px;
				font-size: 10px; font-weight: 600;
				color: var(--text-muted); height: 16px;
			}
			`;
			document.head.appendChild(s);
		}

		// ── State ─────────────────────────────────────────────────────────────
		let allFunctions = [];  // [{ name, function, params:[], open:bool }]
		let addFuncOpen  = false;

		// ── Mount widget ──────────────────────────────────────────────────────
		const $w = $(`
			<div class="mw">
				<div class="mw-card">
					<!-- Toolbar -->
					<div class="mw-toolbar">
						<div class="mw-toolbar-left">
							<div class="mw-toolbar-icon"><i class="fa fa-sitemap"></i></div>
							<div>
								<div class="mw-toolbar-label">Function &amp; Parameter Manager</div>
								<div class="mw-toolbar-sub">Manage all Functions and their Parameters</div>
							</div>
						</div>
						<div class="mw-toolbar-right">
							<span class="mw-counts" id="mw-counts">–</span>
							<button class="mw-add-func-btn" id="mw-add-func-btn">
								<i class="fa fa-plus"></i> New Function
							</button>
						</div>
					</div>

					<!-- Add Function form (always in DOM, toggled by .open) -->
					<div class="mw-add-func-form" id="mw-add-func-form">
						<i class="fa fa-cube" style="color:var(--primary);font-size:13px;flex-shrink:0"></i>
						<input class="mw-add-func-input" id="mw-add-func-input"
							type="text" placeholder="Function name…" autocomplete="off" />
						<button class="mw-btn-primary" id="mw-add-func-save">Save</button>
						<button class="mw-btn-neutral" id="mw-add-func-cancel">Cancel</button>
					</div>

					<!-- Body -->
					<div class="mw-body">
						<div id="mw-skeleton">
							${[80,55,70].map(w => `
								<div class="mw-skel-group">
									<div class="mw-skel-header">
										<div class="mw-skel" style="width:16px;height:16px;border-radius:4px;flex-shrink:0"></div>
										<div class="mw-skel" style="width:${w}%;height:13px"></div>
									</div>
								</div>`).join("")}
						</div>
						<div id="mw-list" style="display:none"></div>
					</div>
				</div>
			</div>
		`);
		wrapper.append($w);

		// ── Add Function form logic ────────────────────────────────────────────
		function openAddFuncForm() {
			addFuncOpen = true;
			$w.find("#mw-add-func-form").addClass("open");
			$w.find("#mw-add-func-input").val("").focus();
		}
		function closeAddFuncForm() {
			addFuncOpen = false;
			$w.find("#mw-add-func-form").removeClass("open");
			$w.find("#mw-add-func-input").val("");
		}

		$w.find("#mw-add-func-btn").on("click", openAddFuncForm);
		$w.find("#mw-add-func-cancel").on("click", closeAddFuncForm);
		$w.find("#mw-add-func-save").on("click", () => {
			const val = $w.find("#mw-add-func-input").val().trim();
			if (!val) { frappe.show_alert({ message: "Function name cannot be empty.", indicator: "red" }); return; }
			apiCreateFunction(val);
		});
		$w.find("#mw-add-func-input").on("keydown", e => {
			if (e.key === "Enter")  $w.find("#mw-add-func-save").trigger("click");
			if (e.key === "Escape") closeAddFuncForm();
		});

		// ── Render all function groups ────────────────────────────────────────
		function renderAll() {
			// Always close add-func form on re-render
			closeAddFuncForm();

			$w.find("#mw-skeleton").hide();
			const list = $w.find("#mw-list").show().empty();

			// Update counts
			const totalParams = allFunctions.reduce((s, f) => s + f.params.length, 0);
			$w.find("#mw-counts").text(
				`${allFunctions.length} Function${allFunctions.length !== 1 ? "s" : ""} · ${totalParams} Parameter${totalParams !== 1 ? "s" : ""}`
			);

			if (!allFunctions.length) {
				list.html(`
					<div class="mw-empty">
						<div class="mw-empty-icon"><i class="fa fa-sitemap"></i></div>
						<div class="mw-empty-title">No Functions yet</div>
						<div class="mw-empty-sub">Create your first Function to start<br>organizing Parameters for the Score Card.</div>
						<button class="mw-empty-cta" id="mw-empty-cta">
							<i class="fa fa-plus"></i> Create first Function
						</button>
					</div>
				`);
				list.find("#mw-empty-cta").on("click", openAddFuncForm);
				return;
			}

			allFunctions.forEach((f, fi) => {
				const group = buildFuncGroup(f, fi);
				list.append(group);
			});
		}

		// ── Build one function group ──────────────────────────────────────────
		function buildFuncGroup(f, fi) {
			const pc  = f.params.length;
			const key = `mwg${fi}`;  // safe index-based key

			const $g = $(`
				<div class="mw-func-group ${f.open ? "open" : ""}" style="animation-delay:${fi*0.05}s">
					<div class="mw-func-header">
						<i class="fa fa-chevron-right mw-func-chevron"></i>
						<div class="mw-func-icon"><i class="fa fa-cube"></i></div>
						<div class="mw-func-name">${frappe.utils.escape_html(f.function)}</div>
						<span class="mw-func-param-count ${pc ? "has" : ""}">${pc}</span>
						<div class="mw-func-actions">
							<button class="mw-func-btn js-rename" title="Rename"
								data-name="${f.name}"
								data-value="${frappe.utils.escape_html(f.function)}">
								<i class="fa fa-pencil"></i>
							</button>
							<button class="mw-func-btn del js-delete-func" title="Delete"
								data-name="${f.name}"
								data-label="${frappe.utils.escape_html(f.function)}">
								<i class="fa fa-trash-o"></i>
							</button>
						</div>
					</div>

					<div class="mw-param-body" style="${f.open ? "" : "display:none"}">
						<div class="mw-param-list" data-key="${key}"></div>
						<div class="mw-add-param-row" data-key="${key}">
							<i class="fa fa-tag" style="color:var(--primary);font-size:11px;flex-shrink:0"></i>
							<input class="mw-add-param-input" type="text"
								placeholder="Parameter name…" autocomplete="off" />
							<button class="mw-add-param-save">Save</button>
							<button class="mw-add-param-cancel">Cancel</button>
						</div>
						<div class="mw-kbd-hint" data-key="${key}">
							<span><span class="mw-kbd">↵</span> save</span>
							<span><span class="mw-kbd">Esc</span> cancel</span>
						</div>
						<button class="mw-add-param-btn js-add-param" data-func="${f.name}">
							<i class="fa fa-plus"></i> Add Parameter
						</button>
					</div>
				</div>
			`);

			// Render params
			const $pList = $g.find(`.mw-param-list[data-key="${key}"]`);
			if (f.params.length) {
				f.params.forEach((p, pi) => $pList.append(buildParamRow(p, pi)));
			} else {
				$pList.html(`<div class="mw-no-params"><i class="fa fa-info-circle" style="opacity:.5"></i> No parameters yet</div>`);
			}

			// ── Group events ─────────────────────────────────────────────────

			// Toggle
			$g.find(".mw-func-header").on("click", function (e) {
				if ($(e.target).closest(".mw-func-actions, input, .mw-func-btn").length) return;
				f.open = !f.open;
				$g.toggleClass("open", f.open);
				$g.find(".mw-param-body").slideToggle(180);
			});

			// Rename
			$g.find(".js-rename").on("click", function (e) {
				e.stopPropagation();
				const name  = $(this).data("name");
				const value = $(this).data("value");
				const $name = $g.find(".mw-func-name");
				const $act  = $g.find(".mw-func-actions");
				if ($name.hasClass("renaming")) return;
				$name.addClass("renaming").html(
					`<input class="mw-func-name-input" type="text" value="${frappe.utils.escape_html(value)}" autocomplete="off" />`
				);
				$act.html(`<button class="mw-hdr-save">Save</button><button class="mw-hdr-cancel">Cancel</button>`);
				const $inp = $name.find(".mw-func-name-input");
				$inp.focus().select();
				const save   = () => { const v=$inp.val().trim(); if(!v) return; apiUpdateFunction(name, v); };
				const cancel = () => loadAll();
				$act.find(".mw-hdr-save").on("click", save);
				$act.find(".mw-hdr-cancel").on("click", cancel);
				$inp.on("keydown", e => { if(e.key==="Enter") save(); if(e.key==="Escape") cancel(); });
			});

			// Delete function
			$g.find(".js-delete-func").on("click", function (e) {
				e.stopPropagation();
				const name  = $(this).data("name");
				const label = $(this).data("label");
				frappe.confirm(`Delete Function <b>${label}</b> and all its Parameters?`,
					() => apiDeleteFunction(name, label));
			});

			// Open add-param row
			$g.find(".js-add-param").on("click", function () {
				closeAllParamEdits($g);
				const $row  = $g.find(`.mw-add-param-row[data-key="${key}"]`);
				const $hint = $g.find(`.mw-kbd-hint[data-key="${key}"]`);
				$row.addClass("open");
				$hint.addClass("open");
				$row.find(".mw-add-param-input").val("").focus();
			});

			// Save add-param
			$g.find(`.mw-add-param-row[data-key="${key}"] .mw-add-param-save`).on("click", function () {
				const val = $g.find(`.mw-add-param-row[data-key="${key}"] .mw-add-param-input`).val().trim();
				if (!val) { frappe.show_alert({ message: "Name cannot be empty.", indicator: "red" }); return; }
				apiCreateParameter(f.name, val);
			});

			// Cancel add-param
			$g.find(`.mw-add-param-row[data-key="${key}"] .mw-add-param-cancel`).on("click", () => {
				closeAddParamRow($g, key);
			});

			// Keyboard in add-param
			$g.find(`.mw-add-param-row[data-key="${key}"] .mw-add-param-input`).on("keydown", function (e) {
				if (e.key === "Enter")  $g.find(`.mw-add-param-row[data-key="${key}"] .mw-add-param-save`).trigger("click");
				if (e.key === "Escape") closeAddParamRow($g, key);
			});

			// Edit param (delegated)
			$g.on("click", ".js-edit-param", function () {
				closeAddParamRow($g, key);
				closeAllParamEdits($g);
				const $btn  = $(this);
				const name  = $btn.data("name");
				const value = $btn.data("value");
				const $row  = $btn.closest(".mw-param-row");
				const $nm   = $row.find(".mw-param-name");
				const $act  = $row.find(".mw-param-actions");
				$row.addClass("editing");
				$row.data("orig-name",    $nm.html());
				$row.data("orig-actions", $act.html());
				$nm.html(`<input class="mw-row-input" type="text" value="${frappe.utils.escape_html(value)}" autocomplete="off" />`);
				$act.css("opacity","1").html(`<button class="mw-row-save">Save</button><button class="mw-row-cancel">Cancel</button>`);
				const $inp  = $nm.find(".mw-row-input");
				$inp.focus().select();
				const save   = () => { const v=$inp.val().trim(); if(!v) return; apiUpdateParameter(name, v); };
				const cancel = () => cancelParamEdit($row);
				$act.find(".mw-row-save").on("click", save);
				$act.find(".mw-row-cancel").on("click", cancel);
				$inp.on("keydown", e => { if(e.key==="Enter") save(); if(e.key==="Escape") cancel(); });
			});

			// Delete param (delegated)
			$g.on("click", ".js-del-param", function () {
				const name  = $(this).data("name");
				const label = $(this).closest(".mw-param-row").find(".mw-param-name").text().trim();
				frappe.confirm(`Delete parameter <b>${label}</b>?`, () => apiDeleteParameter(name, label));
			});

			return $g;
		}

		// ── Build one param row ───────────────────────────────────────────────
		function buildParamRow(p, pi) {
			return $(`
				<div class="mw-param-item" style="animation-delay:${pi*0.04}s">
					<div class="mw-param-row" data-name="${p.name}">
						<span class="mw-param-sr">${pi + 1}.</span>
						<div class="mw-param-name">${frappe.utils.escape_html(p.parameter)}</div>
						<div class="mw-param-actions">
							<button class="mw-icon-btn js-edit-param" title="Edit"
								data-name="${p.name}"
								data-value="${frappe.utils.escape_html(p.parameter)}">
								<i class="fa fa-pencil"></i>
							</button>
							<button class="mw-icon-btn del js-del-param" title="Delete"
								data-name="${p.name}">
								<i class="fa fa-trash-o"></i>
							</button>
						</div>
					</div>
				</div>
			`);
		}

		// ── Helpers ───────────────────────────────────────────────────────────
		function cancelParamEdit($row) {
			$row.find(".mw-param-name").html($row.data("orig-name"));
			$row.find(".mw-param-actions").css("opacity","").html($row.data("orig-actions"));
			$row.removeClass("editing");
		}
		function closeAllParamEdits($g) {
			$g.find(".mw-param-row.editing").each(function () { cancelParamEdit($(this)); });
		}
		function closeAddParamRow($g, key) {
			$g.find(`.mw-add-param-row[data-key="${key}"]`).removeClass("open");
			$g.find(`.mw-kbd-hint[data-key="${key}"]`).removeClass("open");
		}

		// ── API ───────────────────────────────────────────────────────────────
		function loadAll() {
			frappe.call({
				method: "frappe.client.get_list",
				args: { doctype: "Function", fields: ["name","function"], order_by: "creation asc", limit_page_length: 500 },
				callback(r) {
					const funcs = r.message || [];
					// Preserve open state
					const openMap = {};
					allFunctions.forEach(f => { openMap[f.name] = f.open; });
					allFunctions = funcs.map(f => ({ ...f, params: [], open: !!openMap[f.name] }));

					if (!funcs.length) { renderAll(); return; }

					let done = 0;
					allFunctions.forEach(f => {
						frappe.call({
							method: "frappe.client.get_list",
							args: { doctype: "Parameter", filters: { function: f.name }, fields: ["name","parameter"], order_by: "creation asc", limit_page_length: 500 },
							callback(r2) {
								f.params = r2.message || [];
								if (++done === allFunctions.length) renderAll();
							},
						});
					});
				},
			});
		}

		function apiCreateFunction(val) {
			frappe.call({
				method: "frappe.client.insert",
				args: { doc: { doctype: "Function", function: val } },
				callback(r) {
					if (!r.exc) {
						frappe.show_alert({ message: `Function <b>${val}</b> created.`, indicator: "green" });
						loadAll();
					}
				},
			});
		}
		function apiUpdateFunction(name, val) {
			frappe.call({
				method: "frappe.client.set_value",
				args: { doctype: "Function", name, fieldname: "function", value: val },
				callback(r) {
					if (!r.exc) { frappe.show_alert({ message: "Function renamed.", indicator: "green" }); loadAll(); }
				},
			});
		}
		function apiDeleteFunction(name, label) {
			frappe.call({
				method: "frappe.client.get_list",
				args: { doctype: "Parameter", filters: { function: name }, fields: ["name"], limit_page_length: 500 },
				callback(r) {
					const params = r.message || [];
					const delNext = i => {
						if (i >= params.length) {
							frappe.call({
								method: "frappe.client.delete",
								args: { doctype: "Function", name },
								callback(r2) {
									if (!r2.exc) { frappe.show_alert({ message: `Function <b>${label}</b> deleted.`, indicator: "orange" }); loadAll(); }
								},
							});
							return;
						}
						frappe.call({ method: "frappe.client.delete", args: { doctype: "Parameter", name: params[i].name }, callback() { delNext(i+1); } });
					};
					delNext(0);
				},
			});
		}
		function apiCreateParameter(funcName, val) {
			frappe.call({
				method: "frappe.client.insert",
				args: { doc: { doctype: "Parameter", function: funcName, parameter: val } },
				callback(r) {
					if (!r.exc) { frappe.show_alert({ message: `Parameter <b>${val}</b> added.`, indicator: "green" }); loadAll(); }
				},
			});
		}
		function apiUpdateParameter(name, val) {
			frappe.call({
				method: "frappe.client.set_value",
				args: { doctype: "Parameter", name, fieldname: "parameter", value: val },
				callback(r) {
					if (!r.exc) { frappe.show_alert({ message: "Parameter updated.", indicator: "green" }); loadAll(); }
				},
			});
		}
		function apiDeleteParameter(name, label) {
			frappe.call({
				method: "frappe.client.delete",
				args: { doctype: "Parameter", name },
				callback(r) {
					if (!r.exc) { frappe.show_alert({ message: `Parameter <b>${label}</b> deleted.`, indicator: "orange" }); loadAll(); }
				},
			});
		}

		// ── Boot ──────────────────────────────────────────────────────────────
		loadAll();
	},
});
