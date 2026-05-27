// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Unauthorized Absence", {
  // employee_id: function (frm) {
  //   if (frm.doc.employee_id) {
  //     frappe.db.get_doc("Employee", frm.doc.employee_id).then((emp) => {
  //       let html_content = `
  //                       <div style="padding:10px; border:1px solid #d1d8dd; border-radius:8px;">
  //                           <p><b>Employee Name:</b> ${emp.employee_name || ""}</p>
  //                           <p><b>Designation:</b> ${emp.designation || ""}</p>
  //                           <p><b>Branch Name:</b> ${emp.branch || ""}</p>
  //                           <p><b>Branch ID:</b> ${emp.sol_id || ""}</p>
  //                           <p><b>Zone Name:</b> ${emp.custom_zone || ""}</p>
  //                           <p><b>Region:</b> ${emp.custom_region || ""}</p>
  //                       </div>
  //                   `;

  //       frm.fields_dict.employee_details.$wrapper.html(html_content);
  //     });
  //   } else {
  //     frm.fields_dict.employee_details.$wrapper.html("");
  //   }
  // },
  refresh(frm) {
    if (!frm.is_new()) {
      frm.add_custom_button("Send Email", function () {
        frappe.call({
          method:
            "sahayog.hrms.doctype.unauthorized_absence.unauthorized_absence.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            let email = r.message;

            // CASE 1: Email Exists → Ask for confirmation
            if (email) {
              frappe.confirm(
                `Are you sure you want to send the Unauthorized Absence Email to:<br><b>${email}</b>?`,
                function () {
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.unauthorized_absence.unauthorized_absence.send_unauthorized_absence_email",
                    args: { docname: frm.doc.name },
                    freeze: true,
                    freeze_message: __("Sending Unauthorized Absence Email..."),
                    callback() {
                      frappe.msgprint(
                        __("Unauthorized Absence Email sent successfully!"),
                      );
                    },
                  });
                },
              );
            }

            // CASE 2: Email Missing → Show error
            else {
              frappe.msgprint({
                title: __("Email Not Found"),
                indicator: "red",
                message: __(
                  "No email address is stored for this employee.<br>Please update the Employee record before sending this Unauthorized Absence Email.",
                ),
              });
            }
          },
        });
      });
    }
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    // ✅ Call print button function

    frm.trigger("show_print_button");

    // Timeline only for saved documents
    if (!frm.is_new()) {
      load_case_timeline(frm);
    }
    if (
      frm.fields_dict.amount_of_fraud &&
      frm.fields_dict.amount_of_fraud.$input
    ) {
      frm.fields_dict.amount_of_fraud.$input.off("keypress.amount_check");
      frm.fields_dict.amount_of_fraud.$input.on(
        "keypress.amount_check",
        function (e) {
          const char = String.fromCharCode(e.which || e.keyCode);
          if (!/[0-9.]/.test(char)) {
            e.preventDefault();
          }
        },
      );
    }
    let today = frappe.datetime.now_date();

    if (frm.fields_dict.issue_occurrence_date) {
      frm.fields_dict.issue_occurrence_date.df.max = today;
      frm.fields_dict.issue_occurrence_date.refresh();
    }

    if (frm.fields_dict.issue_report_to_hr) {
      frm.fields_dict.issue_report_to_hr.df.max = today;
      frm.fields_dict.issue_report_to_hr.refresh();
    }

    // -------------------
    // Prevent typing alphabets in Amount of Fraud field
    // -------------------
    if (
      frm.fields_dict.amount_of_fraud &&
      frm.fields_dict.amount_of_fraud.$input
    ) {
      frm.fields_dict.amount_of_fraud.$input.off("keypress.amount_check");
      frm.fields_dict.amount_of_fraud.$input.on(
        "keypress.amount_check",
        function (e) {
          const char = String.fromCharCode(e.which || e.keyCode);
          if (!/[0-9.]/.test(char)) {
            e.preventDefault();
          }
        },
      );
    }

    // -------------------------------------------------------------------------
    // DASHBOARD LINK RESTRICTIONS
    // -------------------------------------------------------------------------
    setTimeout(() => {
      const $ruaBtn = $(
        'button[data-doctype="Reminder Of Unauthorized Absence"]',
      );
      const $ccBtn = $('button[data-doctype="Case Closure"]');

      // Remove previous handlers (avoid duplicates)
      $ruaBtn.off("mousedown.rua_check");
      $ccBtn.off("mousedown.cc_check");

      // 🧩 Common Save Check
      const ensureSaved = (e) => {
        if (frm.is_dirty()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Please Save First"),
            message: __("Save the form before creating a linked record."),
            indicator: "orange",
          });
          return false;
        }
        return true;
      };

      // Restriction for Reminder Of Unauthorized Absence
      $ruaBtn.on("mousedown.rua_check", (e) => {
        if (!ensureSaved(e)) return;

        if (frm.doc.response_of_ua !== "No") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Reminder of Unauthorized Absence can only be created if the response to Unauthorized Absence is <b>No</b>.",
            ),
            indicator: "red",
          });
        }
      });

      // Restriction for Case Closure
      $ccBtn.on("mousedown.cc_check", (e) => {
        if (!ensureSaved(e)) return;

        if (frm.doc.response_of_ua !== "Yes") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Case Closure can only be created if the response to Unauthorized Absence is <b>Yes</b>.",
            ),
            indicator: "red",
          });
        }
      });
    }, 1000);
  },
  // Trigger when the field is changed
  date_of_1st_letter(frm) {
    let today = frappe.datetime.now_date();

    if (frm.doc.date_of_1st_letter && frm.doc.date_of_1st_letter < today) {
      frappe.msgprint({
        title: __("Invalid Date"),
        message: __(
          "You cannot select a past date for Date of Unauthorized Absence.",
        ),
        indicator: "red",
      });
      frm.set_value("date_of_1st_letter", "");
    }
  },

  // Validation on save
  validate(frm) {
    let today = frappe.datetime.now_date();

    if (frm.doc.date_of_1st_letter && frm.doc.date_of_1st_letter < today) {
      frappe.throw(__("Date of Unauthorized Absence cannot be in past."));
    }
  },

  show_print_button: function (frm) {
    // ✅ Only allow for saved documents
    if (!frm.is_new()) {
      const allowed_roles = [
        "System Manager",
        "HR Support Executive",
        "HR Support Manager",
      ];
      if (frappe.user_roles.some((role) => allowed_roles.includes(role))) {
        frm
          .add_custom_button(__("Print"), function () {
            // Create overlay
            const overlay = document.createElement("div");
            overlay.id = "print-overlay";
            overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255,255,255,0.6);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #333;
      `;
            overlay.innerHTML = "Preparing print preview...";
            document.body.appendChild(overlay);

            // Create hidden iframe for print preview
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = frappe.urllib.get_full_url(
              `/printview?doctype=${encodeURIComponent(
                frm.doc.doctype,
              )}&name=${encodeURIComponent(
                frm.doc.name,
              )}&format=${encodeURIComponent("Unauthorized Absence")}`,
            );
            document.body.appendChild(iframe);

            iframe.onload = () => {
              const doc = iframe.contentWindow.document;

              // Inject CSS with background image for print
              const style = doc.createElement("style");
              style.innerHTML = `
                @page {
                    size: A4;
                    margin: 0 !important;
                }

                html, body {
                    margin:0 !important;
                    padding:0 !important;
                    width:210mm !important;
                    height:297mm !important;
                    overflow:hidden !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                .print-page {
                    position:relative;
                    width:210mm; height:297mm;
                    overflow:hidden;
                }

                .print-body {
                    padding: 145px 30px 40px 30px;
                    height:100%;
                    box-sizing:border-box;
                    page-break-inside: avoid;
                }
          `;
              doc.head.appendChild(style);

              // Wrap body content
              const bodyHTML = doc.body.innerHTML;
              doc.body.innerHTML = `<div class="print-content">${bodyHTML}</div>`;

              // Preload background image
              const bgImg = new Image();
              bgImg.src = "/assets/sahayog/images/letter_head_and_footer_.png";
              bgImg.onload = function () {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              };

              // Fallback
              setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              }, 3000);

              let done = false;
              const cleanup = () => {
                if (done) return;
                done = true;
                overlay.remove();
                iframe.remove();
              };

              iframe.contentWindow.addEventListener("afterprint", cleanup);
              setTimeout(cleanup, 6000);
            };

            iframe.onerror = () => {
              frappe.msgprint(__("Error loading print preview"));
              overlay.remove();
              iframe.remove();
            };
          })
          .addClass("btn-primary");
      }
    }
  },
  issue_occurrence_date: function (frm) {
    let today = frappe.datetime.now_date();
    if (
      frm.doc.issue_occurrence_date &&
      frm.doc.issue_occurrence_date > today
    ) {
      frappe.msgprint(
        "You cannot select a future date for Issue Occurrence Date.",
      );
      frm.set_value("issue_occurrence_date", "");
    }
  },

  issue_reported_to_hr: function (frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.issue_reported_to_hr && frm.doc.issue_reported_to_hr > today) {
      frappe.msgprint(
        "You cannot select a future date for Issue Reported to HR.",
      );
      frm.set_value("issue_reported_to_hr", "");
    }
  },

  amount_of_fraud: function (frm) {
    let value = frm.doc.amount_of_fraud;
    if (value && isNaN(value)) {
      frappe.msgprint({
        title: __("Invalid Input"),
        message: __(
          "Please enter a valid numeric amount in 'Amount of Fraud'.",
        ),
        indicator: "red",
      });
      frm.set_value("amount_of_fraud", 0);
    }
  },

  validate: function (frm) {
    let today = frappe.datetime.now_date();
    if (
      frm.doc.issue_occurrence_date &&
      frm.doc.issue_occurrence_date > today
    ) {
      frappe.throw(__("Issue Occurrence Date cannot be in the future."));
    }
    if (frm.doc.issue_reported_to_hr && frm.doc.issue_reported_to_hr > today) {
      frappe.throw(__("Issue Reported to HR Date cannot be in the future."));
    }
    if (frm.doc.amount_of_fraud && isNaN(frm.doc.amount_of_fraud)) {
      frappe.throw(__("Amount of Fraud must be a valid number."));
    }
  },
  setup(frm) {
    frm.set_query("employee_id", function () {
      return {
        filters: {
          status: "Active",
          cxo_level: 0,
        },
      };
    });
  },
});

function render_timeline(frm, data) {
  // debug: show incoming timeline payload in console
  console.debug(
    "render_timeline payload:",
    data && data.timeline ? data.timeline : data,
  );

  const wrap = $(frm.wrapper).find(".case-timeline-box");
  if (wrap.length) wrap.remove();

  const insertion_point = $(frm.wrapper).find(".form-dashboard");

  let html = `
    <div class="case-timeline-box" style="
        background:#ffffff;
        border:1px solid #e0e0e0;
        padding:10px;
        margin-bottom:10px;
        border-radius:8px;
        box-shadow:0 1px 2px rgba(0,0,0,0.05);
        font-size:13px;
    ">
        <h4 style="margin-top:0; color:#1a73e8; font-weight:600; font-size:14px;">
            Case Progress Timeline
        </h4>

        <!-- TIMELINE BADGES -->
        <div style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-top:6px;">
  `;

  // guard: if no timeline array, do nothing
  const timeline_arr =
    data && data.timeline ? data.timeline : Array.isArray(data) ? data : [];
  if (!timeline_arr.length) {
    html += `<div style="color:#777; font-size:14px;">No timeline data available.</div>`;
  } else {
    timeline_arr.forEach((stage_obj, index) => {
      html += timeline_badge(stage_obj);
      if (index < timeline_arr.length - 1) {
        html += `<div style="font-size:20px; color:#9e9e9e; margin-top:15px;">→</div>`;
      }
    });
  }

  html += `
        </div>

        <!-- LEGEND OUTSIDE / BELOW -->
        <div style="
            margin-top:10px;
            padding-top:6px;
            border-top:1px solid #e0e0e0;
            font-size:11px;
            color:#777;
            display:flex;
            gap:14px;
            justify-content:right;
        ">
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">🟢</span><span>Completed</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">🟠</span><span>In Progress</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">⚪</span><span>Not Created</span>
            </div>
        </div>

    </div>
  `;

  insertion_point.before(html);
}
function timeline_badge(stage_obj) {
  let bg = "#eeeeee",
    color = "#555",
    icon = "⚪";
  switch ((stage_obj.status || "").toLowerCase()) {
    case "submitted":
      bg = "#e8f5e9";
      color = "#1b5e20";
      icon = "🟢";
      break;
    case "saved":
      bg = "#fff4e5";
      color = "#e65100";
      icon = "🟠";
      break;
    case "cancelled":
      bg = "#f0f0f0"; // light gray
      color = "#999";
      icon = "⚪";
      break;
    default:
      bg = "#eeeeee";
      color = "#555";
      icon = "⚪";
  }

  // Get modified timestamp
  let ts =
    stage_obj.modified ||
    stage_obj.modified_on ||
    stage_obj.modified_at ||
    stage_obj.modified_date ||
    stage_obj.timestamp ||
    null;

  // Format timestamp in hh:mm AM/PM, dd MMM yyyy
  let formatted = "-";
  if (ts) {
    try {
      let d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const optsTime = { hour: "2-digit", minute: "2-digit", hour12: true };
        const optsDate = { day: "2-digit", month: "short", year: "numeric" };
        formatted = `${d.toLocaleTimeString(
          [],
          optsTime,
        )}, ${d.toLocaleDateString([], optsDate)}`;
      }
    } catch (e) {
      console.warn("Failed to format timestamp", e);
      formatted = String(ts);
    }
  }

  const stage_label =
    stage_obj.stage || stage_obj.doctype || stage_obj.title || "";

  return `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
      <!-- TIMESTAMP (small, above badge) -->
      <div style="font-size:10px; color:#777; margin-bottom:3px;">
        ${formatted}
      </div>

      <!-- EXISTING BADGE -->
      <div style="
          padding:3px 6px;
          background:${bg};
          color:${color};
          border-radius:14px;
          font-weight:600;
          display:flex;
          align-items:center;
          gap:4px;
          font-size:11px;
      ">
        ${icon} ${stage_label}
      </div>
    </div>
  `;
}
// ===============================
// DAMS Timeline Hover Tooltip
// ===============================
(function () {
  let tooltip = null;

  function show_tooltip(target, html) {
    hide_tooltip();

    tooltip = $(`
      <div style="
        position:absolute;
        background:#2e2e2e;
        color:#fff;
        padding:6px 8px;
        border-radius:6px;
        font-size:11px;
        z-index:99999;
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
        max-width:220px;
      ">
        ${html}
      </div>
    `);

    $("body").append(tooltip);

    const offset = $(target).offset();
    tooltip.css({
      top: offset.top - tooltip.outerHeight() - 6,
      left: offset.left + $(target).outerWidth() / 2 - tooltip.outerWidth() / 2,
    });
  }

  function hide_tooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  $(document).on(
    "mouseenter",
    ".case-timeline-box div[style*='border-radius:14px']",
    function () {
      const frm = cur_frm;
      if (!frm || !frm._timeline_counts) return;

      const label = $(this)
        .text()
        .replace(/^[^\w]+/, "")
        .trim();

      const info = frm._timeline_counts[label];

      let html = `<b>${label}</b>`;

      if (!info || info.count === 0) {
        html += `<br>No records created yet`;
      } else {
        html += `<br>Records created: ${info.count}`;
        html += `<br><span style="opacity:.8;">${info.names.join(
          "<br>",
        )}</span>`;
      }

      show_tooltip(this, html);
    },
  );

  $(document).on(
    "mouseleave",
    ".case-timeline-box div[style*='border-radius:14px']",
    hide_tooltip,
  );
})();

function load_case_timeline(frm) {
  const case_id = frm.doc.case_id || frm.doc.name;
  if (!case_id) return;

  const standard_stages = [
    { doctype: "Disciplinary Case", label: "Disciplinary Case", can_create: false },
    { doctype: "Suspension Process", label: "Suspension Process" },
    { doctype: "Response to SCN", label: "Response to SCN" },
    { doctype: "Domestic Enquiry", label: "Domestic Enquiry" },
    { doctype: "Enquiry Reminder", label: "Enquiry Reminder" },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const ua_stages = [
    { doctype: "Unauthorized Absence", label: "Unauthorized Absence" },
    { doctype: "Reminder Of Unauthorized Absence", label: "Reminder Of Unauthorized Absence" },
    { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry" },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const is_ua =
    String(case_id).startsWith("UA") ||
    (frm.doc.case_type || "").toLowerCase() === "unauthorized absence" ||
    frm.doctype === "Unauthorized Absence" ||
    frm.doctype === "Reminder Of Unauthorized Absence" ||
    frm.doctype === "Ex Parte Enquiry";

  const stage_defs = (is_ua ? ua_stages : standard_stages).map((stage, index) => ({
    ...stage,
    key: `${stage.doctype}-${index}`,
    status: "current",
    modified: null,
    record_count: 0,
    names: [],
    can_create: stage.can_create !== false,
    allow_multiple: false,
    quick_entry: true,
    defaults: {
      case_id,
      ...(frm.doc.employee_id ? { employee_id: frm.doc.employee_id } : {}),
    },
  }));

  const build_config = (stages) => ({
    title: __("Case Progress Timeline"),
    case_id,
    stages,
    get_defaults(stage) {
      return stage.defaults || { case_id };
    },
    before_open() {
      if (frm.is_dirty()) {
        frappe.msgprint({
          title: __("Please Save First"),
          message: __("Save the form before creating a linked record."),
          indicator: "orange",
        });
        return false;
      }
    },
    after_insert() {
      frm.reload_doc();
    },
  });

  const merge_stage_meta = (timeline, record_summaries) => {
    return stage_defs.map((stage) => {
      const status_match = timeline.find(
        (item) => item.doctype === stage.doctype || item.stage === stage.doctype,
      );
      const summary_match = record_summaries.find((item) => item.doctype === stage.doctype) || {};
      return {
        ...stage,
        status: status_match?.status || stage.status,
        modified: status_match?.modified || stage.modified,
        record_count: summary_match.count || 0,
        names: summary_match.names || [],
      };
    });
  };

  const render_with_data = (timeline, summaries) => {
    const merged = merge_stage_meta(timeline || [], summaries || []);
    window.sahayogCaseTimeline.render(frm, build_config(merged));
  };

  const load_record_summaries = () => {
    return Promise.all(
      stage_defs.map((stage) =>
        frappe.db
          .get_list(stage.doctype, {
            filters: { case_id },
            fields: ["name"],
            order_by: "creation asc",
            limit_page_length: 500,
          })
          .then((records) => ({
            doctype: stage.doctype,
            count: (records || []).length,
            names: (records || []).map((row) => row.name),
          }))
          .catch(() => ({ doctype: stage.doctype, count: 0, names: [] })),
      ),
    );
  };

  const load_timeline = () =>
    frappe.xcall(
      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
      { case_id },
    );

  const init = () => {
    if (!window.sahayogCaseTimeline) return;

    Promise.all([load_record_summaries(), load_timeline()])
      .then(([summaries, timeline_res]) => {
        const timeline = timeline_res && timeline_res.timeline ? timeline_res.timeline : [];
        render_with_data(timeline, summaries || []);
      })
      .catch((error) => {
        console.warn("Timeline load failed", error);
        render_with_data([], []);
      });
  };

  if (window.sahayogCaseTimeline) {
    init();
    return;
  }

  frappe.require("/assets/sahayog/js/case_timeline.js", init);
}
