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

    frm.trigger("show_print_button");

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

    // 1. Add Custom Button
    if (!frm.is_new()) {
      frm.add_custom_button("Case Review", () => {
        open_approver_dialog(frm);
      });
    }
  },
  show_print_button: function (frm) {
    if (frm.is_new()) return;
    if (frm.print_button_added) return;
    frm.print_button_added = true;

    const allowed_roles = ["System Manager", "Share Admin"];
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

          setTimeout(() => {
            win.focus();
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
            <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-top:6px;">
    `;

  data.timeline.forEach((stage_obj, index) => {
    html += timeline_badge(stage_obj);
    if (index < data.timeline.length - 1) {
      html += `<div style="font-size:16px; color:#9e9e9e;">→</div>`;
    }
  });

  html += `</div></div>`;
  insertion_point.before(html);
}

function timeline_badge(stage_obj) {
  let bg = "#eeeeee",
    color = "#555",
    icon = "⚪";

  switch (stage_obj.status) {
    case "submitted":
      bg = "#e8f5e9"; // Green
      color = "#1b5e20";
      icon = "🟢";
      break;
    case "saved":
      bg = "#f9f8f5ff"; // Orange
      color = "#e65100";
      icon = "🟠";
      break;

    default:
      bg = "#eeeeee";
      color = "#555";
      icon = "⚪";
  }

  return `
        <div style="
            padding:4px 8px;
            background:${bg};
            color:${color};
            border-radius:20px;
            font-weight:600;
            display:flex;
            align-items:center;
            gap:4px;
            font-size:12px;
        ">
            ${icon} ${stage_obj.stage}
        </div>
    `;
}
function open_approver_dialog(frm) {
  let d = new frappe.ui.Dialog({
    title: "Select Approvers",
    size: "extra-large",

    fields: [
      {
        fieldname: "approver_table",
        fieldtype: "Table",
        label: "Approver List",
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
              return { filters: {} };
            },

            onchange() {
              let row = this.grid_row.doc;
              if (!row.employee_id) return;

              frappe.db.get_doc("Employee", row.employee_id).then((emp) => {
                row.employee_name = emp.employee_name;
                row.company_email = emp.company_email || emp.prefered_email;
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
            read_only: 0,
            reqd: 1,
          },
        ],
      },
    ],

    primary_action_label: "Submit Approvers",

    primary_action(values) {
      // 1️⃣ VALIDATION: Email must not be empty
      for (let row of values.approver_table || []) {
        if (!row.company_email) {
          frappe.msgprint({
            title: __("Missing Email"),
            message: __("Please fill Company Email for all approvers."),
            indicator: "red",
          });
          return;
        }
      }

      // 2️⃣ STORE IN CHILD TABLE "Review Details"
      frm.clear_table("review_details"); // replace with actual child table fieldname
      for (let row of values.approver_table || []) {
        let child = frm.add_child("review_details");
        child.employee_id = row.employee_id;
        child.remarks = ""; // initially empty
        child.status = "Pending"; // default status
        child.date_and_time = frappe.datetime.now_datetime();
      }

      // 3️⃣ SAVE PARENT DOC
      frm.save().then(() => {
        // 4️⃣ CALL BACKEND TO SEND VERIFICATION EMAILS
        frappe.call({
          method:
            "sahayog.hrms.doctype.case_closure.case_closure.start_verification_process",
          args: {
            approvers: values.approver_table,
            case_id: frm.doc.name,
          },
          freeze: true,
          freeze_message: __("Sending verification emails..."),
          callback() {
            frappe.msgprint("Case Review started and emails sent.");
          },
        });

        d.hide();
      });
    },
  });

  d.show();
}
