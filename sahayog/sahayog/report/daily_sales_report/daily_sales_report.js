frappe.query_reports["Daily Sales Report"] = {
  filters: [
    {
      fieldname: "date",
      label: __("Date"),
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
      reqd: 1,
      on_change: function (report) {
        let selected_date = report.get_values().date;
        let today = frappe.datetime.get_today();

        if (frappe.datetime.obj_to_str(selected_date) > today) {
          frappe.msgprint(__("You cannot select a future date."));
          report.set_filter_value("date", today);
          return;
        }

        frappe.query_reports["Daily Sales Report"].update_dsr_status(report);
        report.refresh();
      },

      get_query: function () {
        return {
          filters: [["date", "<=", frappe.datetime.get_today()]],
        };
      },
    },
  ],

  onload: function (report) {
    // Add status container
    const status_container = $(`
      <div class="dsr-status"
        style="margin-top:10px; font-weight:bold; font-size:14px;">
      </div>
    `);
    $(report.page.wrapper).find(".page-form").append(status_container);

    // Submit button
    report.submit_btn = report.page.add_inner_button(
      __("Submit Remarks"),
      function () {
        frappe.query_reports["Daily Sales Report"].submit_all_remarks(report);
      }
    );

    // Edit button
    report.edit_btn = report.page
      .add_inner_button(__("Edit Remark"), function () {
        frappe.query_reports["Daily Sales Report"].open_remark_dialog(
          report,
          "edit"
        );
      })
      .hide();

    // Initialize status
    frappe.query_reports["Daily Sales Report"].update_dsr_status(report);
  },

  // ✅ ALTERNATIVE: Manual input approach after report renders
  after_datatable_render: function (datatable) {
    setTimeout(() => {
      frappe.query_reports["Daily Sales Report"].add_remark_inputs(datatable);
    }, 500);
  },

  // ✅ Add input fields manually to remarks column
  add_remark_inputs: function (datatable) {
    try {
      // Find remarks column index
      let remarks_col_index = -1;
      datatable.columnmanager.columns.forEach((col, index) => {
        if (col.content && col.content.fieldname === "remarks") {
          remarks_col_index = index;
        }
      });

      if (remarks_col_index === -1) return;

      // Add input to each cell in remarks column
      const rows = $(datatable.wrapper).find(".dt-row");
      rows.each(function (row_index) {
        const cell = $(this).find(".dt-cell").eq(remarks_col_index);
        const current_value = cell.text().trim();

        // Replace cell content with input
        cell.html(`
          <input type="text" 
                 class="form-control remark-input" 
                 value="${current_value}" 
                 data-row="${row_index}"
                 data-col="${remarks_col_index}"
                 style="width:100%; border:1px solid #d1d8dd; padding:4px 8px; font-size:13px;">
        `);
      });

      console.log("✅ Added input fields to remarks column");
    } catch (error) {
      console.error("Error adding remark inputs:", error);
    }
  },

  submit_all_remarks: function (report) {
    let selected_date = report.get_values().date;
    if (!selected_date) {
      frappe.msgprint("Please select a date first.");
      return;
    }

    // ✅ Get values from input fields
    let remarks_data = [];
    const rows = $(report.wrapper).find(".dt-row");

    rows.each(function (index) {
      const row_data = report.data[index];
      if (!row_data) return;

      const employee_id = row_data[0]; // Hidden employee_id
      const employee_name = row_data[4]; // Employee name
      const remark_input = $(this).find(".remark-input");
      const remarks = remark_input.val() || "";

      if (remarks.trim()) {
        remarks_data.push({
          employee: employee_id,
          employee_name: employee_name,
          remark: remarks.trim(),
        });
      }
    });

    if (remarks_data.length === 0) {
      frappe.msgprint(
        "No remarks found to submit. Please add remarks in the input fields."
      );
      return;
    }

    // Show confirmation
    frappe.confirm(
      `Are you sure you want to submit remarks for ${remarks_data.length} employees?`,
      function () {
        let promises = remarks_data.map((item) => {
          return frappe.call({
            method:
              "sahayog.scrm.doctype.dsr_remark.dsr_remark.create_or_update_dsr_remark",
            args: {
              date: selected_date,
              remark: item.remark,
              employee: item.employee,
            },
            freeze: true,
            freeze_message: `Submitting remarks for ${item.employee_name}...`,
          });
        });

        Promise.all(promises)
          .then((results) => {
            let success_count = results.filter((r) => !r.exc).length;
            let error_count = results.filter((r) => r.exc).length;

            if (success_count > 0) {
              frappe.msgprint(
                `✅ Successfully submitted remarks for ${success_count} employees!` +
                  (error_count > 0
                    ? `<br>❌ Failed for ${error_count} employees.`
                    : "")
              );

              frappe.query_reports["Daily Sales Report"].update_dsr_status(
                report
              );
              report.refresh();
            } else {
              frappe.msgprint("❌ Failed to submit remarks. Please try again.");
            }
          })
          .catch((error) => {
            console.error("Error submitting remarks:", error);
            frappe.msgprint("❌ Error occurred while submitting remarks.");
          });
      }
    );
  },

  // Rest of the functions remain same...
  open_remark_dialog: function (report, mode) {
    let selected_date = report.get_values().date;
    if (!selected_date) {
      frappe.msgprint("Please select a date first.");
      return;
    }

    let current_remark =
      mode === "edit"
        ? $(report.page.wrapper).find(".dsr-status").data("current_remark") ||
          ""
        : "";

    let d = new frappe.ui.Dialog({
      title: mode === "edit" ? "Edit DSR Remark" : "Add DSR Remark",
      fields: [
        {
          fieldname: "remark",
          fieldtype: "Small Text",
          label: "Remark",
          reqd: 1,
          default: current_remark,
        },
      ],
      primary_action_label: "Submit",
      primary_action(values) {
        frappe.call({
          method:
            "sahayog.scrm.doctype.dsr_remark.dsr_remark.create_or_update_dsr_remark",
          args: {
            date: selected_date,
            remark: values.remark,
          },
          callback: function (r) {
            if (!r.exc) {
              frappe.msgprint(
                __(
                  mode === "edit"
                    ? "DSR Remark updated successfully!"
                    : "DSR Remark added successfully!"
                )
              );
              d.hide();
              frappe.query_reports["Daily Sales Report"].update_dsr_status(
                report
              );
            }
          },
        });
      },
    });

    d.show();
  },

  update_dsr_status: function (report) {
    let selected_date = report.get_values().date || frappe.datetime.get_today();

    frappe.call({
      method: "sahayog.scrm.doctype.dsr_remark.dsr_remark.get_dsr_remark",
      args: { date: selected_date },
      callback: function (r) {
        const formatted_date =
          frappe.datetime.str_to_user(selected_date) ||
          (function () {
            const parts = (selected_date || "").split("-");
            return parts.length === 3
              ? `${parts[2]}-${parts[1]}-${parts[0]}`
              : selected_date;
          })();

        let status_container = $(report.page.wrapper).find(".dsr-status");
        let submit_btn = report.submit_btn;
        let edit_btn = report.edit_btn;

        if (r.message && r.message.exists) {
          let remark = r.message.remark || "";
          status_container
            .html(
              `✅ <span style="color:green;">DSR Remarks Submitted for ${formatted_date}</span><br>
             <small style="color:gray;">Remark: ${frappe.utils.escape_html(
               remark
             )}</small>`
            )
            .data("current_remark", remark);

          $(submit_btn).hide();
          $(edit_btn).show();
        } else {
          status_container.html(
            `⚠️ <span style="color:red;">DSR Remarks Pending for ${formatted_date}</span>`
          );
          $(submit_btn).show();
          $(edit_btn).hide();
        }
      },
    });
  },
};
