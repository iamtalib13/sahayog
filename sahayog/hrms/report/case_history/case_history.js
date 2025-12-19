frappe.query_reports["Case History"] = {
  filters: [
    {
      fieldname: "case_id",
      label: __("Case ID"),
      fieldtype: "Link",
      options: "Disciplinary Case",
    },

    {
      fieldname: "doctype_filter",
      label: __("Document Type"),
      fieldtype: "Select",
      options:
        "\nAll\nDisciplinary Case\nResponse to SCN\nSuspension Process\nUnauthorized Absence\nReminder Of Unauthorized Absence\nDomestic Enquiry\nEnquiry Reminder\nCase Closure",
      default: "All",
    },
    {
      fieldname: "sort_by",
      label: __("Sort By"),
      fieldtype: "Select",
      options: "\nCreation Date\nModification Date",
      default: "Creation Date",
    },
    {
      fieldname: "show_versions",
      label: __("Show Version Count"),
      fieldtype: "Check",
      default: 1,
    },
  ],

  onload: function (report) {
    // ------------------------------
    // HIDE CASE DETAILS
    // ------------------------------
    function hide_case_details() {
      $(".report-message").hide();
    }

    // =====================================================
    // ✅ ADD REVIEW BUTTON (MOVED TO TOP)
    // =====================================================
    report.page
      .add_inner_button(__("Add Review"), function () {
        const case_id = report.get_filter_value("case_id");
        if (!case_id) {
          frappe.msgprint(__("Please select a Case ID."));
          return;
        }

        frappe.call({
          method:
            "sahayog.hrms.doctype.case_closure.case_closure.get_employee_from_user",
          callback: function (r) {
            const employee_id = r.message;
            if (!employee_id) {
              frappe.msgprint("No Employee linked with your user.");
              return;
            }

            frappe.call({
              method:
                "sahayog.hrms.doctype.case_closure.case_closure.case_history_can_review",
              args: { case_id, reviewer: employee_id },
              callback: function (res) {
                if (!res.message) {
                  frappe.msgprint(
                    __("You are not assigned as a reviewer for this case.")
                  );
                  return;
                }

                let d = new frappe.ui.Dialog({
                  title: __("Add Review"),
                  fields: [
                    {
                      fieldname: "remarks",
                      fieldtype: "Small Text",
                      label: __("Remarks"),
                      reqd: 1,
                    },
                  ],
                  primary_action_label: __("Submit"),
                  primary_action(values) {
                    const remarks = values.remarks;
                    if (!remarks) {
                      frappe.msgprint(__("Please enter remarks"));
                      return;
                    }

                    frappe.call({
                      method:
                        "sahayog.hrms.doctype.case_closure.case_closure.case_history_submit_review",
                      args: {
                        case_id: case_id,
                        reviewer: employee_id,
                        remarks: remarks,
                      },
                      freeze: true,
                      freeze_message: __("Submitting review..."),
                      callback: function (r) {
                        if (r.message === true) {
                          frappe.msgprint(__("Review submitted successfully"));
                          d.hide();

                          // ✅ HIDE ADD REVIEW BUTTON AFTER SUBMISSION
                          report.page.wrapper
                            .find('.btn-primary:contains("Add Review")')
                            .hide();

                          // ✅ REMOVE BLINKING ACTION REQUIRED MESSAGE
                          $(".review-hint").remove();

                          report.refresh();
                        }
                      },
                    });
                  },
                });

                d.show();
              },
            });
          },
        });
      })
      .addClass("btn-primary");

    // =====================================================
    // CLEAR FILTER
    // =====================================================
    report.page
      .add_inner_button(__("Clear Filter"), function () {
        // Reset all filter fields manually
        report.set_filter_value({
          case_id: "",
          doctype_filter: "All",
          sort_by: "Creation Date",
          show_versions: 1,
        });
        hide_case_details();
        report.refresh();
      })
      .addClass("btn-secondary");

    // EXPORT
    report.page
      .add_inner_button(__("Export to Excel"), function () {
        report.export_report();
      })
      .addClass("btn-primary");

    // REFRESH
    report.page.set_secondary_action(__("Refresh"), function () {
      report.refresh();
    });

    // Hide message if no case
    report.on_filter_change = function () {
      let case_id = report.get_filter_value("case_id");
      if (!case_id) $(".report-message").hide();
      else $(".report-message").show();
    };
    // ------------------------------
    report.on_data_load = function () {
      let all_not_created = true;

      report.data.forEach((d) => {
        if (d.name !== "Not Created") all_not_created = false;
      });

      if (all_not_created) {
        $(".report-message").hide(); // hide the warning for no records
      }
    };

    // ------------------------------
    // AUTO REVIEW HINT
    // ------------------------------
    frappe.after_ajax(() => {
      const case_id = report.get_filter_value("case_id");
      if (!case_id) return;

      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.get_employee_from_user",
        callback: function (r) {
          const employee_id = r.message;
          if (!employee_id) return;

          frappe.call({
            method:
              "sahayog.hrms.doctype.case_closure.case_closure.reviewer_pending_review",
            args: { case_id, reviewer: employee_id },
            callback: function (res) {
              if (res.message) {
                show_review_hint(report);
              }
            },
          });
        },
      });
    });

    // ------------------------------
    // CSS (ONCE)
    // ------------------------------
    if (!$("#review-hint-style").length) {
      $("<style id='review-hint-style'>")
        .html(
          `
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
          .review-hint {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 10px;
            animation: blink 1.5s infinite;
          }
          .pulse-btn {
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255,0,0,0.6); }
            70% { box-shadow: 0 0 0 10px rgba(255,0,0,0); }
            100% { box-shadow: 0 0 0 0 rgba(255,0,0,0); }
          }
        `
        )
        .appendTo("head");
    }
  },

  // ------------------------------
  // FORMATTER & DATATABLE (UNCHANGED)
  // ------------------------------
  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);

    // ✅ Highlight Disciplinary Case
    if (
      data.doctype_name === "Disciplinary Case" &&
      column.fieldname === "doctype_name"
    ) {
      value = `<b style="color:#2196f3;">🔷 ${value}</b>`;
    }

    if (column.fieldname === "status") {
      if (data.status === "Pending") {
        value = `<span style="color:#ff9800;font-weight:bold;">${value}</span>`;
      } else if (data.status === "Completed") {
        value = `<span style="color:#4caf50;font-weight:bold;">${value}</span>`;
      }
    }

    // 🚫 Not Created rows
    if (data.name === "Not Created") {
      if (column.fieldname === "doctype_name" || column.fieldname === "name") {
        value = `<span 
          style="color: #999; background-color: #f1f1f1; font-style: italic; 
                 padding: 2px 6px; border-radius: 4px; cursor: default; 
                 pointer-events: none; user-select: none;">
          ${value}
        </span>`;
      }
      return value;
    }
    if (column.fieldname === "name" && data.name !== "Not Created") {
      value = `<span 
    class="clickable-record" 
    data-doctype="${data.doctype_name}" 
    data-name="${data.name}" 
    style="
      background: #e3f2fd;
      color: #1976d2; 
      font-weight: 600; 
      padding: 2px 8px;
      border-radius: 6px;
      cursor: pointer;
    ">
    ${value}
  </span>`;
    }

    // ⚠️ High version counts
    if (column.fieldname === "version_count" && data.version_count > 5) {
      value = `<span style="color: #f44336; font-weight: bold;">${value}</span>`;
    }

    return value;
  },

  get_datatable_options(options) {
    return Object.assign(options, {
      escape: false,
      checkboxColumn: false,
      escape: false, // ✅ Allow HTML rendering
      events: {
        onClick(cell) {
          if (!cell?.row?.doc) return;
          const d = cell.row.doc;
          if (cell.column.fieldname === "name" && d.name !== "Not Created") {
            frappe.set_route("Form", d.doctype_name, d.name);
          }
        },
      },
    });
  },
};

// ------------------------------
// REVIEW HINT FUNCTION
// ------------------------------
function show_review_hint(report) {
  if ($(".review-hint").length) return;

  report.page.wrapper.prepend(`
    <div class="alert alert-warning review-hint">
      🔔 <b>Action Required:</b> You are assigned as a reviewer.
      Please click <b>Add Review</b> to submit remarks.
    </div>
  `);

  setTimeout(() => {
    report.page.wrapper
      .find('.btn-primary:contains("Add Review")')
      .addClass("pulse-btn");
  }, 500);
}
