frappe.ui.form.on("Disciplinary Case", {
  refresh: function (frm) {
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
          }
          // else {
          //   frm.set_df_property(
          //     "enquiry_item_html",
          //     "options",
          //     `<p style="color: #888;">No enquiries linked to this case.</p>`
          //   );
          // }
        },
      });
    }
  },
  schedule_enquiry_btn: function (frm) {
    frappe.new_doc("Enquiry", {
      disciplinary_case: frm.doc.name,
    });
  },
  case_type: function (frm) {
    if (frm.doc.case_type == "Complaint") {
      frm.set_df_property(
        "case_type",
        "description",
        "Formal report raised by an employee or HR against another employee for inappropriate behavior or action."
      );
    }
    if (frm.doc.case_type == "Misconduct") {
      frm.set_df_property(
        "case_type",
        "description",
        "Violation of company rules, policies, or code of conduct by an employee requiring disciplinary action."
      );
    }
    if (frm.doc.case_type == "Grievance") {
      frm.set_df_property(
        "case_type",
        "description",
        "Concern or dissatisfaction raised by an employee regarding unfair treatment, policies, or workplace issues."
      );
    }
  },
});
