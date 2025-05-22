frappe.ui.form.on("Purchase Order", {
  refresh: function (frm) {
    // Make 'description' field mandatory for all existing rows in child table
    cur_frm.fields_dict.items.grid.toggle_reqd("description", true);
    frm.refresh_field("items");
    frm.toggle_reqd("set_warehouse", true);
    frm.set_df_property("project", "hidden", 1);
    frm.set_df_property("cost_center", "hidden", 1);
    //frm.trigger("po_progress_status_html");
    if (frm.is_new()) {
      frm.set_value("custom_sahayog_status", "Draft");
    }

    if (frappe.session.user !== 'Administrator') {
      frm.set_df_property('terms', 'hidden', 1);
      frm.set_df_property('tc_name', 'hidden', 1);
  } else {
      frm.set_df_property('terms', 'hidden', 0);
      frm.set_df_property('tc_name', 'hidden', 0);
  }

  if (frappe.user.has_role("Administrator")) {
    frm.add_custom_button("Admin Save", function () {
        // Save the document
        frm.dirty();
        frm.save();
    }); // You can use any group like "Actions"
  }

  },

  onload: function (frm) {
    frm.trigger("store_query");
    frm.trigger("branch_query");
    frm.trigger("project_query");
    frm.toggle_reqd("set_warehouse", true);
    frm.set_df_property("project", "hidden", 1);
    frm.set_df_property("cost_center", "hidden", 1);
    frm.trigger("po_progress_status_html");
    if (frm.is_new()) {
      frm.set_value("custom_sahayog_status", "Draft");
    }
  },
  onload: function(frm) {
    if (frappe.session.user !== 'Administrator') {
        const style = document.createElement('style');
        style.innerHTML = `
            .row-check.sortable-handle.col {
                display: none !important;
            }
            .row-index.sortable-handle.col {
                display: none !important;
            }
            button.btn.btn-xs.btn-secondary.grid-add-row {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }
  },

  custom_request_for: function (frm) {
    frm.trigger("store_query");
    frm.trigger("branch_query");
    frm.trigger("project_query");

    // Reset project when request_for changes
    frm.set_value("custom_project", "");
    // Reset branch when request_for changes
    frm.set_value("custom_branch", "");
    // Reset warehouse when request_for changes
    frm.set_value("set_warehouse", "");

    frm.set_df_property("set_warehouse", "read_only", false); // ✅ Reset read-only
  },
  store_query: function (frm) {
    frm.set_query("set_warehouse", function () {
      return {
        filters: {
          custom_warehouse_category: frm.doc.custom_request_for,
        },
      };
    });
  },
  branch_query: function (frm) {
    frm.set_query("set_warehouse", function () {
      return {
        filters: {
          custom_warehouse_category: frm.doc.custom_request_for,
        },
      };
    });
  },

  project_query: function (frm) {
    frm.set_query("set_warehouse", function () {
      return {
        filters: {
          custom_warehouse_category: frm.doc.custom_request_for,
        },
      };
    });
  },

  custom_project: function (frm) {
    if (frm.doc.custom_request_for === "Project" && frm.doc.custom_project) {
      // ✅ Fetch the custom_warehouse field from Project Doc
      frappe.db
        .get_value(
          "Project",
          frm.doc.custom_project,
          "custom_project_warehouse"
        )
        .then((r) => {
          console.log(r);
          if (r.message && r.message.custom_project_warehouse) {
            frm.set_value("set_warehouse", r.message.custom_project_warehouse);
            frm.set_df_property("set_warehouse", "read_only", true); // ✅ Set read-only
          } else {
            frappe.msgprint("No Warehouse linked with the selected Project.");
            frm.set_value("set_warehouse", "");
            frm.set_df_property("set_warehouse", "read_only", false); // ✅ Reset read-only
          }
        });
    } else {
      frm.set_value("custom_project", "");
      frm.set_value("set_warehouse", "");
      frm.set_df_property("set_warehouse", "read_only", false); // ✅ Reset read-only
    }
  },

  //set warehouse based on the selected branch
  custom_branch: function (frm) {
    if (frm.doc.custom_request_for === "Branch" && frm.doc.custom_branch) {
      // ✅ Fetch the custom_warehouse field from Branch Doc
      frappe.db
        .get_value("Branch", frm.doc.custom_branch, "custom_warehouse")
        .then((r) => {
          console.log(r);
          if (r.message && r.message.custom_warehouse) {
            frm.set_value("set_warehouse", r.message.custom_warehouse);
            frm.set_df_property("set_warehouse", "read_only", true); // ✅ Reset read-only
          } else {
            frappe.msgprint("No Warehouse linked with the selected Branch.");
            frm.set_value("set_warehouse", "");
            frm.set_df_property("set_warehouse", "read_only", false); // ✅ Reset read-only
          }
        });
    } else {
      frm.set_value("custom_branch", "");
      frm.set_value("set_warehouse", "");
      frm.set_df_property("set_warehouse", "read_only", false); // ✅ Reset read-only
    }
  },

  async po_progress_status_html(frm) {
    const currentStatus = frm.doc.custom_sahayog_status;

    const steps = [
      { label: "Prepared", status: "Draft" },
      { label: "Purchase Manager", status: "Pending From Purchase Manager" },
      { label: "CFO", status: "Pending From CFO" },
    ];

    let activeIndex = steps.findIndex((step) => step.status === currentStatus);
    let correctionRequiredIndex =
      currentStatus === "Correction Required" ? 1 : -1;
    let rejectedIndex = currentStatus === "Rejected" ? 2 : -1;

    // If status is "Approved," treat it as all steps completed
    if (currentStatus === "Approved") {
      activeIndex = steps.length; // Set activeIndex beyond the last step to mark all as completed
    }

    let html = `
        <style>
            .step-wizard {
                position: relative;
                
            }
            .step-wizard-list {
                list-style-type: none;
                display: flex;
                justify-content: space-between;
                position: relative;
                margin: 0;
                padding: 0;
            }
            .step-wizard-item {
                flex: 1;
                text-align: center;
                position: relative;
                min-width: 150px;
                z-index: 1;
            }
            /* Connector Line Base Style */
            .step-wizard-item:not(:last-child):after {
                content: "";
                position: absolute;
                top: 20px;
                left: 50%;
                width: 100%;
                height: 2px;
                background: #21d4fd;
                transform: translateX(0);
                z-index: -1;
            }

            .progress-count {
                height: 40px;
                width: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-weight: 600;
                margin: 0 auto 8px;
                position: relative;
                color: transparent;
            }
            .progress-count:after {
                content: "";
                height: 30px;
                width: 30px;
                background: #21d4fd;
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                border-radius: 50%;
            }
            .progress-label {
                font-size: 14px;
                font-weight: 600;
                display: block;
            }

            .completed .progress-count:before {
                content: "✓";
                font-size: 22px;
                font-weight: bold;
                color: #fff;
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                z-index: 1;
            }
            .completed .progress-count:after {
                background: #21d4fd;
            }
            .completed:not(:last-child):after {
                background: #21d4fd;
            }

            .current-item .progress-count:after {
                background: #fff;
                border: 2px solid #21d4fd;
            }
            .current-item .progress-count {
                color: #21d4fd;
            }

            .correction-required .progress-count:after {
                background: red;
            }
            .correction-required .progress-label {
                color: red;
                font-weight: bold;
            }

            .rejected .progress-count:before {
                content: "✗";
                font-size: 22px;
                font-weight: bold;
                color: white;
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                z-index: 1;
            }
            .rejected .progress-count:after {
                background: red;
            }
            .rejected .progress-label {
                color: red;
                font-weight: bold;
            }

            .not-reached .progress-count:after {
                height: 10px;
                width: 10px;
                background: #ccc;
            }
            .not-reached .progress-label {
                opacity: 0.5;
            }
            /* Fade connector lines after correction or rejection */
            .correction-required:not(:last-child):after,
            .rejected:not(:last-child):after,
            .not-reached:not(:last-child):after {
                background: #ccc;
            }

            .status-message {
               
                color: #856404;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
                font-weight: bold;
                text-align: center;
            }
        </style>

        <section class="step-wizard">
            <ul class="step-wizard-list">
                ${steps
                  .map((step, index) => {
                    let additionalClass = "";
                    if (index < activeIndex) additionalClass = "completed";
                    if (index === activeIndex) additionalClass = "current-item";
                    if (correctionRequiredIndex === index)
                      additionalClass = "correction-required";
                    if (rejectedIndex === index) additionalClass = "rejected";
                    if (
                      (correctionRequiredIndex !== -1 &&
                        index > correctionRequiredIndex) ||
                      (rejectedIndex !== -1 && index > rejectedIndex)
                    ) {
                      additionalClass = "not-reached";
                    }

                    return `
                            <li class="step-wizard-item ${additionalClass}">
                                <span class="progress-count">${index + 1}</span>
                                <span class="progress-label">${
                                  step.label
                                }</span>
                            </li>
                        `;
                  })
                  .join("")}
            </ul>
            ${
              correctionRequiredIndex !== -1
                ? `<div class="status-message">Correction required from Purchase Manager. Please review.</div>`
                : ""
            }
            ${
              rejectedIndex !== -1
                ? `<div class="status-message">Rejected by CFO. Please revise the request.</div>`
                : ""
            }
            ${
              currentStatus === "Approved"
                ? `<div class="status-message">Purchase Order Approved Successfully!</div>`
                : ""
            }
        </section>
    `;

    if (frm.doc.custom_sahayog_status !== "Cancelled") {
      frm.set_intro(html);
    }
  },
});
