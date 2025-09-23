frappe.ui.form.on("Disciplinary Case", {
  refresh(frm) {
    // Hide the button that contains these classes (any order)
    $(".button.text-muted.btn.btn-default.icon-btn")
      .has("svg.icon.icon-sm")
      .hide();

    // Or, more generally, hide button by SVG icon
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
      frm.add_custom_button("Print", function () {
        const url = frappe.urllib.get_full_url(
          `/api/method/frappe.utils.weasyprint.download_pdf?doctype=Disciplinary+Case&name=${encodeURIComponent(
            frm.doc.name
          )}&print_format=Show+Cause+Notice&letterhead=Disciplinary+Case`
        );
        window.open(url, "_blank");
      });
    }
  },

  schedule_enquiry_btn(frm) {
    frappe.new_doc("Enquiry", {
      disciplinary_case: frm.doc.name,
    });
  },

  case_type(frm) {
    let desc = "";
    if (frm.doc.case_type == "Complaint") {
      desc =
        "Formal report raised by an employee or HR against another employee for inappropriate behavior or action.";
    }
    if (frm.doc.case_type == "Misconduct") {
      desc =
        "Violation of company rules, policies, or code of conduct by an employee requiring disciplinary action.";
    }
    if (frm.doc.case_type == "Grievance") {
      desc =
        "Concern or dissatisfaction raised by an employee regarding unfair treatment, policies, or workplace issues.";
    }

    if (desc) {
      frm.set_df_property("case_type_description", "options", desc);
    }
  },

  // employee_id: function (frm) {
  //   if (!frm.doc.employee_id) return;

  //   console.log("Fetching employee:", frm.doc.employee_id);

  //   frappe.db
  //     .get_value("Employee", frm.doc.employee_id, [
  //       "employee_name",
  //       "department",
  //       "branch",
  //       "designation",
  //       "custom_zone",
  //     ])
  //     .then((r) => {
  //       console.log("Response from get_value:", r);
  //       if (r && r.message) {
  //         let emp = r.message;
  //         frm.set_value("employee_name", emp.employee_name);
  //         frm.set_value("branch_name", emp.branch);
  //         frm.set_value("designation", emp.designation);
  //         frm.set_value("zone", emp.custom_zone);
  //       } else {
  //         console.log("No employee found or wrong employee ID");
  //       }
  //     })
  //     .catch((err) => {
  //       console.error("Error fetching employee:", err);
  //     });
  // },
});
