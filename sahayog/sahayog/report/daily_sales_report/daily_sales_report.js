frappe.query_reports["Daily Sales Report"] = {
  filters: [
    {
      fieldname: "date",
      label: __("Date"),
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
      reqd: 1,
      on_change(report) {
        let selected_date = report.get_values().date;
        let today = frappe.datetime.get_today();

        if (frappe.datetime.obj_to_str(selected_date) > today) {
          frappe.msgprint("You cannot select a future date.");
          report.set_filter_value("date", today);
          return;
        }

        frappe.query_reports["Daily Sales Report"].update_dsr_status(report);
        report.refresh();
      },
    },
  ],

  onload(report) {
    report.submit_btn = report.page.add_inner_button("Submit Remarks", () =>
      frappe.query_reports["Daily Sales Report"].submit_all_remarks(report)
    );

    frappe.query_reports["Daily Sales Report"].update_dsr_status(report);

    // Global click handler for Add/View/Edit Remark buttons
    $(document).off("click", ".remark-btn");
    $(document).on("click", ".remark-btn", function () {
      let emp_no = $(this).data("emp");
      let row = frappe.query_report.data.find(
        (r) => r.employee_number == emp_no
      );

      if (!row) {
        frappe.msgprint("Employee row not found.");
        return;
      }

      frappe.query_reports["Daily Sales Report"].open_employee_dialog(
        frappe.query_report,
        row
      );
    });
  },

  // ----------------------------------------------------------
  // BULK SUBMIT
  // ----------------------------------------------------------
  submit_all_remarks(report) {
    let selected_date = report.get_values().date;

    let remarks_data = report.data.map((row) => ({
      row: row,
      remark: row.existing_remark || "",
    }));

    frappe.confirm(
      `Submit remarks for ${remarks_data.length} employees?`,
      () => {
        let calls = remarks_data.map((item) =>
          frappe.call({
            method:
              "sahayog.scrm.doctype.dsr_remark.dsr_remark.create_or_update_dsr_remark",
            args: {
              date: selected_date,
              employee: item.row.employee_number,
              employee_name: item.row.employee_name,
              sol_id: item.row.sol_id,
              branch: item.row.branch,
              designation: item.row.designation,
              total_leads: item.row.total_leads,
              converted_leads: item.row.converted_leads,
              followup_leads: item.row.followup_leads,
              not_interested_leads: item.row.not_interested_leads,
              dsr_rating: item.row.dsr_rating,
              dsr_qualification: item.row.dsr_qualification,
              remark: item.remark,
            },
          })
        );

        Promise.all(calls).then(() => {
          frappe.msgprint("✔ All remarks submitted successfully");
          report.refresh();
        });
      }
    );
  },

  // ----------------------------------------------------------
  // SINGLE EMPLOYEE REMARK DIALOG
  // ----------------------------------------------------------
  open_employee_dialog(report, row) {
    let dialog = new frappe.ui.Dialog({
      title: `Remark - ${row.employee_name} (${row.employee_number})`,
      fields: [
        {
          fieldname: "remark",
          label: "Remark",
          fieldtype: "Small Text",
          reqd: 1,
          default: row.existing_remark || "",
        },
      ],
      primary_action_label: "Save",
      primary_action(values) {
        frappe.call({
          method:
            "sahayog.scrm.doctype.dsr_remark.dsr_remark.create_or_update_dsr_remark",
          args: {
            date: report.get_values().date,
            employee: row.employee_number,
            employee_name: row.employee_name,
            sol_id: row.sol_id,
            branch: row.branch,
            designation: row.designation,
            total_leads: row.total_leads,
            converted_leads: row.converted_leads,
            followup_leads: row.followup_leads,
            not_interested_leads: row.not_interested_leads,
            dsr_rating: row.dsr_rating,
            dsr_qualification: row.dsr_qualification,
            remark: values.remark,
          },
          callback() {
            frappe.msgprint("✔ Remark Saved!");
            dialog.hide();
            report.refresh();
          },
        });
      },
    });

    dialog.show();
  },

  // ----------------------------------------------------------
  // DISABLE SUBMIT IF EXISTS
  // ----------------------------------------------------------
  update_dsr_status(report) {
    let selected_date = report.get_values().date;

    frappe.call({
      method: "sahayog.scrm.doctype.dsr_remark.dsr_remark.get_dsr_remark",
      args: { date: selected_date },
      callback(r) {
        if (r.message && r.message.exists) {
          report.submit_btn.hide();
        } else {
          report.submit_btn.show();
        }
      },
    });
  },
};
