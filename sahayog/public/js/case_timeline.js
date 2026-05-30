(function () {
  if (window.sahayogCaseTimeline) return;

  const STATUS_META = {
    submitted: {
      indicator: "green",
      badge: "Submitted",
      dot: "🟢",
      bg: "#e8f5e9",
      color: "#1b5e20",
    },
    saved: {
      indicator: "orange",
      badge: "Pending",
      dot: "🟠",
      bg: "#fff4e5",
      color: "#e65100",
    },
    cancelled: {
      indicator: "gray",
      badge: "Cancelled",
      dot: "⚪",
      bg: "#f2f2f2",
      color: "#777777",
    },
    current: {
      indicator: "gray",
      badge: "Not Created",
      dot: "⚪",
      bg: "#f2f2f2",
      color: "#555555",
    },
  };

  function escape_html(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function to_array(value) {
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  function is_new_form(frm) {
    return !!(frm && typeof frm.is_new === "function" && frm.is_new());
  }

  function normalize_stage(stage, index) {
    const label =
      stage.label || stage.stage || stage.doctype || stage.title || `Stage ${index + 1}`;
    const doctype = stage.doctype || stage.create_doctype || stage.stage_doctype || label;
    const key = stage.key || doctype || label || String(index);

    return {
      key,
      label,
      doctype,
      status: (stage.status || "current").toLowerCase(),
      modified:
        stage.modified ||
        stage.modified_on ||
        stage.modified_at ||
        stage.modified_date ||
        stage.timestamp ||
        null,
      count: stage.count ?? null,
      record_count: stage.record_count ?? null,
      names: to_array(stage.names),
      icon: stage.icon || null,
      can_create: stage.can_create !== false,
      allow_multiple: stage.allow_multiple !== false,
      quick_entry: stage.quick_entry !== false,
      only_save: !!stage.only_save,
      defaults: stage.defaults || {},
      route_options: stage.route_options || {},
      tooltip: stage.tooltip || "",
      note: stage.note || "",
      raw: stage,
    };
  }

  function normalize_config(options = {}) {
    return {
      title: options.title || __("Case Progress Timeline"),
      empty_text: options.empty_text || __("No timeline data available."),
      stages: to_array(options.stages || options.timeline),
      case_id: options.case_id || null,
      box_id: options.box_id || null,
      container_selector: options.container_selector || ".form-dashboard",
      insert_before: options.insert_before || null,
      refresh_after_insert: options.refresh_after_insert !== false,
      ensure_saved: options.ensure_saved !== false,
      get_defaults: options.get_defaults || null,
      before_open: options.before_open || null,
      after_insert: options.after_insert || null,
      on_create_error: options.on_create_error || null,
      on_render: options.on_render || null,
    };
  }

  function format_timestamp(ts) {
    if (!ts) return "-";

    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);

      const opts_time = { hour: "2-digit", minute: "2-digit", hour12: true };
      const opts_date = { day: "2-digit", month: "short", year: "numeric" };
      return `${d.toLocaleTimeString([], opts_time)}, ${d.toLocaleDateString([], opts_date)}`;
    } catch (e) {
      return String(ts);
    }
  }

  function format_modified_for_dialog(ts) {
    if (!ts) return "-";

    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);

      const opts_time = { hour: "2-digit", minute: "2-digit", hour12: true };
      const opts_date = { day: "2-digit", month: "short", year: "numeric" };
      return `${d.toLocaleTimeString([], opts_time)}, ${d.toLocaleDateString([], opts_date)}`;
    } catch (e) {
      return String(ts);
    }
  }

  function get_status_meta(status) {
    return STATUS_META[status] || STATUS_META.current;
  }

  function build_stage_card(stage, index, config) {
    const meta = get_status_meta(stage.status);
    const modified = format_timestamp(stage.modified);
    const raw_count = stage.record_count ?? stage.count ?? stage.names.length ?? 0;
    const count_text =
      raw_count === null || raw_count === undefined
        ? ""
        : raw_count === 1
          ? __("1 record")
          : __("{0} records", [raw_count]);

    const create_disabled = !stage.can_create;
    const create_title = create_disabled
      ? __("Locked / Not allowed")
      : __("Create {0}", [stage.label]);

    const count_value = stage.record_count ?? stage.count ?? stage.names.length ?? 0;
    const count_label = count_value === 1 ? __("1") : __("{0}", [count_value]);

    return `
      <div class="sahayog-case-timeline__card" data-stage-key="${escape_html(stage.key)}" data-stage-index="${index}">
        <div class="sahayog-case-timeline__card-head">
          <div class="sahayog-case-timeline__stage-meta">
            <div class="sahayog-case-timeline__title-row">
              <span class="sahayog-case-timeline__dot" title="${escape_html(count_text || __('No records'))}" style="background:${meta.bg};color:${meta.color};">${escape_html(count_label)}</span>
              <div>
                <div class="sahayog-case-timeline__label">${escape_html(stage.label)}</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="btn btn-xs ${create_disabled ? "btn-default" : "btn-primary"} sahayog-case-timeline__add"
            data-stage-index="${index}"
            title="${escape_html(create_title)}"
            ${create_disabled ? "disabled" : ""}
          >
            ${create_disabled ? "🔒" : "+"}
          </button>
        </div>

        <div class="sahayog-case-timeline__badge-row">
          <div class="sahayog-case-timeline__badge" style="background:${meta.bg};color:${meta.color};">
            ${escape_html(meta.badge)}
          </div>
        </div>


        <div class="sahayog-case-timeline__bottom-row">
          <div class="sahayog-case-timeline__time">${escape_html(modified)}</div>
          ${stage.note ? `<div class="sahayog-case-timeline__note">${escape_html(stage.note)}</div>` : ""}
        </div>
      </div>
    `;
  }

  function ensure_timeline_styles() {
    if (document.getElementById("sahayog-case-timeline-styles")) return;

    const style = document.createElement("style");
    style.id = "sahayog-case-timeline-styles";
    style.textContent = `
      .sahayog-case-timeline {
        background: #fff;
        border: 1px solid #dfe3e8;
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 14px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }

      .sahayog-case-timeline__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .sahayog-case-timeline__title {
        font-size: 14px;
        font-weight: 600;
        color: #1f3b5b;
        margin: 0;
      }

      .sahayog-case-timeline__track {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 8px;
      }

      .sahayog-case-timeline__card {
        border: 1px solid #e4e8ef;
        border-radius: 10px;
        padding: 8px 10px;
        background: linear-gradient(180deg, #fff, #fafbfc);
        min-height: 108px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .sahayog-case-timeline__card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .sahayog-case-timeline__card {
        cursor: pointer;
      }

      .sahayog-case-timeline__card:hover .sahayog-case-timeline__label,
      .sahayog-case-timeline__card:hover .sahayog-case-timeline__count-bubble-num {
        text-decoration: underline;
      }

      .sahayog-case-timeline__badge-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: auto;
        width: 100%;
      }

      .sahayog-case-timeline__count-bubble {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #1f3b5b;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        flex: 0 0 28px;
      }

      .sahayog-case-timeline__count-bubble-num {
        line-height: 1;
      }

      .sahayog-case-timeline__dialog-shell {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .sahayog-case-timeline__dialog-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border: 1px solid #e4e8ef;
        border-radius: 12px;
        background: linear-gradient(180deg, #ffffff, #fbfcfe);
      }

      .sahayog-case-timeline__dialog-title {
        font-size: 14px;
        font-weight: 700;
        color: #20262e;
      }

      .sahayog-case-timeline__dialog-subtitle {
        font-size: 11px;
        color: #667085;
        margin-top: 2px;
      }

      .sahayog-case-timeline__dialog-count {
        min-width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #1f3b5b;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        flex: 0 0 44px;
      }

      .sahayog-case-timeline__dialog-table-wrap {
        border: 1px solid #e4e8ef;
        border-radius: 12px;
        overflow: hidden;
        max-height: 460px;
        background: #fff;
      }

      .sahayog-case-timeline__dialog-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: 0;
      }

      .sahayog-case-timeline__dialog-table thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #f8fafc;
        color: #344054;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 12px 14px;
        border-bottom: 1px solid #e4e8ef;
      }

      .sahayog-case-timeline__dialog-table tbody td {
        padding: 12px 14px;
        border-bottom: 1px solid #eef2f6;
        font-size: 12px;
        color: #20262e;
        vertical-align: middle;
      }

      .sahayog-case-timeline__dialog-table tbody tr:nth-child(even) {
        background: #fafbfc;
      }

      .sahayog-case-timeline__dialog-table tbody tr:hover {
        background: #f4f7fb;
      }

      .sahayog-case-timeline__dialog-table tbody tr.status-pending {
        background: #fff7ec;
      }

      .sahayog-case-timeline__dialog-table tbody tr.status-pending:hover {
        background: #ffeccb;
      }

      .sahayog-case-timeline__dialog-table tbody tr.status-submitted {
        background: #eef8ef;
      }

      .sahayog-case-timeline__dialog-table tbody tr.status-submitted:hover {
        background: #e1f3e3;
      }

      .sahayog-case-timeline__record-link {
        color: #1f3b5b;
        font-weight: 600;
        text-decoration: none;
      }

      .sahayog-case-timeline__record-link:hover {
        text-decoration: underline;
      }

      .sahayog-case-timeline__dialog-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        color: #667085;
        padding: 0 2px;
      }

      .sahayog-case-timeline__dialog-refresh {
        color: #1f3b5b;
        font-weight: 600;
        text-decoration: none;
      }

      .sahayog-case-timeline__dialog-refresh:hover {
        text-decoration: underline;
      }

      .sahayog-case-timeline__time {
        font-size: 10px;
        color: #7a7f87;
      }

      .sahayog-case-timeline__title-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .sahayog-case-timeline__dot {
        min-width: 28px;
        height: 28px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        flex: 0 0 auto;
        margin-top: 1px;
      }

      .sahayog-case-timeline__label {
        font-size: 11px;
        font-weight: 600;
        color: #20262e;
        line-height: 1.15;
        white-space: nowrap;
      }

      .sahayog-case-timeline__subline,
      .sahayog-case-timeline__note {
        font-size: 10px;
        color: #667085;
        text-align: center;
      }

      .sahayog-case-timeline__bottom-row {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        margin-top: auto;
        padding-top: 4px;
        text-align: center;
      }

      .sahayog-case-timeline__badge {
        width: fit-content;
        padding: 3px 7px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
      }

      .sahayog-case-timeline__add {
        min-width: 24px;
        min-height: 24px;
        font-weight: 700;
        line-height: 1;
        padding: 0;
      }

      .sahayog-case-timeline__footer {
        margin-top: 5px;
        padding-top: 6px;
        border-top: 1px solid #edf0f4;
        font-size: 10px;
        color: #7a7f87;
        display: flex;
        justify-content: space-between;
        gap: 6px;
        flex-wrap: wrap;
      }

      .sahayog-case-timeline__empty {
        color: #7a7f87;
        font-size: 13px;
        padding: 6px 2px 2px;
      }

      @media (max-width: 767px) {
        .sahayog-case-timeline {
          padding: 10px;
        }

        .sahayog-case-timeline__track {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function get_insertion_point(frm, config) {
    const $wrapper = $(frm.wrapper);
    if (config.insert_before) {
      const $target = $wrapper.find(config.insert_before);
      if ($target.length) return $target;
    }

    const $container = $wrapper.find(config.container_selector);
    if ($container.length) return $container;

    return $wrapper;
  }

  function build_box_id(frm, config) {
    if (config.box_id) return config.box_id;
    return `sahayog-case-timeline-${frm.doctype.replace(/\s+/g, "-").toLowerCase()}`;
  }

  function create_doc_for_stage(frm, stage, config) {
    const doctype = stage.doctype;
    const doc = frappe.model.get_new_doc(doctype, null, null, true);

    const defaults =
      typeof config.get_defaults === "function"
        ? config.get_defaults(stage, frm) || {}
        : {};

    Object.assign(doc, defaults, stage.defaults || {});

    if (!doc.case_id && config.case_id) {
      doc.case_id = config.case_id;
    }

    return doc;
  }

  function open_stage_quick_entry(frm, stage, config) {
    if (!stage.can_create) return;

    if (typeof config.before_open === "function") {
      const proceed = config.before_open(stage, frm);
      if (proceed === false) return;
    }

    if (config.ensure_saved && frm.is_dirty()) {
      frappe.msgprint({
        title: __("Please Save First"),
        message: __("Save the form before creating a linked record."),
        indicator: "orange",
      });
      return;
    }

    // Prepare defaults
    const defaults =
      typeof config.get_defaults === "function"
        ? config.get_defaults(stage, frm) || {}
        : {};
    
    const combined_defaults = Object.assign({}, defaults, stage.defaults || {});
    if (!combined_defaults.case_id && config.case_id) {
        combined_defaults.case_id = config.case_id;
    }

    // 🚀 STABLE APPROACH: Use frappe.new_doc for "only_save" stages
    // This opens the full form instead of a buggy Quick Entry dialog
    if (stage.only_save) {
        frappe.new_doc(stage.doctype, combined_defaults);
        return;
    }

    // Normal Quick Entry for stages that don't require strict "Save as Draft"
    frappe.ui.form.make_quick_entry(
      stage.doctype,
      (saved_doc) => {
        if (typeof config.after_insert === "function") {
          config.after_insert(saved_doc, stage, frm);
          return;
        }

        if (config.refresh_after_insert) {
          frm.reload_doc();
        }
      },
      null,
      combined_defaults,
      true,
    );
  }


  function open_stage_records_dialog(frm, stage) {
    const case_id = frm.doc.case_id || frm.doc.name;
    const d = new frappe.ui.Dialog({
      title: __("{0} Records", [stage.label]),
      size: "extra-large",
      fields: [
        {
          fieldtype: "HTML",
          fieldname: "records_html",
          options: `
            <div class="sahayog-case-timeline__dialog-loading" style="font-size:12px;color:#667085;">
              ${escape_html(__('Loading records...'))}
            </div>
          `,
        },
      ],
      primary_action_label: __("Refresh Timeline"),
      primary_action() {
        frm.reload_doc();
        d.hide();
      },
    });

    const render_empty = (message) => {
      d.fields_dict.records_html.$wrapper.html(`
        <div style="padding:18px; text-align:center; color:#667085; font-size:12px;">
          ${escape_html(message)}
        </div>
      `);
    };

    const render_rows = (records, owner_map) => {
      const total = records.length;
      const rows = records.length
        ? records.map((row, idx) => {
            const modified = format_modified_for_dialog(row.modified);
            const owner_label = owner_map[row.owner] || row.owner || '-';
            const status_label = row.docstatus === 1 ? __('Submitted') : row.docstatus === 0 ? __('Pending') : row.docstatus === 2 ? __('Cancelled') : '-';
            const row_class = row.docstatus === 0 ? "status-pending" : row.docstatus === 1 ? "status-submitted" : "";
            const record_link = frappe.utils.get_form_link(stage.doctype, row.name);
            const is_current_doc = stage.doctype === frm.doctype && row.name === frm.doc.name;
            const record_href = is_current_doc ? "#" : record_link;
            const record_onclick = is_current_doc
              ? 'return frappe.msgprint({ title: __("Already Open"), message: __("You are already on this document."), indicator: "blue" });'
              : 'return true;';
            return `
              <tr class="${row_class}">
                <td style="width:72px;">${idx + 1}</td>
                <td>
                  <a href="${escape_html(record_href)}" class="sahayog-case-timeline__record-link" onclick='${record_onclick}'>${escape_html(row.name)}</a>
                </td>
                <td style="width:170px;">${escape_html(owner_label)}</td>
                <td style="width:120px;">${escape_html(status_label)}</td>
                <td style="width:190px;">${escape_html(modified)}</td>
              </tr>
            `;
          }).join('')
        : `
          <tr>
            <td colspan="5" style="color:#777; text-align:center; padding:18px;">No records created yet</td>
          </tr>
        `;

      d.fields_dict.records_html.$wrapper.html(`
        <div class="sahayog-case-timeline__dialog-shell">
          <div class="sahayog-case-timeline__dialog-summary">
            <div>
              <div class="sahayog-case-timeline__dialog-title">${escape_html(stage.label)}</div>
              <div class="sahayog-case-timeline__dialog-subtitle">${escape_html(__('Records linked to this case'))}</div>
            </div>
            <div class="sahayog-case-timeline__dialog-count">${escape_html(String(total))}</div>
          </div>
          <div class="sahayog-case-timeline__dialog-table-wrap">
            <table class="sahayog-case-timeline__dialog-table">
              <thead>
                <tr>
                  <th style="width:72px;">#</th>
                  <th>Name</th>
                  <th style="width:220px;">Created By</th>
                  <th style="width:120px;">Status</th>
                  <th style="width:190px;">Modified</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div class="sahayog-case-timeline__dialog-footer">
            <span>${escape_html(__('Tip: click a record name to open it'))}</span>
            <a href="#" class="sahayog-case-timeline__dialog-refresh">${escape_html(__('Refresh'))}</a>
          </div>
        </div>
      `);

      d.fields_dict.records_html.$wrapper.off('click.sahayogTimelineDialog').on('click.sahayogTimelineDialog', '.sahayog-case-timeline__dialog-refresh', function (e) {
        e.preventDefault();
        load_records();
      });

    };

    const load_records = () => {
      d.fields_dict.records_html.$wrapper.html(`
        <div style="padding:18px; text-align:center; color:#667085; font-size:12px;">
          ${escape_html(__('Loading records...'))}
        </div>
      `);

      return frappe.db.get_list(stage.doctype, {
        filters: { case_id },
        fields: ['name', 'modified', 'owner', 'docstatus'],
        order_by: 'modified desc',
        limit_page_length: 200,
      }).then((records) => {
        const owners = [...new Set((records || []).map((row) => row.owner).filter(Boolean))];
        if (!owners.length) {
          render_rows(records || [], {});
          return;
        }

        return frappe.db.get_list('User', {
          filters: { name: ['in', owners] },
          fields: ['name', 'full_name'],
          limit_page_length: owners.length,
        }).then((users) => {
          const owner_map = {};
          (users || []).forEach((user) => {
            owner_map[user.name] = user.full_name || user.name;
          });
          render_rows(records || [], owner_map);
        }).catch(() => {
          render_rows(records || [], {});
        });
      }).catch((error) => {
        console.error('Record dialog load failed', error);
        render_empty(__('Failed to load records'));
      });
    };

    d.show();
    load_records();
  }

  function bind_card_events(frm, box_id, stages, config) {
    const $box = $(frm.wrapper).find(`#${box_id}`);
    if (!$box.length) return;

    $box.off("click.sahayogTimeline");
    $box.on("click.sahayogTimeline", ".sahayog-case-timeline__add", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const index = Number($(this).data("stage-index"));
      const stage = stages[index];
      if (!stage) return;

      open_stage_quick_entry(frm, stage, config);
    });

    $box.on("click.sahayogTimeline", ".sahayog-case-timeline__card", function (e) {
      if ($(e.target).closest(".sahayog-case-timeline__add, a").length) return;

      const index = Number($(this).data("stage-index"));
      const stage = stages[index];
      if (!stage) return;

      open_stage_records_dialog(frm, stage);
    });
  }

  function render(frm, options = {}) {
    if (is_new_form(frm)) return;
    ensure_timeline_styles();

    const config = normalize_config(options);
    const stages = config.stages.map(normalize_stage);
    const box_id = build_box_id(frm, config);
    const $existing = $(frm.wrapper).find(`#${box_id}`);
    if ($existing.length) $existing.remove();

    const insertion_point = get_insertion_point(frm, config);
    if (!insertion_point.length) {
      console.warn('Case timeline insertion point not found for', frm.doctype);
      return;
    }

    let html = `
      <div id="${escape_html(box_id)}" class="sahayog-case-timeline">
        <div class="sahayog-case-timeline__header">
          <h4 class="sahayog-case-timeline__title">${escape_html(config.title)}</h4>
        </div>
    `;

    if (!stages.length) {
      html += `<div class="sahayog-case-timeline__empty">${escape_html(config.empty_text)}</div>`;
    } else {
      html += `<div class="sahayog-case-timeline__track">`;
      stages.forEach((stage, index) => {
        html += build_stage_card(stage, index, config);
      });
      html += `</div>`;
    }

    html += `
        <div class="sahayog-case-timeline__footer">
          <span>Stage-wise quick create</span>
          <span>Use the + button to open a quick form</span>
        </div>
      </div>
    `;

    if (insertion_point.is(frm.wrapper)) {
      insertion_point.prepend(html);
    } else {
      insertion_point.before(html);
    }
    bind_card_events(frm, box_id, stages, config);

    if (typeof config.on_render === "function") {
      config.on_render({ frm, stages, box_id, config });
    }
  }

  function load(frm, options = {}) {
    if (is_new_form(frm)) return Promise.resolve();
    const config = normalize_config(options);

    if (typeof options.get_timeline !== "function") {
      render(frm, config);
      return Promise.resolve();
    }

    return Promise.resolve(options.get_timeline(frm, config))
      .then((timeline) => {
        render(frm, {
          ...config,
          timeline,
        });
      })
      .catch((error) => {
        console.error('Case timeline load failed', error);
        render(frm, config);
      });
  }

  window.sahayogCaseTimeline = {
    render,
    load,
    open_stage_quick_entry,
  };
})();
