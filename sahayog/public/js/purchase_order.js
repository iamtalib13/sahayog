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
      { label: "Supplier", status: "Approved" },
    ];

    let activeIndex = steps.findIndex((step) => step.status === currentStatus);

    // अगर 'Approved' है, तो सारे स्टेप्स कंप्लीटेड दिखाएं
    const isFullyApproved = currentStatus === "Submitted";

    let html = `
        <style>
        .form-message.blue {
    z-index: 0;
}


            .step-wizard-list {
                color: #333;
                list-style-type: none;
                border-radius: 10px;
                display: flex;
                padding: 5px;
                position: relative;
                z-index: 10;
            }
            .step-wizard-item {
                padding: 0 20px;
                flex-basis: 0;
                flex-grow: 1;
                max-width: 100%;
                display: flex;
                flex-direction: column;
                text-align: center;
                min-width: 170px;
                position: relative;
            }
            .step-wizard-item + .step-wizard-item:after {
                content: "";
                position: absolute;
                left: 0;
                top: 19px;
                background: #21d4fd;
                width: 100%;
                height: 2px;
                transform: translateX(-50%);
                z-index: -10;
            }
            .progress-count {
                height: 40px;
                width: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-weight: 600;
                margin: 0 auto;
                position: relative;
                z-index: 10;
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
                z-index: -10;
            }
            .progress-label {
                font-size: 14px;
                font-weight: 600;
               
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
            }
            .current-item .progress-count:after {
                background: #fff;
                border: 2px solid #21d4fd;
            }
            .current-item .progress-count {
                color: #21d4fd;
            }
            .current-item ~ .step-wizard-item .progress-count:after {
                height: 10px;
                width: 10px;
                background: #ccc;
            }
            .current-item ~ .step-wizard-item .progress-label {
                opacity: 0.5;
            }
        </style>

        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">

        <section class="step-wizard">
            <ul class="step-wizard-list">
                ${steps
                  .map(
                    (step, index) => `
                        <li class="step-wizard-item ${
                          isFullyApproved || index < activeIndex
                            ? "completed"
                            : ""
                        } ${
                      index === activeIndex && !isFullyApproved
                        ? "current-item"
                        : ""
                    }">
                            <span class="progress-count"></span>
                            <span class="progress-label">${step.label}</span>
                        </li>
                    `
                  )
                  .join("")}
            </ul>
        </section>
    `;

    //frm.set_df_property("custom_status_html_po", "options", html);
    if (frm.doc.custom_sahayog_status != "Cancelled") {
      frm.set_intro(html);
    }
  },
});
