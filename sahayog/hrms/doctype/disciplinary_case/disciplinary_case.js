frappe.ui.form.on("Disciplinary Case", {
  refresh(frm) {
    // Hide unwanted button
    $(".button.text-muted.btn.btn-default.icon-btn")
      .has("svg.icon.icon-sm")
      .hide();
    $("button:has(svg.icon.icon-sm)").hide();

    // --- Enquiry Table Logic ---
    if (!frm.doc.__islocal) {
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "Enquiry",
          filters: {
            disciplinary_case: frm.doc.name,
          },
          fields: [
            "name",
            "notice_date",
            "suspension_required",
            "attendance",
            "status",
          ],
        },
        callback: function (r) {
          if (r.message && r.message.length > 0) {
            let rows = r.message
              .map(
                (d) => `
                  <tr>
                      <td><a href="/app/enquiry/${d.name}" target="_blank">${
                  d.name
                }</a></td>
                      <td>${d.notice_date || ""}</td>
                      <td>${d.suspension_required || ""}</td>
                      <td>${d.attendance || ""}</td>
                      <td>${d.status || ""}</td>
                  </tr>
                `
              )
              .join("");

            let html = `
              <table class="table table-bordered">
                  <thead>
                      <tr>
                          <th>ID</th>
                          <th>Notice Date</th>
                          <th>Suspension Required</th>
                          <th>Attendance</th>
                          <th>Status</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${rows}
                  </tbody>
              </table>
            `;
            frm.set_df_property("enquiry_item_html", "options", html);
          } else {
            frm.set_df_property(
              "enquiry_item_html",
              "options",
              `<p style="color: #888;">No enquiries linked to this case.</p>`
            );
          }
        },
      });

      // Add Print Button
      frm.add_custom_button("Print", function () {
        const url = frappe.urllib.get_full_url(
          `/api/method/frappe.utils.weasyprint.download_pdf?doctype=Disciplinary+Case&name=${encodeURIComponent(
            frm.doc.name
          )}&print_format=Show+Cause+Notice&letterhead=Disciplinary+Case`
        );
        window.open(url, "_blank");
      });

      // Add Close Case Button (only if not already closed)
      if (frm.doc.status !== "Closed") {
        frm.add_custom_button("Close", function () {
          frappe.prompt(
            [
              {
                label: "Closing Remark",
                fieldname: "closing_remark",
                fieldtype: "Small Text",
                reqd: 1,
              },
            ],
            function (values) {
              frm.set_value("closing_remark", values.closing_remark);
              frm.set_value("status", "Closed");
              frm.save().then(() => {
                frappe.msgprint("The case has been closed successfully.");
              });
            },
            __("Close Disciplinary Case"),
            __("Close")
          );
        });
      }
    }

    // --- Disable future dates in date pickers ---
    let today = frappe.datetime.now_date();
    frm.set_df_property("issue_occurrence_date", "options", { max: today });
    frm.set_df_property("issue_report_to_hr", "options", { max: today });
  },

  // --- Instant pop-up on selecting future dates ---
  issue_occurrence_date(frm) {
    let today = frappe.datetime.now_date();
    if (
      frm.doc.issue_occurrence_date &&
      frm.doc.issue_occurrence_date > today
    ) {
      frappe.msgprint(
        "You cannot select a future date for Issue Occurrence Date."
      );
      frm.set_value("issue_occurrence_date", "");
    }
  },

  issue_report_to_hr(frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.issue_report_to_hr && frm.doc.issue_report_to_hr > today) {
      frappe.msgprint(
        "You cannot select a future date for Issue Reported to HR."
      );
      frm.set_value("issue_report_to_hr", "");
    }
  },

  schedule_enquiry_btn(frm) {
    frappe.new_doc("Enquiry", {
      disciplinary_case: frm.doc.name,
    });
  },

  // case_type(frm) {
  //   let desc = "";
  //   if (frm.doc.case_type == "Complaint") {
  //     desc =
  //       "Formal report raised by an employee or HR against another employee for inappropriate behavior or action.";
  //   }
  //   if (frm.doc.case_type == "Misconduct") {
  //     desc =
  //       "Violation of company rules, policies, or code of conduct by an employee requiring disciplinary action.";
  //   }
  //   if (frm.doc.case_type == "Grievance") {
  //     desc =
  //       "Concern or dissatisfaction raised by an employee regarding unfair treatment, policies, or workplace issues.";
  //   }

  //   if (desc) {
  //     frm.set_df_property("case_type_description", "options", desc);
  //   }
  // },

  validate(frm) {
    let today = frappe.datetime.now_date();

    // Extra safeguard: block if user types future date manually
    if (
      frm.doc.issue_occurrence_date &&
      frm.doc.issue_occurrence_date > today
    ) {
      frappe.throw(__("Issue Occurrence Date cannot be in the future."));
    }

    if (frm.doc.issue_report_to_hr && frm.doc.issue_report_to_hr > today) {
      frappe.throw(__("Issue Reported to HR Date cannot be in the future."));
    }
  },
});
