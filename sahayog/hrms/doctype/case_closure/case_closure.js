frappe.ui.form.on("Case Closure", {
  onload(frm) {
    if (!frm.doc.case_id) return;

    const workflow_fields = [
      "status_of_response",
      "domestic_enquiry",
      "place_of_enquiry",
      "date_of_enquiry",
      "date_of_2nd_enquiry",
      "enquiry_officer_name",
      "enquiry_status",
    ];

    // Hide all workflow fields initially
    workflow_fields.forEach((f) => frm.set_df_property(f, "hidden", 1));

    // Fetch the latest linked enquiry for this case
    frappe.call({
      method:
        "sahayog.hrms.doctype.case_closure.case_closure.get_latest_linked_enquiry",
      args: { case_id: frm.doc.case_id },
      callback: function (r) {
        if (!r.message) return;

        const { linked_enquiry_type, linked_enquiry, data } = r.message;
        if (!linked_enquiry_type || !linked_enquiry) return;

        // Store reference silently
        frm.set_value("linked_enquiry_type", linked_enquiry_type);
        frm.set_value("linked_enquiry", linked_enquiry);

        // Define visible fields by linked doctype
        const visible_fields_by_doctype = {
          "Response to SCN": ["status_of_response", "domestic_enquiry"],
          "Domestic Enquiry": [
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "enquiry_officer_name",
          ],
          "Enquiry Reminder": [
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "date_of_2nd_enquiry",
            "enquiry_officer_name",
            "enquiry_status",
          ],
        };

        // Initialize fields_to_show before logging
        const fields_to_show =
          visible_fields_by_doctype[linked_enquiry_type] || [];

        console.group("Case Closure Fetch Debug");
        console.log("Linked Doctype:", linked_enquiry_type);
        console.log("Linked Record:", linked_enquiry);
        console.log("Fields requested:", fields_to_show);
        console.log("Fetched data:", data);
        console.groupEnd();

        // Unhide & populate relevant fields
        fields_to_show.forEach((f) => {
          frm.set_df_property(f, "hidden", 0);

          // Make fields read-only, except enquiry_status if source is Enquiry Reminder
          if (
            !(
              linked_enquiry_type === "Enquiry Reminder" &&
              f === "enquiry_status"
            )
          ) {
            frm.set_df_property(f, "read_only", 1);
          }

          // Populate value from fetched data
          if (data && data[f] !== undefined && data[f] !== null) {
            frm.set_value(f, data[f]);
          }
        });
      },
    });
  },

  before_save(frm) {
    if (frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
        args: { case_id: frm.doc.case_id },
      });
    }
  },

  after_save(frm) {
    if (frm.doc.docstatus === 1) {
      frappe.msgprint({
        title: __("Success"),
        message: __("The case has been closed successfully."),
        indicator: "green",
      });
    }
  },

  refresh(frm) {
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    frappe.after_ajax(() => {
      frm.trigger("show_print_button");
    });
    if (!frm.is_new() && frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
        args: { case_id: frm.doc.case_id },
        callback: function (r) {
          if (r.message) render_timeline(frm, r.message);
        },
      });
    }

    //Add Custom Button for Case Review
    if (!frm.is_new()) {
      frm.add_custom_button("Case Review", () => {
        open_approver_dialog(frm);
      });
    }
  },
  show_print_button: function (frm) {
    if (frm.is_new()) return;
    if ($(frm.page.wrapper).find(".print-format-highlight").length) return;

    const allowed_roles = [
      "System Manager",
      "HR Support Executive",
      "HR Support Manager",
    ];

    if (!frappe.user_roles.some((r) => allowed_roles.includes(r))) return;

    // Remove old versions if exist
    try {
      frm.page.remove_custom_button("Print");
    } catch (e) {}
    try {
      frm.page.remove_menu_item("Print");
    } catch (e) {}

    // Create a dropdown-style primary button
    const $btn = $(
      frm.page.add_button("Select Print Format", null, "btn-primary")
    );
    $btn
      .removeClass("btn-default")
      .addClass("btn-primary print-format-highlight");

    // Convert button to dropdown
    $btn.addClass("dropdown-toggle");
    $btn.attr("data-toggle", "dropdown");

    // Dropdown container
    let $wrapper = $btn.parent();
    $wrapper.addClass("dropdown");

    // Add dropdown menu
    let $menu = $(`
    <ul class="dropdown-menu">
      <li><a class="print-opt" data-format="Warning Letter" href="#">Warning Letter</a></li>
      <li><a class="print-opt" data-format="Caution Letter" href="#">Caution Letter</a></li>
      <li><a class="print-opt" data-format="Termination due to abandonment" href="#">Termination due to abandonment</a></li>
     <li><a class="print-opt" data-format="Office Order Termination of Services" href="#">Office Order Termination of Services</a></li>
    </ul>
  `);

    $wrapper.append($menu);

    // Handle click on dropdown option
    $wrapper.on("click", ".print-opt", function (e) {
      e.preventDefault();
      let format = $(this).data("format");

      open_print_for_format(format);
    });

    // PRINT LOGIC
    function open_print_for_format(format) {
      console.log("Selected print format:", format);

      const overlay = document.createElement("div");
      overlay.id = "print-overlay";
      overlay.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(255,255,255,0.6);
      z-index: 9999; display: flex;
      align-items: center; justify-content: center;
      font-size: 18px; color: #333;
    `;
      overlay.innerHTML = "Preparing print preview...";
      document.body.appendChild(overlay);

      const url = frappe.urllib.get_full_url(
        `/printview?doctype=${encodeURIComponent(
          frm.doc.doctype
        )}&name=${encodeURIComponent(frm.doc.name)}&format=${encodeURIComponent(
          format
        )}&no_letterhead=1`
      );

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;

          // FIX: Disable internal auto-print for submitted docs
          // close the print preview in one attempt
          if (win.print) {
            win.print = function () {};
          }
          if (win.frappe && win.frappe.utils && win.frappe.utils.print) {
            win.frappe.utils.print = function () {};
          }

          setTimeout(() => {
            win.focus();

            // Restore manual print
            win.print = window.print.bind(win);
            win.print();
          }, 700);

          win.addEventListener("afterprint", () => {
            overlay.remove();
            iframe.remove();
          });

          setTimeout(() => {
            overlay.remove();
            iframe.remove();
          }, 5000);
        } catch (err) {
          console.error(err);
          frappe.msgprint("Printing Error. Check console.");
          overlay.remove();
          iframe.remove();
        }
      };

      iframe.onerror = () => {
        frappe.msgprint("Failed to load print preview");
        overlay.remove();
        iframe.remove();
      };
    }
  },
});
function render_timeline(frm, data) {
  // debug: show incoming timeline payload in console
  console.debug(
    "render_timeline payload:",
    data && data.timeline ? data.timeline : data
  );

  const wrap = $(frm.wrapper).find(".case-timeline-box");
  if (wrap.length) wrap.remove();

  const insertion_point = $(".form-dashboard");

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
          optsTime
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
// FUNCTION TO OPEN REVIEWER SELECTION DIALOG BOX
function open_approver_dialog(frm) {
  let case_employee_id = frm.doc.employee_id;

  if (!case_employee_id) {
    frappe.msgprint("No employee found for this case.");
    return;
  }

  frappe.db.get_doc("Employee", case_employee_id).then((emp) => {
    let default_zone = emp.custom_zone;

    if (!default_zone) {
      frappe.msgprint("Employee does not have a zone assigned.");
      return;
    }

    let d = new frappe.ui.Dialog({
      title: "Select Reviewers",
      size: "extra-large",

      fields: [
        // ---------------- EXISTING REVIEWERS (READ-ONLY SECTION) ----------------
        {
          fieldname: "already_selected_section",
          fieldtype: "Section Break",
          label: "Already Selected Reviewers",
          collapsible: 1,
        },
        {
          fieldname: "existing_reviewers_html",
          fieldtype: "HTML",
        },

        // ---------------- NEW REVIEWERS (ADD NEW) ----------------
        {
          fieldname: "section_new",
          fieldtype: "Section Break",
          label: "Add New Reviewers",
        },

        {
          fieldtype: "Link",
          fieldname: "selected_zone",
          label: "Zone",
          options: "Zone",
          default: default_zone,
          reqd: 1,

          onchange() {
            d.fields_dict.approver_table.grid.refresh();
          },
        },

        {
          fieldname: "approver_table",
          fieldtype: "Table",
          label: "Reviewer List",
          cannot_add_rows: false,
          in_place_edit: true,

          fields: [
            {
              fieldtype: "Link",
              fieldname: "employee_id",
              label: "Employee ID",
              options: "Employee",
              in_list_view: true,
              reqd: 1,

              get_query() {
                let zone = d.get_value("selected_zone");
                if (!zone) return {};
                return { filters: { custom_zone: zone } };
              },

              onchange() {
                let row = this.grid_row.doc;
                if (!row.employee_id) return;

                let dialog_rows = d.fields_dict.approver_table.grid.get_data();
                let duplicate_in_dialog = dialog_rows.some(
                  (r) => r.employee_id === row.employee_id && r !== row
                );

                if (duplicate_in_dialog) {
                  frappe.msgprint(
                    "This reviewer is already selected in the dialog."
                  );
                  row.employee_id = "";
                  row.employee_name = "";
                  row.company_email = "";
                  d.fields_dict.approver_table.grid.refresh();
                  return;
                }

                let duplicate_in_parent = (frm.doc.review_details || []).some(
                  (r) => r.employee_id === row.employee_id
                );

                if (duplicate_in_parent) {
                  frappe.msgprint(
                    "This reviewer is already selected in the list."
                  );
                  row.employee_id = "";
                  row.employee_name = "";
                  row.company_email = "";
                  d.fields_dict.approver_table.grid.refresh();
                  return;
                }

                frappe.db
                  .get_doc("Employee", row.employee_id)
                  .then((emp_data) => {
                    row.employee_name = emp_data.employee_name;
                    row.company_email =
                      emp_data.company_email || emp_data.prefered_email;
                    d.fields_dict.approver_table.grid.refresh();
                  });
              },
            },
            {
              fieldtype: "Data",
              fieldname: "employee_name",
              label: "Employee Name",
              in_list_view: true,
              read_only: 1,
            },
            {
              fieldtype: "Data",
              fieldname: "company_email",
              label: "Company Email",
              in_list_view: true,
              reqd: 1,
            },
          ],
        },
      ],

      primary_action_label: "Submit",

      primary_action(values) {
        for (let row of values.approver_table || []) {
          if (!row.company_email) {
            frappe.msgprint("Please fill Company Email for all reviewers.");
            return;
          }
        }

        frappe.confirm(
          "Please confirm that the reviewer selection is accurate before submitting.",
          () => submit_approvers(frm, values, d),
          () => {}
        );
      },
    });

    // ---------- SHOW EXISTING REVIEWERS IN READ-ONLY HTML ----------
    let existing = frm.doc.review_details || [];

    if (existing.length > 0) {
      let html = `
          <table class="table table-bordered" style="margin-top:10px">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Remarks</th>
                <th>Status</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
        `;

      existing.forEach((r) => {
        html += `
            <tr>
              <td>${r.employee_id}</td>
              <td>${r.remarks || ""}</td>
              <td>${r.status || ""}</td>
              <td>${r.date_and_time || ""}</td>
            </tr>
        `;
      });

      html += `</tbody></table>`;
      d.fields_dict.existing_reviewers_html.$wrapper.html(html);
    } else {
      d.fields_dict.existing_reviewers_html.$wrapper.html(
        "<p style='color:#888'>No reviewers selected yet.</p>"
      );
    }

    d.show();
  });
}

// third code of submit_approvers function
function submit_approvers(frm, values, dialog) {
  // A. OLD LOGIC: frm.clear_table("review_details"); // REMOVED THIS LINE

  // B. Append ONLY NEW reviewer rows
  // Note: 'values.approver_table' contains only the *newly selected* reviewers
  // because the 'open_approver_dialog' primary action was calling:
  // submit_approvers(frm, { approver_table: new_reviewers }, d)

  const new_reviewers = values.approver_table || [];

  if (new_reviewers.length === 0) {
    // यदि कोई नया समीक्षक नहीं चुना गया है, तो बस डायलाग बंद करें
    frappe.msgprint(__("No new reviewers selected."));
    dialog.hide();
    return;
  }

  // New reviewers को child table में जोड़ें
  new_reviewers.forEach((row) => {
    let child = frm.add_child("review_details");

    // सुनिश्चित करें कि आप child table में 'employee_name' और 'company_email' भी स्टोर कर रहे हैं
    // ताकि Dialog में read-only pre-fill करने में आसानी हो।
    child.employee_id = row.employee_id;
    child.employee_name = row.employee_name; // Add employee name
    child.company_email = row.company_email; // Add company email

    // बाकी fields वही रहेंगे
    child.remarks = "";
    child.status = "Pending";
    child.date_and_time = frappe.datetime.now_datetime();
  });

  frm.refresh_field("review_details");

  // C. Save parent document
  frm.save().then(() => {
    // Save successful, proceed with server calls

    // -----------------------------------------------------
    // 1️⃣ FIRST CALL → VERIFICATION PROCESS EMAILS
    // -----------------------------------------------------
    // Ensure you pass only the *new* approvers to the server call if needed,
    // or you can pass the entire updated list frm.doc.review_details
    frappe.call({
      method:
        "sahayog.hrms.doctype.case_closure.case_closure.start_verification_process",
      args: {
        // Pass only the new reviewers, as existing ones might already be processed
        approvers: new_reviewers,
        case_id: frm.doc.name,
      },
      freeze: true,
      freeze_message: __("Sending verification emails..."),
      callback(r) {
        console.log("START VERIFICATION RESPONSE:", r);

        if (r.message?.status !== "ok") {
          frappe.msgprint({
            title: __("Verification Failed"),
            message: r.message?.msg,
            indicator: "red",
          });
          return;
        }

        frappe.msgprint({
          title: __("Verification Started"),
          message: __("Case Review process started successfully."),
          indicator: "green",
        });
      },
    });

    // -----------------------------------------------------
    // 2️⃣ SECOND CALL → TEMPLATE-BASED EMAIL
    // -----------------------------------------------------
    frappe.call({
      method:
        "sahayog.hrms.doctype.case_closure.case_closure.send_email_for_review",
      args: {
        case_id: frm.doc.name,
        // Pass only the new approvers' details for the email content
        approvers: JSON.stringify(new_reviewers),
      },
      freeze: true,
      freeze_message: __("Sending review notification email..."),
      callback(r) {
        console.log("TEMPLATE EMAIL RESPONSE:", r);
        // ... (Callback logic remains the same)
        if (r.message?.status === "disabled") {
          frappe.msgprint({
            title: __("Email Disabled"),
            message: __("Email notifications are disabled."),
            indicator: "orange",
          });
          return;
        }

        if (r.message?.status === "ok") {
          frappe.msgprint({
            title: __("Success"),
            message: __("Review notification email has been sent."),
            indicator: "green",
          });
          return;
        }

        frappe.msgprint({
          title: __("Email Failed"),
          message:
            r.message?.msg || __("Could not send review notification email."),
          indicator: "red",
        });
      },
    });

    dialog.hide();
  });
}

// function to display review details with employee info
function display_review_details_with_employee_info(frm) {
  let wrapper = frm.fields_dict.review_details_html.$wrapper;
  wrapper.html(`<div>Loading review details...</div>`);

  if (!frm.doc.review_details || frm.doc.review_details.length === 0) {
    wrapper.html(`<div style="color:#888;">No review details available.</div>`);
    return;
  }

  let rows = frm.doc.review_details;
  let employee_ids = rows.map((r) => r.employee_id);

  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee",
      filters: { name: ["in", employee_ids] },
      fields: [
        "name",
        "employee_name",
        "designation",
        "sol_id",
        "branch",
        "custom_zone",
        "custom_region",
      ],
    },
    callback(r) {
      let employees = {};
      (r.message || []).forEach((emp) => {
        employees[emp.name] = emp;
      });
      let html = `
  <table class="table table-bordered"
         style="font-size:12px; width:100%; table-layout:fixed;">

      <thead>
          <tr>
              <th style="word-wrap:break-word;">Employee ID</th>
              <th style="word-wrap:break-word;">Name</th>
              <th style="word-wrap:break-word;">Designation</th>
              <th style="word-wrap:break-word;">Branch ID</th>
              <th style="word-wrap:break-word;">Branch Name</th>
              <th style="word-wrap:break-word;">Zone</th>
              <th style="word-wrap:break-word;">Region</th>
              <th style="word-wrap:break-word;">Status</th>
              <th style="word-wrap:break-word;">Remarks</th>
              <th style="word-wrap:break-word;">Date & Time</th>
          </tr>
      </thead>
      <tbody>
`;

      rows.forEach((row) => {
        let emp = employees[row.employee_id] || {};

        // ✅ Convert date to DD-MM-YYYY hh:mm A
        // Correct date formatting using moment.js
        let formatted_date = "-";
        if (row.date_and_time) {
          let dt = frappe.datetime.str_to_obj(row.date_and_time);
          formatted_date = moment(dt).format("DD-MM-YYYY hh:mm A");
        }

        html += `
                <tr>
                    <td>${row.employee_id}</td>
                    <td>${emp.employee_name || "-"}</td>
                    <td>${emp.designation || "-"}</td>
                    <td>${emp.sol_id || "-"}</td>
                    <td>${emp.branch || "-"}</td>
                    <td>${emp.custom_zone || "-"}</td>
                    <td>${emp.custom_region || "-"}</td>
                    <td>${row.status || "-"}</td>
                    <td>${row.remarks || "-"}</td>
                    <td>${formatted_date}</td>
                </tr>
            `;
      });

      html += `</tbody></table>`;
      wrapper.html(html);
    },
  });
}
