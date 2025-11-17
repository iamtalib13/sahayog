// ==================================================================
// EMPLOYEE MATERIAL REQUEST - CLIENT SCRIPT (WORKFLOW BASED)
// ==================================================================
// This script handles:
// - Date validations (required_by_date restrictions)
// - Field validations (reporting person, items, employee)
// - Workflow action confirmations
// - Form intro messages
// - Auto-population of employee-related fields
// - Child table item category auto-detection
// - Hide toolbar buttons for non-admin users
// ==================================================================

frappe.ui.form.on("Employee Material Request", {
  
  // ------------------------------------------------------------------
  // REFRESH EVENT - Triggered when form loads/refreshes
  // ------------------------------------------------------------------
  refresh: function (frm) {
    // Set intro message based on document status
    set_form_intro(frm);

    // Approval Timeline 
 if (frm.doc.docstatus > 0 || frm.doc.status) {
      show_approval_timeline(frm);
    }
    
    
    // Apply date restrictions on required_by_date field
    set_date_restrictions(frm);
    
    // Hide toolbar buttons for non-admin users
    hide_toolbar_buttons_for_non_admin();
    
    // Show amend button for cancelled documents
    if (frm.doc.docstatus === 2) {
      frm.add_custom_button(__("Amend"), function () {
        frappe.model.open_amended_doc("Employee Material Request", frm.doc.name);
      });
    }
  },

  // ------------------------------------------------------------------
  // ONLOAD EVENT - Triggered once when form is first created
  // ------------------------------------------------------------------
  onload: function (frm) {
    // Set default values for new documents
    if (frm.is_new()) {
      frm.set_value("request_date", frappe.datetime.get_today());
      frm.set_value("status", "Draft");
      
      // Set default required by date to today if not set
      if (!frm.doc.required_by_date) {
        frm.set_value("required_by_date", frappe.datetime.get_today());
      }
    }
  },

  // ------------------------------------------------------------------
  // EMPLOYEE FIELD - Auto-populate reporting person and target location
  // ------------------------------------------------------------------
  employee: function (frm) {
    if (frm.doc.employee) {
      // Fetch employee details from server
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Employee",
          name: frm.doc.employee,
        },
        callback: function (res) {
          if (res.message) {
            // Auto-set Reporting Person from employee's "reports_to" field
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
                    
                    frappe.show_alert({
                      message: __("Reporting Person: {0}", [resp.message.employee_name]),
                      indicator: "green",
                    }, 5);
                  }
                },
              });
            } else {
              frappe.show_alert("Reporting Person not set for selected Employee");
            }
            
            // Auto-set Target Warehouse with Branch and State info
            if (frm.doc.target_location) {
              frm.set_value("target_warehouse", frm.doc.target_location);
              
              frappe.db.get_value("Sahayog Branch", frm.doc.target_location, ["branch", "state"])
                .then((r) => {
                  let b = r?.message?.branch || "Not Found";
                  let s = r?.message?.state || "N/A";
                  
                  frm.set_df_property(
                    "target_warehouse",
                    "description",
                    `Branch: <b>${frappe.utils.escape_html(b)}</b> | State: <b>${frappe.utils.escape_html(s)}</b>`
                  );
                });
            } else {
              frappe.show_alert("Target location not set for selected Employee");
              frm.set_df_property("target_warehouse", "description", "");
            }
          }
        },
      });
    }
  },

  // ------------------------------------------------------------------
  // DATE VALIDATION - Triggered when required_by_date changes
  // ------------------------------------------------------------------
  required_by_date: function (frm) {
    validate_required_by_date(frm);
  },

  // ------------------------------------------------------------------
  // REQUEST DATE CHANGE - Re-validate required_by_date
  // ------------------------------------------------------------------
  request_date: function (frm) {
    if (frm.doc.required_by_date) {
      validate_required_by_date(frm);
    }
  },

  // ------------------------------------------------------------------
  // BEFORE WORKFLOW ACTION - Validation and confirmation dialogs
  // ------------------------------------------------------------------
  before_workflow_action: function (frm) {
    let action = frm.selected_workflow_action;
    
    // Unfreeze screen to show dialogs properly
    frappe.dom.unfreeze();
    
    // Validation for Submit action
    if (action === "Submit" || action === "Submit for Approval") {
      // Check reporting person is set
      if (!frm.doc.reporting_person) {
        frappe.throw(__("Please set Reporting Person"));
        return false;
      }
      
      // Check at least one item exists
      if (!frm.doc.items || frm.doc.items.length === 0) {
        frappe.throw(__("Please add at least one item"));
        return false;
      }
      
      // Validate required by date
      if (!validate_required_by_date(frm)) {
        return false;
      }
      
      // Show confirmation dialog
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("<b>Are all fields correctly entered?</b>"),
          function () {
            resolve();
          },
          function () {
            reject("❌ Submission cancelled by user.");
          }
        );
      });
    }
    
    // Confirmation for Approve action
    else if (action === "Approve") {
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("Are you sure you want to approve this request?"),
          function () {
            resolve();
          },
          function () {
            reject("❌ Approval cancelled by user.");
          }
        );
      });
    }
    
    // Confirmation for Reject action
    else if (action === "Reject") {
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("Are you sure you want to reject this request?"),
          function () {
            resolve();
          },
          function () {
            reject("❌ Rejection cancelled by user.");
          }
        );
      });
    }
  },
});

// ==================================================================
// CHILD TABLE EVENTS - Material Request Items
// ==================================================================

frappe.ui.form.on("Material Request Items", {
  
  // ------------------------------------------------------------------
  // ITEM CODE - Auto-detect category and populate item details
  // ------------------------------------------------------------------
  item_code: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    
    if (row.item_code) {
      // Fetch item details from server
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Item",
          name: row.item_code,
        },
        callback: function (r) {
          if (r.message) {
            let item = r.message;
            
            // Set basic item fields
            frappe.model.set_value(cdt, cdn, "item_name", item.item_name);
            frappe.model.set_value(cdt, cdn, "uom", item.stock_uom);
            frappe.model.set_value(cdt, cdn, "description", item.description);
            
            // Auto-detect and set item category
            let category = "";
            if (item.is_fixed_asset) {
              category = "Asset";
              // Set quantity to 1 for assets by default
              if (!row.quantity || row.quantity === 0) {
                frappe.model.set_value(cdt, cdn, "quantity", 1);
              }
            } else if (item.is_stock_item) {
              category = "Stock Item";
            } else {
              // Item is neither asset nor stock item - show error
              frappe.msgprint({
                title: __("Invalid Item"),
                message: __("Row {0}: {1} is neither an Asset nor a Stock Item", 
                  [row.idx, item.item_code]),
                indicator: "red",
              });
              frappe.model.set_value(cdt, cdn, "item_code", "");
              return;
            }
            
            // Set category automatically
            frappe.model.set_value(cdt, cdn, "item_category", category);
            
            // Show success alert
            frappe.show_alert({
              message: __("Category auto-set: {0}", [category]),
              indicator: category === "Asset" ? "blue" : "purple",
            }, 3);
            
            // Get available stock for stock items
            if (category === "Stock Item" && row.warehouse) {
              get_available_stock(frm, cdt, cdn);
            }
            
            // Refresh form to show conditional fields
            frm.refresh_field("items");
          }
        },
      });
    }
  },

  // ------------------------------------------------------------------
  // WAREHOUSE FIELD - Fetch available stock when warehouse changes
  // ------------------------------------------------------------------
  warehouse: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.item_code && row.warehouse && row.item_category === "Stock Item") {
      get_available_stock(frm, cdt, cdn);
    }
  },

  // ------------------------------------------------------------------
  // QUANTITY FIELD - Warn if quantity exceeds available stock
  // ------------------------------------------------------------------
  quantity: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    
    if (row.item_category === "Stock Item" && row.quantity > row.available_qty) {
      frappe.msgprint({
        title: __("Stock Warning"),
        message: __("Row {0}: Requested ({1}) exceeds available ({2})", 
          [row.idx, row.quantity, row.available_qty]),
        indicator: "orange",
      });
    }
  },
});

// ==================================================================
// HELPER FUNCTIONS
// ==================================================================

// ------------------------------------------------------------------
// SET FORM INTRO - Display contextual messages at top of form
// ------------------------------------------------------------------

function set_form_intro(frm) {
  // Clear any existing intro
  frm.set_intro("");
  
  // Only show intro for brand new, unsaved documents
  if (frm.doc.__islocal) {
    frm.set_intro(__("Fill all required fields and save the document"), "blue");
  }
}

// ------------------------------------------------------------------
// SHOW APPROVAL TIMELINE - Display approval chain in dashboard
// ------------------------------------------------------------------
function show_approval_timeline(frm) {
  // Clear existing custom sections
  frm.dashboard.clear_section("custom");
  
  // Add timeline after slight delay
  setTimeout(function() {
    let html = '<div class="approval-timeline" style="background: #f9f9f9; padding: 15px; border-radius: 5px;">';
    html += "<h5>Approval Timeline</h5>";

    html += "<div><b>Requested By:</b> " + frm.doc.requested_by;
    if (frm.doc.request_datetime) {
      html += " on " + frappe.datetime.str_to_user(frm.doc.request_datetime);
    }
    html += "</div><br>";

    if (frm.doc.reporting_person) {
      html += "<div><b>1. Reporting Person:</b> " + frm.doc.reporting_person + " - ";

      if (frm.doc.reporting_person_status === "Approved") {
        html += '<span class="indicator-pill green">✓ Approved</span>';
        if (frm.doc.reporting_person_approval_date) {
          html += " on " + frappe.datetime.str_to_user(frm.doc.reporting_person_approval_date);
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
        html += " on " + frappe.datetime.str_to_user(frm.doc.ho_officer_approval_date);
      }
    } else if (frm.doc.ho_officer_status === "Rejected") {
      html += '<span class="indicator-pill red">✗ Rejected</span>';
    } else {
      html += '<span class="indicator-pill orange">⏱ Pending</span>';
    }
    html += "</div>";

    html += "</div>";
    
    frm.dashboard.add_section(html, "Approval Status");
  }, 200);
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



// ------------------------------------------------------------------
// SET DATE RESTRICTIONS - Disable past dates in datepicker
// ------------------------------------------------------------------
function set_date_restrictions(frm) {
  // Add description below required_by_date field
  frm.set_df_property(
    "required_by_date",
    "description",
    __("Cannot select past dates. Minimum date: Today")
  );
  
  // Configure datepicker to disable past dates
  if (frm.fields_dict.required_by_date && frm.fields_dict.required_by_date.datepicker) {
    frm.fields_dict.required_by_date.datepicker.update({
      minDate: new Date(),
      maxDate: null,
    });
  }
}

// ------------------------------------------------------------------
// VALIDATE REQUIRED BY DATE - Comprehensive date validation logic
// ------------------------------------------------------------------
function validate_required_by_date(frm) {
  // Check if date is provided
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
  
  // Validation 1: Required By Date cannot be in the past
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
  
  // Validation 2: Required By Date cannot be before Request Date
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
  
  // Warning: Far future dates (more than 90 days)
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
    // Don't block submission, just show warning
  }
  
  return true;
}

// ------------------------------------------------------------------
// GET AVAILABLE STOCK - Fetch actual quantity from Bin doctype
// ------------------------------------------------------------------
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
        frappe.model.set_value(cdt, cdn, "available_qty", r.message.actual_qty || 0);
      }
    },
  });
}

// ------------------------------------------------------------------
// HIDE TOOLBAR BUTTONS - Only for non-admin users, keep sidebar visible
// ------------------------------------------------------------------
function hide_toolbar_buttons_for_non_admin() {
  // Check if user is NOT Administrator
  if (frappe.session.user !== "Administrator") {
    
    // Use setTimeout to ensure DOM is fully loaded
    setTimeout(function() {
      // Hide Previous button in form toolbar
      $("button.prev-doc").hide();
      
      // Hide Next button in form toolbar
      $("button.next-doc").hide();
      
      // Hide Print button in form toolbar
      $("button.icon-btn[data-original-title='Print']").hide();
      $("button.icon-btn[title='Print']").hide();
      
    }, 150); // Slight delay ensures buttons are rendered
  }
}
