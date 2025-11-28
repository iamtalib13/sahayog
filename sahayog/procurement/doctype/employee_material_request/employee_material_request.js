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
  // WORKFLOW ACTIONS - Confirmations
  // ------------------------------------------------------------------

    before_workflow_action: function(frm) {
        let action = frm.selected_workflow_action.toLowerCase();

        if (["approve", "reject"].includes(action)) {
            frappe.dom.unfreeze();
            return new Promise((resolve, reject) => {
                frappe.confirm(
                    `Are you sure you want to ${action} this request?`,
                    () => resolve(),
                    () => {
                        frappe.validated = false;
                        reject();
                    }
                );
            });
        }
    },

    after_workflow_action: function(frm) {
        frm.reload_doc();
    },
  
  // ------------------------------------------------------------------
  // REFRESH EVENT - Triggered when form loads/refreshes
  // ------------------------------------------------------------------
  refresh: function (frm) {

      const blocked_status = ["Draft", "Approved", "Rejected"];
     // Add Manage Approver button - ONLY for saved docs, Admin/Store Manager
        if (!frm.is_new()
            && !blocked_status.includes(frm.doc.status) 
            && (frappe.user.has_role("Administrator") || frappe.user.has_role("Store Manager"))) {
            // Avoid duplicate buttons
            if (!frm.custom_buttons || !frm.custom_buttons['Manage Approver']) {
                frm.add_custom_button(__('Manage Approver'), () => {
                    openManageApprovalsDialog(frm);
                },); // Add to Actions group
            }
        }

        // const blocked_status = ["Draft", "Approved", "Rejected"];
        // if (
        //     !frm.is_new() &&
        //     !blocked_status.includes(frm.doc.status) &&
        //     (frappe.user.has_role("Administrator") || frappe.user.has_role("Store Manager"))
        // ) {
        //     frm.add_custom_button(
        //         __("Manage Approver"),
        //         () => openManageApprovalsDialog(frm),
        //         __("Actions")
        //     );
        // }


    // // Set intro message based on document status
    // set_form_intro(frm);

    // // Instead of relying on cached intro, forcibly fetch fresh data
    // frappe.call({
    // //   method: "sahayog.procurement.doctype.employee_material_request.employee_material_request.get_material_request_intro_data",
    //   args: { doc_name: frm.doc.name },
    //   callback: function(r) {
    //     if (r.message && r.message.success) {
    //       render_intro_html(frm, r.message.data);
    //     } else {
    //       frm.set_intro("Unable to load intro data", "red");
    //     }
    //   }
    // });

     // Clear or set basic intro for new unsaved docs
  if (frm.is_new()) {
    frm.set_intro(__("Fill all required fields and save the document"), "blue");
    
    // Skip fetching intro data for new unsaved docs
    return;
  }
  
  // For saved docs, fetch intro data
  frappe.call({
    method: "sahayog.procurement.doctype.employee_material_request.employee_material_request.get_material_request_intro_data",
    args: { doc_name: frm.doc.name },
    callback: function(r) {
      if (r.message && r.message.success) {
        render_intro_html(frm, r.message.data);
      } else {
        frm.set_intro("Unable to load intro data", "red");
      }
    }
  });


function openManageApprovalsDialog(frm) {
    const d = new frappe.ui.Dialog({
        title: __("Manage Approvers"),
        size: "large",
        fields: [
            // ========= CARD 1: Reporting Person (HTML shell) =========
            {
                fieldtype: "HTML",
                fieldname: "rp_card",
                label: __("Reporting Person")
            },

            // Logical fields backing the RP controls
            {
                fieldtype: "Check",
                fieldname: "rp_skip",
                label: __("Skip Reporting Person"),
                hidden: 1
            },
             // ========= Change Reporting Person (logical field only) =========
            {
                fieldtype: "Link",
                fieldname: "new_reporting_person",
                label: __("Change Reporting Person"),
                options: "User",
                default: frm.doc.reporting_person || "",
                description: __("Select new Reporting Person (resets their status to Pending)"),
            },
            {
                fieldtype: "HTML",
                fieldname: "new_rp_preview"
            },
            {
                fieldtype: "Small Text",
                fieldname: "rp_remark",
                label: __("Reporting Person Remark"),
                depends_on: "eval:doc.rp_skip==1",
                mandatory_depends_on: "eval:doc.rp_skip==1"
            },

            { fieldtype: "Column Break" },

            // ========= CARD 2: HO Officer (HTML shell) =========
            {
                fieldtype: "HTML",
                fieldname: "ho_card",
                label: __("HO Officer")
            },

            {
                fieldtype: "Check",
                fieldname: "ho_skip",
                label: __("Skip HO Officer"),
                hidden: 1
            },
            {
                fieldtype: "Small Text",
                fieldname: "ho_remark",
                label: __("HO Officer Remark"),
                depends_on: "eval:doc.ho_skip==1",
                mandatory_depends_on: "eval:doc.ho_skip==1"
            },

            // { fieldtype: "Section Break" },

            // // ========= Change Reporting Person (logical field only) =========
            // {
            //     fieldtype: "Link",
            //     fieldname: "new_reporting_person",
            //     label: __("Change Reporting Person"),
            //     options: "User",
            //     default: frm.doc.reporting_person || "",
            //     description: __("Select new Reporting Person (resets their status to Pending)"),
            // },
            // {
            //     fieldtype: "HTML",
            //     fieldname: "new_rp_preview"
            // }
        ],
        primary_action_label: __("Submit"),
        primary_action(values) {
            const rp_allowed = ["Not Received", "Pending", "", null];
            const ho_allowed = ["Not Received", "Pending", "", null];

            // Server-like validation on allowed statuses for skip
            if (values.rp_skip && !rp_allowed.includes(frm.doc.reporting_person_status)) {
                frappe.msgprint(__("Reporting Person already decided. Cannot skip."));
                return;
            }
            if (values.ho_skip && !ho_allowed.includes(frm.doc.ho_officer_status)) {
                frappe.msgprint(__("HO Officer already decided. Cannot skip."));
                return;
            }

            // At least one action
            const rp_changed = values.new_reporting_person &&
                               values.new_reporting_person !== frm.doc.reporting_person;

            if (!values.rp_skip && !values.ho_skip && !rp_changed) {
                frappe.msgprint(__("Select at least one action: Skip or Change Reporting Person."));
                return;
            }

            d.hide();

            frappe.call({
                method: "sahayog.procurement.doctype.employee_material_request.employee_material_request.admin_manage_approvers",
                args: {
                    docname: frm.doc.name,
                    rp_skip: values.rp_skip ? 1 : 0,
                    ho_skip: values.ho_skip ? 1 : 0,
                    rp_remark: values.rp_remark || "",
                    ho_remark: values.ho_remark || "",
                    new_reporting_person: values.new_reporting_person || ""
                },
                freeze: true,
                freeze_message: __("Updating approvers..."),
                callback: (r) => {
                    if (r.message && r.message.success) {
                        frappe.show_alert({ message: r.message.message, indicator: "green" });
                        frm.reload_doc();
                    }
                }
            });
        }
    });

    // ===== Helper for status badge =====
    // ===== Helper for status badge (keep as before) =====
function get_status_badge(status) {
    const s = status || "Not Received";
    const map = {
        "Pending":      { label: __("Pending"),      class: "status-pending" },
        "Approved":     { label: __("Approved"),     class: "status-approved" },
        "Rejected":     { label: __("Rejected"),     class: "status-rejected" },
        "Skip":         { label: __("Skip"),         class: "status-skip" },
        "Not Received": { label: __("Not Received"), class: "status-new-record" }
    };
    return map[s] || map["Not Received"];
}
const rp_badge = get_status_badge(frm.doc.reporting_person_status);
const ho_badge = get_status_badge(frm.doc.ho_officer_status);

// ========= Reporting Person card HTML =========
const rp_html = `
    <div style="border:1px solid #d1d8dd;border-radius:6px;padding:10px;margin-bottom:6px;">
        <div style="font-weight:600;">${__("Reporting Person")}</div>
        <div style="margin-top:4px;margin-bottom:6px;">
            ${frappe.utils.escape_html(frm.doc.reporting_person || __("Not Set"))}
            <span class="emr-status-badge ${rp_badge.class}" style="margin-left:8px;padding:2px 8px;border-radius:12px;font-size:11px;">
                ${rp_badge.label}
            </span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <input type="checkbox" id="rp_skip_cb" style="margin:0;">
            <label for="rp_skip_cb" style="margin:0;font-size:12px;">${__("Skip Reporting Person")}</label>
        </div>
        <div class="rp-remark-wrapper" style="margin-bottom:6px; display:none;">
            <!-- RP remark field will be moved here -->
        </div>
        <div style="margin-top:4px;">
            <label style="display:block;font-size:12px;margin-bottom:2px;">
                ${__("")}
            </label>
            <div class="rp-change-wrapper" style="max-width:100%;">
                <!-- Link field will be moved here -->
            </div>
        </div>
    </div>
`;

// ========= HO Officer card HTML =========
const ho_html = `
    <div style="border:1px solid #d1d8dd;border-radius:6px;padding:10px;margin-bottom:6px;">
        <div style="font-weight:600;">${__("HO Officer")}</div>
        <div style="margin-top:4px;margin-bottom:6px;">
            ${frappe.utils.escape_html(frm.doc.head_office_officer || __("Not Set"))}
            <span class="emr-status-badge ${ho_badge.class}" style="margin-left:8px;padding:2px 8px;border-radius:12px;font-size:11px; height:28px">
                ${ho_badge.label}
            </span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <input type="checkbox" id="ho_skip_cb" style="margin:0;">
            <label for="ho_skip_cb" style="margin:0;font-size:12px;">${__("Skip HO Officer")}</label>
        </div>
        <div class="ho-remark-wrapper" style="margin-bottom:6px; display:none;">
            <!-- HO remark field will be moved here -->
        </div>
    </div>
`;

// Inject HTML
d.get_field("rp_card").$wrapper.html(rp_html);
d.get_field("ho_card").$wrapper.html(ho_html);

// Move existing dialog fields into the card wrappers
const rpRemarkField = d.fields_dict.rp_remark.$wrapper;
const hoRemarkField = d.fields_dict.ho_remark.$wrapper;
const newRpFieldWrapper = d.fields_dict.new_reporting_person.$wrapper;
// rp_remark.style.height = "60%";
// re_remark.style.width = "60%";

d.get_field("rp_card").$wrapper.find(".rp-remark-wrapper").append(rpRemarkField);
d.get_field("rp_card").$wrapper.find(".rp-change-wrapper").append(newRpFieldWrapper);
d.get_field("ho_card").$wrapper.find(".ho-remark-wrapper").append(hoRemarkField);

// Wire checkboxes to dialog fields + show/hide remark divs
d.$wrapper.find("#rp_skip_cb").on("change", function () {
    const checked = this.checked ? 1 : 0;
    d.set_value("rp_skip", checked);
    d.get_field("rp_card").$wrapper
        .find(".rp-remark-wrapper")
        .css("display", checked ? "block" : "none");
});

d.$wrapper.find("#ho_skip_cb").on("change", function () {
    const checked = this.checked ? 1 : 0;
    d.set_value("ho_skip", checked);
    d.get_field("ho_card").$wrapper
        .find(".ho-remark-wrapper")
        .css("display", checked ? "block" : "none");
});


    

    // Move the Frappe Link input (new_reporting_person) inside RP card, 60% width
    // const newRpFieldWrapper = d.fields_dict.new_reporting_person.$wrapper;
    d.get_field("rp_card").$wrapper.find(".rp-change-wrapper").append(newRpFieldWrapper);

    // Preview selected new Reporting Person name under the field
    d.fields_dict.new_reporting_person.df.onchange = function () {
        const val = d.get_value("new_reporting_person");
        if (!val) {
            d.get_field("new_rp_preview").$wrapper.empty();
            return;
        }
        frappe.db.get_value("User", val, "full_name").then(r => {
            const name = r.message && r.message.full_name ? r.message.full_name : val;
            d.get_field("new_rp_preview").$wrapper.html(
                `<div style="margin-top:4px;font-size:11px;color:#6c757d;">
                    ${__("New Reporting Person")}: ${frappe.utils.escape_html(name)} (${frappe.utils.escape_html(val)})
                 </div>`
            );
        });
    };

    // After dialog is created
// d.fields_dict.rp_remark.$wrapper
//     .css("width", "60%")
//     .find("textarea")
//     .css({
//         width: "100%",
//         height: "60%"
//     });

// d.fields_dict.ho_remark.$wrapper
//     .css("width", "60%")
//     .find("textarea")
//     .css({
//         width: "100%",
//         height: "60%"
//     });

   
// after you build and inject ho_html
const rp_state = frm.doc.reporting_person_status || "Not Received";
const ho_cb = d.$wrapper.find("#ho_skip_cb");

// RP must be Approved or Skip to allow HO skip
const rp_allows_skip_ho = ["Approved", "Skip"].includes(rp_state);

if (!rp_allows_skip_ho) {
    // disable checkbox visually + functionally
    ho_cb.prop("disabled", true);
    ho_cb.closest("div").css("opacity", 0.5);
    d.set_value("ho_skip", 0);
} else {
    ho_cb.prop("disabled", false);
    ho_cb.closest("div").css("opacity", 1);
}

// keep existing change handler, but respect disabled state
ho_cb.on("change", function () {
    if (ho_cb.is(":disabled")) {
        d.set_value("ho_skip", 0);
        return;
    }
    const checked = this.checked ? 1 : 0;
    d.set_value("ho_skip", checked);
    d.get_field("ho_card").$wrapper
        .find(".ho-remark-wrapper")
        .css("display", checked ? "block" : "none");
});


    d.show();
}

function applyApprovalChanges(frm, values) {
    frappe.call({
        method: "sahayog.procurement.doctype.employee_material_request.employee_material_request.admin_skip_approver",
        args: {
            docname: frm.doc.name,
            skip_current: values.skip_current || 0,
            skip_ho: values.skip_ho || 0,
            new_reporting_person: values.new_reporting_person || "",
            admin_remarks: values.admin_remarks || ""
        },
        freeze: true,
        freeze_message: __("Updating approvals..."),
        callback: (r) => {
            if (!r.exc) {
                frappe.show_alert({
                    message: __("✅ Approval changes applied successfully"),
                    indicator: "green"
                }, 5);
                frm.reload_doc();
            } else {
                frappe.msgprint({
                    message: __("Failed to apply changes: {0}", [r.exc]),
                    indicator: "red"
                });
            }
        }
    });
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
  // before_workflow_action: function (frm) {
  //   let action = frm.selected_workflow_action;
    
  //   // Unfreeze screen to show dialogs properly
  //   frappe.dom.unfreeze();
    
  //   // Validation for Submit action
  //   if (action === "Submit" || action === "Submit for Approval") {
  //     // Check reporting person is set
  //     if (!frm.doc.reporting_person) {
  //       frappe.throw(__("Please set Reporting Person"));
  //       return false;
  //     }
      
  //     // Check at least one item exists
  //     if (!frm.doc.items || frm.doc.items.length === 0) {
  //       frappe.throw(__("Please add at least one item"));
  //       return false;
  //     }
      
  //     // Validate required by date
  //     if (!validate_required_by_date(frm)) {
  //       return false;
  //     }
      
  //     // Show confirmation dialog
  //     return new Promise((resolve, reject) => {
  //       frappe.confirm(
  //         __("<b>Are all fields correctly entered?</b>"),
  //         function () {
  //           resolve();
  //         },
  //         function () {
  //           reject("❌ Submission cancelled by user.");
  //         }
  //       );
  //     });
  //   }
    
  //   // Confirmation for Approve action
  //   else if (action === "Approve") {
  //     return new Promise((resolve, reject) => {
  //       frappe.confirm(
  //         __("Are you sure you want to approve this request?"),
  //         function () {
  //           resolve();
  //         },
  //         function () {
  //           reject("❌ Approval cancelled by user.");
  //         }
  //       );
  //     });
  //   }
    
  //   // Confirmation for Reject action
  //   else if (action === "Reject") {
  //     return new Promise((resolve, reject) => {
  //       frappe.confirm(
  //         __("Are you sure you want to reject this request?"),
  //         function () {
  //           resolve();
  //         },
  //         function () {
  //           reject("❌ Rejection cancelled by user.");
  //         }
  //       );
  //     });
  //   }
  // },

  before_workflow_action: function(frm) {
        console.log(`Before workflow action triggered: Selected action = ${frm.selected_workflow_action}`);
        console.log(`Current status: ${frm.doc.status}`);
        console.log(`reporting_person_status: ${frm.doc.reporting_person_status}`);
        console.log(`ho_officer_status: ${frm.doc.ho_officer_status}`);

        let action = frm.selected_workflow_action.toLowerCase();

        if (['approve', 'reject', 'skip'].includes(action)) {
            frappe.dom.unfreeze();

            return new Promise((resolve, reject) => {
                frappe.confirm(
                    `Are you sure you want to ${action} this request?`,
                    () => {
                        console.log(`User confirmed action: ${action}`);
                        resolve();
                    },
                    () => {
                        frappe.validated = false;
                        console.log(`User cancelled action: ${action}`);
                        reject();
                    }
                );
            });
        }
    },
    after_workflow_action: function(frm) {
        console.log('After workflow action triggered');
        console.log('Updated status:', frm.doc.status);
        console.log('Updated reporting_person_status:', frm.doc.reporting_person_status);
        console.log('Updated ho_officer_status:', frm.doc.ho_officer_status);
    }
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

// ==================================================================
// EMPLOYEE MATERIAL REQUEST - CLIENT SCRIPT
// ==================================================================

// frappe.ui.form.on("Employee Material Request", {
//     refresh: function(frm) {
//         set_form_intro(frm);
//     },
    
//     onload: function(frm) {
//         set_form_intro(frm);
//     }
// });

// ==================================================================
// SET FORM INTRO - Production-level implementation with caching
// ==================================================================

function set_form_intro(frm) {
  console.log("hello from intro")
  // Clear any existing intro
  frm.set_intro("");
  
  // Only show intro for brand new, unsaved documents
  if (frm.doc.__islocal) {
    frm.set_intro(__("Fill all required fields and save the document"), "blue");
  } else {
    // Fetch data with caching and render intro
    fetch_intro_data_with_cache(frm);
  }
}

// ------------------------------------------------------------------
// FETCH INTRO DATA WITH CACHING
// Implements intelligent caching with localStorage
// ------------------------------------------------------------------
function fetch_intro_data_with_cache(frm) {
  frm.set_intro("");
  const CACHE_KEY_PREFIX = "emr_intro_";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  const MAX_CACHE_ITEMS = 50; // Maximum cached items
  
  const cache_key = CACHE_KEY_PREFIX + frm.doc.name;
  
  // Try to get from cache first
  const cached_data = get_from_cache(cache_key, CACHE_DURATION);
  
  if (cached_data) {
    // Cache hit - render immediately
    console.log("Loading intro from cache:", frm.doc.name);
    render_intro_html(frm, cached_data);
    return;
  }
  
  // Cache miss - fetch from server
  console.log("Fetching intro from server:", frm.doc.name);
  
  frappe.call({
    method: "sahayog.procurement.doctype.employee_material_request.employee_material_request.get_material_request_intro_data",
    args: {
      doc_name: frm.doc.name
    },
    freeze: true,
    freeze_message: __("Loading details..."),
    callback: function(r) {
      if (r.message && r.message.success) {
        const data = r.message.data;
        
        // Save to cache
        save_to_cache(cache_key, data, MAX_CACHE_ITEMS, CACHE_KEY_PREFIX);
        
        // Render intro
        render_intro_html(frm, data);
      } else {
        // Error handling - show fallback
        frappe.msgprint({
          title: __("Error Loading Details"),
          message: r.message?.error || __("Unable to load intro details"),
          indicator: "red"
        });
        render_intro_fallback(frm);
      }
    },
    error: function(err) {
      console.error("Error fetching intro data:", err);
      render_intro_fallback(frm);
    }
  });
}

// ------------------------------------------------------------------
// GET FROM CACHE
// Retrieves data from localStorage with expiry check
// ------------------------------------------------------------------
function get_from_cache(key, duration) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - parsed.timestamp > duration) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch (e) {
    console.error("Cache read error:", e);
    return null;
  }
}

// ------------------------------------------------------------------
// SAVE TO CACHE
// Saves data to localStorage with LRU (Least Recently Used) eviction
// ------------------------------------------------------------------
function save_to_cache(key, data, max_items, key_prefix) {
  try {
    // Prepare cache entry
    const cache_entry = {
      data: data,
      timestamp: Date.now()
    };
    
    // Save current item
    localStorage.setItem(key, JSON.stringify(cache_entry));
    
    // Clean old cache entries if limit exceeded
    clean_old_cache(max_items, key_prefix);
    
  } catch (e) {
    // localStorage full - clean and retry
    if (e.name === 'QuotaExceededError') {
      console.warn("localStorage full, cleaning old entries...");
      clean_old_cache(Math.floor(max_items / 2), key_prefix);
      
      // Retry save
      try {
        localStorage.setItem(key, JSON.stringify(cache_entry));
      } catch (e2) {
        console.error("Failed to save to cache after cleanup:", e2);
      }
    } else {
      console.error("Cache write error:", e);
    }
  }
}

// ------------------------------------------------------------------
// CLEAN OLD CACHE
// Removes oldest cache entries when limit exceeded (LRU strategy)
// ------------------------------------------------------------------
function clean_old_cache(max_items, key_prefix) {
  try {
    // Get all cache keys
    const cache_entries = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(key_prefix)) {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          cache_entries.push({
            key: key,
            timestamp: value.timestamp || 0
          });
        } catch (e) {
          // Invalid cache entry - remove it
          localStorage.removeItem(key);
        }
      }
    }
    
    // If over limit, remove oldest entries
    if (cache_entries.length > max_items) {
      // Sort by timestamp (oldest first)
      cache_entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest entries
      const to_remove = cache_entries.length - max_items;
      for (let i = 0; i < to_remove; i++) {
        localStorage.removeItem(cache_entries[i].key);
      }
      
      console.log(`Cleaned ${to_remove} old cache entries`);
    }
  } catch (e) {
    console.error("Cache cleanup error:", e);
  }
}


    // Helper: persist "Submitted" for DIV 2 after first submit
  function get_persistent_submitted(frm) {
      let key = 'emr_badge_submitted_' + frm.doc.name;
      return localStorage.getItem(key) === "1";
  }
  function set_persistent_submitted(frm) {
      let key = 'emr_badge_submitted_' + frm.doc.name;
      localStorage.setItem(key, "1");
  }

// ------------------------------------------------------------------
// RENDER INTRO HTML
// Renders the intro section with fetched/cached data
// ------------------------------------------------------------------
function render_intro_html(frm, data) {
  frm.set_intro("");



  const status = frm.doc.status || data.status;
  // === DIV 2 Badge Logic ===
  let div2_badge = { label: "Draft", class: "status-draft" };
  if (["Pending Reporting Person", "Pending HO Approval", "Approved", "Completed"].includes(status)) {
      div2_badge = { label: "Submitted", class: "status-submitted" };
      set_persistent_submitted(frm);
  } else if (get_persistent_submitted(frm)) {
      div2_badge = { label: "Submitted", class: "status-submitted" };
  }

  // === DIV 3 (Reporting Person) Badge ===
  let rep_stat = data.reporting_person_status || "";
  let div3_badge = { label: "Not Received", class: "status-new-record" };
  if (["Pending", "Approved", "Rejected", "Skip"].includes(rep_stat)) {
    const map = {
      "Pending":   { label: "Pending", class: "status-pending" },
      "Approved":  { label: "Approved", class: "status-approved" },
      "Rejected":  { label: "Rejected", class: "status-rejected" },
      "Skip":      { label: "Skip", class: "status-skip" }
    };
    div3_badge = map[rep_stat];
  }

  // === DIV 4 (HO) Badge ===
  let ho_stat = data.ho_officer_status || "";
  // let show_ho_pending = ["Pending HO Approval", "Approved", "Completed"].includes(status);
  let show_ho_pending = ["Pending HO Approval", "Approved", "Completed", "Rejected"].includes(status);
  let div4_badge = { label: "Not Received", class: "status-new-record" };
  if (["Pending", "Approved", "Rejected", "Skip"].includes(ho_stat) && show_ho_pending) {
    const map = {
      "Pending":   { label: "Pending", class: "status-pending" },
      "Approved":  { label: "Approved", class: "status-approved" },
      "Rejected":  { label: "Rejected", class: "status-rejected" },
      "Skip":      { label: "Skip", class: "status-skip" }
    };
    div4_badge = map[ho_stat];
  }

  
  let html = `
    <style>
      .emr-quick-guide {
        background: transparent;
        border-radius: 6px;
        padding: 0px;
        margin: 8px 0;
      }
      
      .emr-grid-parent {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 1fr);
        gap: 8px;
        min-height: 100px;
      }
      
      .emr-grid-card {
        background: transparent !important;
        border-radius: 4px;
        padding: 10px;
      }
      
      .emr-div1, .emr-div2, .emr-div3, .emr-div4 {
        background: transparent !important;
      }
      
      .emr-div1 {
        grid-column: span 2 / span 2;
        grid-row: span 2 / span 2;
      }
      
      .emr-div2 {
        grid-column: span 2 / span 2;
        grid-row: span 2 / span 2;
        grid-column-start: 3;
      }
      
      .emr-div3 {
        grid-column: span 2 / span 2;
        grid-row: span 2 / span 2;
        grid-row-start: 3;
      }
      
      .emr-div4 {
        grid-column: span 2 / span 2;
        grid-row: span 2 / span 2;
        grid-column-start: 3;
        grid-row-start: 3;
      }
      
      .emr-card-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: rgb(215, 140, 9) !important;
        border-radius: 50%;
        font-weight: 700;
        font-size: 11px;
        color: white;
        margin-right: 6px;
      }
      
      .emr-card-header {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
      }
      
      .emr-card-title {
        font-size: 12px;
        font-weight: 600;
      }
      
      .emr-card-line {
        font-size: 11px;
        line-height: 1.6;
        margin: 2px 0;
      }
      
      .emr-status-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        white-space: nowrap;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        height: 2.25rem;
        padding: 0.5rem 1rem;
        cursor: default;
        border: none;
      }
      
      .emr-status-badge:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transform: translateY(-1px);
      }
      
      .close-message {
        display: none;
      }

      .status-new-record {
        background: rgb(128, 128, 128) !important; /* Gray */
        color: white !important;
      }

      /* ========== LIGHT MODE STYLES ========== */
      html[data-theme-mode="light"] .form-message.blue {
        border: none !important;
        background-color: #f8f9fa !important;
        background-image: linear-gradient(to right bottom, rgba(215, 140, 9, 0.15), #f8f9fa) !important;
        padding: 12px !important;
        border-radius: 6px !important;
      }
      
      html[data-theme-mode="light"] .emr-card-title {
        color: #212529 !important;
      }
      
      html[data-theme-mode="light"] .emr-card-line {
        color: #495057 !important;
      }
      
      /* Light Mode Status Badge Colors */
      html[data-theme-mode="light"] .status-approved {
        background: rgb(46, 184, 92) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-rejected {
        background: rgb(220, 53, 69) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-pending {
        background: rgb(215, 140, 9) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-skip {
        background: rgb(13, 110, 253) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-draft {
        background: rgb(215, 140, 9) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-submitted {
        background: rgb(46, 184, 92) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-cancelled {
        background: rgb(220, 53, 69) !important;
        color: #ffffff !important;
      }

      /* ========== DARK MODE STYLES ========== */
      html[data-theme-mode="dark"] .form-message.blue {
        border: none !important;
        background-color: rgb(50, 50, 50) !important;
        background-image: linear-gradient(to right bottom, rgba(215, 140, 9, 0.2), rgb(50, 50, 50)) !important;
        padding: 12px !important;
        border-radius: 6px !important;
      }
      
      html[data-theme-mode="dark"] .emr-card-title {
        color: #fff !important;
      }
      
      html[data-theme-mode="dark"] .emr-card-line {
        color: #e0e0e0 !important;
      }
      
      /* Dark Mode Status Badge Colors - Darker shades */
      html[data-theme-mode="dark"] .status-approved {
        background: rgb(25, 135, 84) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-rejected {
        background: rgb(176, 42, 55) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-pending {
        background: rgb(180, 117, 7) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-skip {
        background: rgb(10, 88, 202) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-draft {
        background: rgb(180, 117, 7) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-submitted {
        background: rgb(25, 135, 84) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-cancelled {
        background: rgb(176, 42, 55) !important;
        color: #ffffff !important;
      }
    </style>
    
   <div class="emr-quick-guide">
    <div class="emr-grid-parent">

      <!-- DIV 1: Employee Details -->
      <div class="emr-grid-card emr-div1">
        <div class="emr-card-header">
          <div class="emr-card-number">1</div>
          <div class="emr-card-title">Employee Details</div>
        </div>
        <div class="emr-card-line">
          ${data.employee?.employee_number || 'N/A'} -
          ${data.employee?.employee_name || 'N/A'} -
          ${data.employee?.cell_number || 'N/A'}
        </div>
        <div class="emr-card-line">
          ${frm.doc.target_warehouse || 'N/A'} -
          ${data.branch?.branch || 'N/A'},
          ${data.branch?.district || 'N/A'},
          ${data.branch?.state_code || 'N/A'}
        </div>
      </div>

      <!-- DIV 2: Request Details -->
      <div class="emr-grid-card emr-div2">
        <div class="emr-card-header">
          <div class="emr-card-number">2</div>
          <div class="emr-card-title">
          Request Details
           <img src="/assets/sahayog/images/envelope.png" title="Remarks" style="height:17px; width:auto; margin-left:4px; margin-top: -6px; vertical-align: middle;">
          </div>
        </div>
        <div class="emr-card-line">
          ${data.requested_by?.employee_number || 'N/A'} -
          ${data.requested_by?.employee_name || 'N/A'} -
          ${data.requested_by?.cell_number || 'N/A'}
        </div>
        <div class="emr-card-line">
          <span class="emr-status-badge ${div2_badge.class}">${div2_badge.label}</span>
        </div>
      </div>

      <!-- DIV 3: Reporting Person -->
      <div class="emr-grid-card emr-div3">
        <div class="emr-card-header">
          <div class="emr-card-number">3</div>
          <div class="emr-card-title">
          Reporting Person
          <img src="/assets/sahayog/images/envelope.png" title="Remarks" style="height:17px; width:auto; margin-left:4px; margin-top: -6px; vertical-align: middle;">
          </div>
        </div>
        <div class="emr-card-line">
          ${data.reporting_person?.employee_number || 'N/A'} -
          ${data.reporting_person?.employee_name || 'N/A'} -
          ${data.reporting_person?.cell_number || 'N/A'}
        </div>
        <div class="emr-card-line">
          <span class="emr-status-badge ${div3_badge.class}">${div3_badge.label}</span>
        </div>
      </div>

      <!-- DIV 4: HO Officer -->
      <div class="emr-grid-card emr-div4">
        <div class="emr-card-header">
          <div class="emr-card-number">4</div>
          <div class="emr-card-title">
          HO Officer
          <img src="/assets/sahayog/images/envelope.png" title="Remarks" style="height:17px; width:auto; margin-left:4px; margin-top: -6px; vertical-align: middle;">
          </div>
        </div>
        <div class="emr-card-line">
          ${data.ho_officer?.employee_number || 'N/A'} -
          ${data.ho_officer?.employee_name || 'N/A'}
        </div>
        <div class="emr-card-line">
          <span class="emr-status-badge ${div4_badge.class}">${div4_badge.label}</span>
        </div>
      </div>

    </div>
  </div>

  `;
  console.log("request datetime",data.request_datetime)
  console.log("Status from intro data:", data.status);
  
  frm.set_intro(html);
}

// ------------------------------------------------------------------
// RENDER INTRO FALLBACK
// Shows basic intro when data fetch fails
// ------------------------------------------------------------------
function render_intro_fallback(frm) {
  frm.set_intro(__("Unable to load detailed information. Please refresh the page."), "orange");
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
