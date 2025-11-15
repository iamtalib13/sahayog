frappe.ui.form.on("Employee Material Request", {


  refresh: function (frm) {
    apply_status_indicator(frm);
    setup_action_buttons(frm);

    // Set date restrictions
    set_date_restrictions(frm);

    if (frm.doc.docstatus > 0 || frm.doc.status) {
      show_approval_timeline(frm);
    }

    if (frm.doc.docstatus === 2) {
      frm.add_custom_button(__("Amend"), function () {
        frappe.model.open_amended_doc(
          "Employee Material Request",
          frm.doc.name
        );
      });
    }
  },

  onload: function (frm) {
    if (frm.is_new()) {
      frm.set_value("request_date", frappe.datetime.get_today());
      frm.set_value("status", "Draft");

      // Set default required by date to today
      if (!frm.doc.required_by_date) {
        frm.set_value("required_by_date", frappe.datetime.get_today());
      }
    }
  },

  employee: function (frm) {
    if (frm.doc.employee) {
      // First: get employee details (including branch)
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Employee",
          name: frm.doc.employee,
        },
        callback: function (res) {
          if (res.message) {
            let branch = res.message.branch;

            // Set Reporting Person (your existing logic)
            if (!frm.doc.reporting_person && res.message.reports_to) {
              frappe.call({
                method: "frappe.client.get_value",
                args: {
                  doctype: "Employee",
                  filters: { name: res.message.reports_to },
                  fieldname: ["user_id", "employee_name"],
                },
                callback: function (resp) {
                  if (resp.message && resp.message.user_id) {
                    frm.set_value("reporting_person", resp.message.user_id);

                    frappe.show_alert(
                      {
                        message: __("Reporting Person: {0}", [
                          resp.message.employee_name,
                        ]),
                        indicator: "green",
                      },
                      5
                    );
                  }
                },
              });
            }

            // -----------------------------
            // NEW LOGIC: Get Branch Code (sol_id)
            // -----------------------------
            // inside target_location event
            if (frm.doc.target_location) {
              frm.set_value("target_warehouse", frm.doc.target_location);

              frappe.db
                .get_value("Sahayog Branch", frm.doc.target_location, [
                  "branch",
                  "state",
                ])
                .then((r) => {
                  let b = r?.message?.branch || "Not Found";
                  let s = r?.message?.state || "N/A";
                  frm.set_df_property(
                    "target_warehouse",
                    "description",
                    `Branch: <b>${frappe.utils.escape_html(
                      b
                    )}</b> | State: <b>${frappe.utils.escape_html(s)}</b>`
                  );
                });
            } else {
              frm.set_df_property("target_warehouse", "description", "");
            }
          }
        },
      });
    }
  },
  // Date validation - Main logic
  required_by_date: function (frm) {
    validate_required_by_date(frm);
  },

  request_date: function (frm) {
    // Revalidate required by date when request date changes
    if (frm.doc.required_by_date) {
      validate_required_by_date(frm);
    }
  },

  before_workflow_action: function (frm) {
    let action = frm.selected_workflow_action;

    if (action === "Submit for Approval") {
      if (!frm.doc.reporting_person) {
        frappe.throw(__("Please set Reporting Person"));
        return false;
      }

      if (!frm.doc.items || frm.doc.items.length === 0) {
        frappe.throw(__("Please add at least one item"));
        return false;
      }

      // Validate required by date before submit
      if (!validate_required_by_date(frm)) {
        return false;
      }
    }

    return true;
  },

  before_submit: function (frm) {
    return new Promise((resolve, reject) => {
      frappe.confirm(
        __("Submit this Material Request?"),
        () => resolve(),
        () => reject()
      );
    });
  },
});

// Child Table Events - Auto Category Detection
frappe.ui.form.on("Material Request Items", {
  item_code: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.item_code) {
      // Fetch item and auto-detect category
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Item",
          name: row.item_code,
        },
        callback: function (r) {
          if (r.message) {
            let item = r.message;

            // Set basic fields
            frappe.model.set_value(cdt, cdn, "item_name", item.item_name);
            frappe.model.set_value(cdt, cdn, "uom", item.stock_uom);
            frappe.model.set_value(cdt, cdn, "description", item.description);

            // AUTO-DETECT CATEGORY (Main Logic)
            let category = "";
            if (item.is_fixed_asset) {
              category = "Asset";
              // Set quantity to 1 for assets
              if (!row.quantity || row.quantity === 0) {
                frappe.model.set_value(cdt, cdn, "quantity", 1);
              }
            } else if (item.is_stock_item) {
              category = "Stock Item";
            } else {
              frappe.msgprint({
                title: __("Invalid Item"),
                message: __(
                  "Row {0}: {1} is neither an Asset nor a Stock Item",
                  [row.idx, item.item_code]
                ),
                indicator: "red",
              });
              frappe.model.set_value(cdt, cdn, "item_code", "");
              return;
            }

            // Set category automatically
            frappe.model.set_value(cdt, cdn, "item_category", category);

            // Show alert
            frappe.show_alert(
              {
                message: __("Category auto-set: {0}", [category]),
                indicator: category === "Asset" ? "blue" : "purple",
              },
              3
            );

            // Get available stock for stock items
            if (category === "Stock Item" && row.warehouse) {
              get_available_stock(frm, cdt, cdn);
            }

            // Refresh to show conditional fields
            frm.refresh_field("items");
          }
        },
      });
    }
  },

  item_category: function (frm, cdt, cdn) {
    // Category changed, refresh fields
    frm.refresh_field("items");
  },

  asset: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.asset && frm.doc.request_type === "Return") {
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Asset",
          name: row.asset,
        },
        callback: function (r) {
          if (r.message) {
            frappe.model.set_value(
              cdt,
              cdn,
              "current_custodian",
              r.message.custodian
            );
            frappe.model.set_value(cdt, cdn, "asset_status", r.message.status);
            frappe.model.set_value(cdt, cdn, "item_code", r.message.item_code);
          }
        },
      });
    }
  },

  warehouse: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.item_code && row.warehouse && row.item_category === "Stock Item") {
      get_available_stock(frm, cdt, cdn);
    }
  },

  quantity: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (
      row.item_category === "Stock Item" &&
      row.quantity > row.available_qty
    ) {
      frappe.msgprint({
        title: __("Stock Warning"),
        message: __("Row {0}: Requested ({1}) exceeds available ({2})", [
          row.idx,
          row.quantity,
          row.available_qty,
        ]),
        indicator: "orange",
      });
    }
  },
});

// Helper Functions
function apply_status_indicator(frm) {
  const colors = {
    Draft: "gray",
    "Pending Reporting Person Approval": "orange",
    "Pending HO Approval": "blue",
    Approved: "green",
    "In Progress": "light-blue",
    Completed: "darkgreen",
    Rejected: "red",
    Cancelled: "darkred",
  };

  if (frm.doc.status && colors[frm.doc.status]) {
    frm.page.set_indicator(frm.doc.status, colors[frm.doc.status]);
  }
}

function show_approval_timeline(frm) {
  let html =
    '<div class="approval-timeline" style="background: #f9f9f9; padding: 15px; border-radius: 5px;">';
  html += "<h5>Approval Timeline</h5>";

  html += "<div><b>Requested By:</b> " + frm.doc.requested_by;
  if (frm.doc.request_datetime) {
    html += " on " + frappe.datetime.str_to_user(frm.doc.request_datetime);
  }
  html += "</div><br>";

  if (frm.doc.reporting_person) {
    html +=
      "<div><b>1. Reporting Person:</b> " + frm.doc.reporting_person + " - ";

    if (frm.doc.reporting_person_status === "Approved") {
      html += '<span class="indicator-pill green">✓ Approved</span>';
      if (frm.doc.reporting_person_approval_date) {
        html +=
          " on " +
          frappe.datetime.str_to_user(frm.doc.reporting_person_approval_date);
      }
    } else if (frm.doc.reporting_person_status === "Rejected") {
      html += '<span class="indicator-pill red">✗ Rejected</span>';
    } else {
      html += '<span class="indicator-pill orange">⏱ Pending</span>';
    }
    html += "</div><br>";
  }

  html += "<div><b>2. Head Office Officer:</b> ";
  if (frm.doc.head_office_officer) {
    html += frm.doc.head_office_officer + " - ";
  }

  if (frm.doc.ho_officer_status === "Approved") {
    html += '<span class="indicator-pill green">✓ Approved</span>';
    if (frm.doc.ho_officer_approval_date) {
      html +=
        " on " + frappe.datetime.str_to_user(frm.doc.ho_officer_approval_date);
    }
  } else if (frm.doc.ho_officer_status === "Rejected") {
    html += '<span class="indicator-pill red">✗ Rejected</span>';
  } else {
    html += '<span class="indicator-pill orange">⏱ Pending</span>';
  }
  html += "</div>";

  html += "</div>";
  frm.dashboard.add_section(html);
}

function setup_action_buttons(frm) {
  if (
    frm.doc.docstatus === 1 &&
    frappe.user.has_role("Head Office Officer") &&
    frm.doc.status === "Approved"
  ) {
    frm
      .add_custom_button(__("Create Stock Entry"), function () {
        create_stock_entry(frm);
      })
      .addClass("btn-primary");
  }
}

function get_available_stock(frm, cdt, cdn) {
  let row = locals[cdt][cdn];

  frappe.call({
    method: "frappe.client.get_value",
    args: {
      doctype: "Bin",
      filters: {
        item_code: row.item_code,
        warehouse: row.warehouse,
      },
      fieldname: "actual_qty",
    },
    callback: function (r) {
      if (r.message) {
        frappe.model.set_value(
          cdt,
          cdn,
          "available_qty",
          r.message.actual_qty || 0
        );
      }
    },
  });
}

function create_stock_entry(frm) {
  frappe.confirm(
    __("Create Stock Entry for this Material Request?"),
    function () {
      frappe.call({
        method: "your_app.api.create_stock_entry_from_request",
        args: {
          material_request: frm.doc.name,
        },
        callback: function (r) {
          if (r.message) {
            frappe.show_alert(
              {
                message: __("Stock Entry {0} created", [r.message]),
                indicator: "green",
              },
              5
            );
            frappe.set_route("Form", "Stock Entry", r.message);
          }
        },
      });
    }
  );
}

// NEW FUNCTIONS - Date Validation

function set_date_restrictions(frm) {
  // Set minimum date for required_by_date field
  let today = frappe.datetime.get_today();

  // Add description below field
  frm.set_df_property(
    "required_by_date",
    "description",
    __("Cannot select past dates. Minimum date: Today")
  );

  // Set datepicker to disable past dates
  if (
    frm.fields_dict.required_by_date &&
    frm.fields_dict.required_by_date.datepicker
  ) {
    frm.fields_dict.required_by_date.datepicker.update({
      minDate: new Date(),
      maxDate: null,
    });
  }
}

function validate_required_by_date(frm) {
  if (!frm.doc.required_by_date) {
    frappe.msgprint({
      title: __("Required Field Missing"),
      message: __("Please select Required By Date"),
      indicator: "red",
    });
    return false;
  }

  let today = frappe.datetime.get_today();
  let required_date = frm.doc.required_by_date;
  let request_date = frm.doc.request_date || today;

  // Check 1: Required By Date cannot be in past
  if (required_date < today) {
    frappe.msgprint({
      title: __("Invalid Date"),
      message: __(
        "Required By Date cannot be in the past.<br>Minimum date: <b>{0}</b>",
        [frappe.datetime.str_to_user(today)]
      ),
      indicator: "red",
    });

    // Auto-correct to today
    frm.set_value("required_by_date", today);
    frappe.validated = false;
    return false;
  }

  // Check 2: Required By Date cannot be before Request Date
  if (required_date < request_date) {
    frappe.msgprint({
      title: __("Invalid Date Range"),
      message: __(
        "Required By Date cannot be before Request Date.<br>" +
          "Request Date: <b>{0}</b><br>" +
          "Required By Date: <b>{1}</b>",
        [
          frappe.datetime.str_to_user(request_date),
          frappe.datetime.str_to_user(required_date),
        ]
      ),
      indicator: "red",
    });

    // Auto-correct to request date
    frm.set_value("required_by_date", request_date);
    frappe.validated = false;
    return false;
  }

  // Optional: Warning for far future dates (90 days)
  let days_diff = frappe.datetime.get_day_diff(required_date, today);
  if (days_diff > 90) {
    frappe.msgprint({
      title: __("Notice"),
      message: __(
        "Required By Date is <b>{0} days</b> in the future.<br>Please verify if this is correct.",
        [days_diff]
      ),
      indicator: "orange",
    });
    // Don't block, just warning
  }

  return true;
}



frappe.ui.form.on('Employee Material Request', {
    refresh: function(frm) {
        // Remove default Submit button if workflow is active
        if (frm.doc.status && !frm.doc.__islocal) {
            frm.page.clear_inner_toolbar();
        }
        
        // Draft state me Submit button dikhana
        if (frm.doc.docstatus === 0 && frm.doc.status === 'Draft') {
            frm.add_custom_button(__('Submit'), function() {
                frappe.confirm(
                    __('Are you sure you want to submit this request?'),
                    function() {
                        // On yes - Change workflow state to Pending Reporting Person
                        frappe.call({
                            method: 'frappe.client.set_value',
                            args: {
                                doctype: 'Employee Material Request',
                                name: frm.doc.name,
                                fieldname: 'status',
                                value: 'Pending Reporting Person'
                            },
                            callback: function(r) {
                                if (!r.exc) {
                                    frappe.msgprint(__('Request submitted successfully'));
                                    frm.reload_doc();
                                }
                            }
                        });
                    }
                );
            }).addClass('btn-primary');
        }
        
        // Reporting Person ke liye buttons - only if user has permission
        if (frm.doc.status === 'Pending Reporting Person' && frm.doc.docstatus === 0) {
            // Check if current user has Reporting Person role
            if (frappe.user_roles.includes('Reporting Person')) {
                // Approve button
                frm.add_custom_button(__('Approve'), function() {
                    frappe.confirm(
                        __('Are you sure you want to approve this request?'),
                        function() {
                            // On yes
                            frappe.call({
                                method: 'your_app_name.your_module.doctype.employee_material_request.employee_material_request.approve_by_reporting_person',
                                args: {
                                    docname: frm.doc.name
                                },
                                freeze: true,
                                freeze_message: __('Processing...'),
                                callback: function(r) {
                                    if (!r.exc) {
                                        frappe.msgprint(__('Request approved and sent to HO'));
                                        frm.reload_doc();
                                    }
                                }
                            });
                        }
                    );
                }, __('Actions')).addClass('btn-success');
                
                // Reject button
                frm.add_custom_button(__('Reject'), function() {
                    frappe.confirm(
                        __('Are you sure you want to reject this request?'),
                        function() {
                            // On yes
                            frappe.prompt({
                                label: __('Rejection Reason'),
                                fieldname: 'rejection_reason',
                                fieldtype: 'Small Text',
                                reqd: 1
                            }, function(values) {
                                frappe.call({
                                    method: 'your_app_name.your_module.doctype.employee_material_request.employee_material_request.reject_by_reporting_person',
                                    args: {
                                        docname: frm.doc.name,
                                        reason: values.rejection_reason
                                    },
                                    freeze: true,
                                    freeze_message: __('Processing...'),
                                    callback: function(r) {
                                        if (!r.exc) {
                                            frappe.msgprint(__('Request rejected'));
                                            frm.reload_doc();
                                        }
                                    }
                                });
                            }, __('Rejection Reason'), __('Reject'));
                        }
                    );
                }, __('Actions')).addClass('btn-danger');
            }
        }
        
        // HO Person ke liye buttons
        if (frm.doc.status === 'Pending HO Approval' && frm.doc.docstatus === 0) {
            // Check if current user has HO Approver role
            if (frappe.user_roles.includes('HO Approver')) {
                // Approve button
                frm.add_custom_button(__('Approve'), function() {
                    frappe.confirm(
                        __('Are you sure you want to approve this request?'),
                        function() {
                            // On yes
                            frappe.call({
                                method: 'your_app_name.your_module.doctype.employee_material_request.employee_material_request.approve_by_ho',
                                args: {
                                    docname: frm.doc.name
                                },
                                freeze: true,
                                freeze_message: __('Processing...'),
                                callback: function(r) {
                                    if (!r.exc) {
                                        frappe.msgprint(__('Request approved successfully'));
                                        frm.reload_doc();
                                    }
                                }
                            });
                        }
                    );
                }, __('Actions')).addClass('btn-success');
                
                // Reject button
                frm.add_custom_button(__('Reject'), function() {
                    frappe.confirm(
                        __('Are you sure you want to reject this request?'),
                        function() {
                            // On yes
                            frappe.prompt({
                                label: __('Rejection Reason'),
                                fieldname: 'rejection_reason',
                                fieldtype: 'Small Text',
                                reqd: 1
                            }, function(values) {
                                frappe.call({
                                    method: 'your_app_name.your_module.doctype.employee_material_request.employee_material_request.reject_by_ho',
                                    args: {
                                        docname: frm.doc.name,
                                        reason: values.rejection_reason
                                    },
                                    freeze: true,
                                    freeze_message: __('Processing...'),
                                    callback: function(r) {
                                        if (!r.exc) {
                                            frappe.msgprint(__('Request rejected'));
                                            frm.reload_doc();
                                        }
                                    }
                                });
                            }, __('Rejection Reason'), __('Reject'));
                        }
                    );
                }, __('Actions')).addClass('btn-danger');
            }
        }
        
        // Approved state me Complete button
        if (frm.doc.status === 'Approved' && frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Mark as Completed'), function() {
                frappe.confirm(
                    __('Are you sure you want to mark this as completed?'),
                    function() {
                        frappe.call({
                            method: 'your_app_name.your_module.doctype.employee_material_request.employee_material_request.mark_as_completed',
                            args: {
                                docname: frm.doc.name
                            },
                            callback: function(r) {
                                if (!r.exc) {
                                    frappe.msgprint(__('Request marked as completed'));
                                    frm.reload_doc();
                                }
                            }
                        });
                    }
                );
            }).addClass('btn-primary');
        }
    }
});

frappe.ui.form.on("Employee Material Request", {
  before_workflow_action: function(frm) {
    let action = frm.selected_workflow_action;
    
    // Unfreeze screen immediately before showing any dialog
    frappe.dom.unfreeze();
    
    if (action === "Submit") {
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("<b>Are all fields correctly entered?</b>"),
          function() {
            resolve();
          },
          function() {
            reject("❌ Submission cancelled by user.");
          }
        );
      });
    }
    
    else if (action === "Approve") {
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("Are you sure you want to approve this request?"),
          function() {
            resolve();
          },
          function() {
            reject("❌ Approval cancelled by user.");
          }
        );
      });
    }
    
    else if (action === "Reject") {
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("Are you sure you want to reject this request?"),
          function() {
            resolve();
          },
          function() {
            reject("❌ Rejection cancelled by user.");
          }
        );
      });
    }
  }
});
