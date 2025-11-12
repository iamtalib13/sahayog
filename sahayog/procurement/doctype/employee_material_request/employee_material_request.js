frappe.ui.form.on("Employee Material Request", {
  refresh: function (frm) {
    // Apply status indicator
    apply_status_indicator(frm);

    // Setup action buttons
    setup_action_buttons(frm);

    // Show approval timeline
    if (frm.doc.docstatus > 0 || frm.doc.workflow_state) {
      show_approval_timeline(frm);
    }

    // Set query filters
    set_query_filters(frm);

    // Show amendment button for cancelled
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
    // Set default values
    if (frm.is_new()) {
      frm.set_value("request_date", frappe.datetime.get_today());
      frm.set_value("status", "Draft");
    }
  },

  employee: function (frm) {
    // Auto-fetch reporting person from employee
    if (frm.doc.employee && !frm.doc.reporting_person) {
      frappe.call({
        method: "frappe.client.get_value",
        args: {
          doctype: "Employee",
          filters: { name: frm.doc.employee },
          fieldname: ["reports_to", "employee_name"],
        },
        callback: function (r) {
          if (r.message && r.message.reports_to) {
            // Get user ID of reporting employee
            frappe.call({
              method: "frappe.client.get_value",
              args: {
                doctype: "Employee",
                filters: { name: r.message.reports_to },
                fieldname: ["user_id", "employee_name"],
              },
              callback: function (resp) {
                if (resp.message && resp.message.user_id) {
                  frm.set_value("reporting_person", resp.message.user_id);
                  frappe.show_alert(
                    {
                      message: __("Reporting Person set to: {0}", [
                        resp.message.employee_name,
                      ]),
                      indicator: "green",
                    },
                    5
                  );
                }
              },
            });
          } else {
            frappe.msgprint(__("No reporting person found for this employee"));
          }
        },
      });
    }
  },

  request_type: function (frm) {
    // Update labels and visibility based on request type
    update_table_labels(frm);
    toggle_table_visibility(frm);

    // Warn if items exist
    let has_items =
      (frm.doc.asset_items && frm.doc.asset_items.length > 0) ||
      (frm.doc.stock_items && frm.doc.stock_items.length > 0);

    if (has_items) {
      frappe.msgprint({
        title: __("Warning"),
        message: __("Changing Request Type may require you to re-enter items"),
        indicator: "orange",
      });
    }
  },

  before_workflow_action: function (frm) {
    // Validate before workflow actions
    let action = frm.selected_workflow_action;

    if (action === "Submit for Approval") {
      if (!frm.doc.reporting_person) {
        frappe.throw(__("Please set Reporting Person before submitting"));
        return false;
      }

      let has_items =
        (frm.doc.asset_items && frm.doc.asset_items.length > 0) ||
        (frm.doc.stock_items && frm.doc.stock_items.length > 0);

      if (!has_items) {
        frappe.throw(__("Please add at least one item"));
        return false;
      }
    }

    return true;
  },

  before_submit: function (frm) {
    return new Promise((resolve, reject) => {
      frappe.confirm(
        __(
          "Are you sure you want to submit this Material Request? It cannot be edited after submission."
        ),
        () => resolve(),
        () => reject()
      );
    });
  },

  after_cancel: function (frm) {
    frappe.show_alert(
      {
        message: __("Material Request has been cancelled"),
        indicator: "red",
      },
      5
    );
  },
});

// Asset Items Child Table
frappe.ui.form.on("Asset Request Item", {
  item_code: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.item_code) {
      // Fetch item details
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Item",
          name: row.item_code,
        },
        callback: function (r) {
          if (r.message) {
            let item = r.message;
            frappe.model.set_value(cdt, cdn, "item_name", item.item_name);
            frappe.model.set_value(cdt, cdn, "uom", item.stock_uom);
            frappe.model.set_value(cdt, cdn, "description", item.description);

            // Set quantity to 1 for assets
            if (!row.quantity || row.quantity === 0) {
              frappe.model.set_value(cdt, cdn, "quantity", 1);
            }
          }
        },
      });
    }
  },

  asset: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.asset && frm.doc.request_type === "Return") {
      // Fetch asset details for return
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
});

// Stock Items Child Table
frappe.ui.form.on("Stock Request Item", {
  item_code: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.item_code) {
      // Fetch item details
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Item",
          name: row.item_code,
        },
        callback: function (r) {
          if (r.message) {
            let item = r.message;
            frappe.model.set_value(cdt, cdn, "item_name", item.item_name);
            frappe.model.set_value(cdt, cdn, "uom", item.stock_uom);
            frappe.model.set_value(cdt, cdn, "description", item.description);
            frappe.model.set_value(
              cdt,
              cdn,
              "is_consumable",
              item.is_stock_item && !item.has_serial_no
            );
          }
        },
      });

      // Get available stock
      if (row.warehouse) {
        get_available_stock(frm, cdt, cdn);
      }
    }
  },

  warehouse: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.item_code && row.warehouse) {
      get_available_stock(frm, cdt, cdn);
    }
  },

  quantity: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    // Warn if quantity exceeds available
    if (row.quantity > row.available_qty && frm.doc.request_type !== "Return") {
      frappe.msgprint({
        title: __("Stock Warning"),
        message: __(
          "Row {0}: Requested quantity ({1}) exceeds available stock ({2})",
          [row.idx, row.quantity, row.available_qty]
        ),
        indicator: "orange",
      });
    }
  },
});

// Helper Functions
function apply_status_indicator(frm) {
  const status_colors = {
    Draft: "gray",
    "Pending Reporting Person Approval": "orange",
    "Pending HO Approval": "blue",
    Approved: "green",
    "In Progress": "light-blue",
    "Partially Completed": "yellow",
    Completed: "darkgreen",
    Rejected: "red",
    Cancelled: "darkred",
  };

  if (frm.doc.status && status_colors[frm.doc.status]) {
    frm.page.set_indicator(frm.doc.status, status_colors[frm.doc.status]);
  }
}

function show_approval_timeline(frm) {
  if (frm.doc.workflow_state || frm.doc.docstatus > 0) {
    let html =
      '<div class="approval-timeline" style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px;">';
    html += '<h5 style="margin-bottom: 10px;">Approval Timeline</h5>';

    // Requested By
    html +=
      '<div style="margin: 8px 0;"><b>Requested By:</b> ' +
      frm.doc.requested_by;
    if (frm.doc.request_datetime) {
      html += " on " + frappe.datetime.str_to_user(frm.doc.request_datetime);
    }
    html += "</div>";

    // Reporting Person
    if (frm.doc.reporting_person) {
      html +=
        '<div style="margin: 8px 0;"><b>1. Reporting Person:</b> ' +
        frm.doc.reporting_person +
        " - ";

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
      html += "</div>";
    }

    // Head Office Officer
    html += '<div style="margin: 8px 0;"><b>2. Head Office Officer:</b> ';

    if (frm.doc.head_office_officer) {
      html += frm.doc.head_office_officer + " - ";
    }

    if (frm.doc.ho_officer_status === "Approved") {
      html += '<span class="indicator-pill green">✓ Approved</span>';
      if (frm.doc.ho_officer_approval_date) {
        html +=
          " on " +
          frappe.datetime.str_to_user(frm.doc.ho_officer_approval_date);
      }
    } else if (frm.doc.ho_officer_status === "Rejected") {
      html += '<span class="indicator-pill red">✗ Rejected</span>';
    } else {
      html += '<span class="indicator-pill orange">⏱ Pending</span>';
    }
    html += "</div>";

    html += "</div>";

    // Add to dashboard
    frm.dashboard.add_section(html);
  }
}

function setup_action_buttons(frm) {
  // Only for submitted documents
  if (frm.doc.docstatus === 1) {
    // Create Stock Entry button for HO Officer
    if (
      frappe.user.has_role("Head Office Officer") &&
      frm.doc.status === "Approved"
    ) {
      if (frm.doc.asset_items && frm.doc.asset_items.length > 0) {
        frm
          .add_custom_button(
            __("Process Assets"),
            function () {
              create_stock_entry_dialog(frm, "asset");
            },
            __("Actions")
          )
          .addClass("btn-primary");
      }

      if (frm.doc.stock_items && frm.doc.stock_items.length > 0) {
        frm
          .add_custom_button(
            __("Process Stock Items"),
            function () {
              create_stock_entry_dialog(frm, "stock");
            },
            __("Actions")
          )
          .addClass("btn-primary");
      }
    }

    // View stock entries
    if (has_stock_entries(frm)) {
      frm.add_custom_button(__("View Stock Entries"), function () {
        view_stock_entries(frm);
      });
    }
  }
}

function set_query_filters(frm) {
  // Asset items - only fixed assets
  frm.set_query("item_code", "asset_items", function () {
    return {
      filters: {
        is_fixed_asset: 1,
        disabled: 0,
      },
    };
  });

  // Asset filter for return type
  frm.set_query("asset", "asset_items", function (doc, cdt, cdn) {
    let row = locals[cdt][cdn];
    let filters = {
      status: ["in", ["Issued", "In Use"]],
    };

    if (row.item_code) {
      filters["item_code"] = row.item_code;
    }

    return { filters: filters };
  });

  // Stock items - only stock items, not fixed assets
  frm.set_query("item_code", "stock_items", function () {
    return {
      filters: {
        is_stock_item: 1,
        is_fixed_asset: 0,
        disabled: 0,
      },
    };
  });

  // Employee filter - only active
  frm.set_query("assigned_to_employee", "asset_items", function (doc) {
    return {
      filters: {
        status: "Active",
      },
    };
  });
}

function update_table_labels(frm) {
  let asset_label = "Asset Items";
  let stock_label = "Stock Items";

  if (frm.doc.request_type === "Return") {
    asset_label = "Assets to Return";
    stock_label = "Stock Items to Return";
  } else if (frm.doc.request_type === "Issue") {
    stock_label = "Consumable Items to Issue";
  }

  frm.fields_dict["asset_items"].df.label = asset_label;
  frm.fields_dict["stock_items"].df.label = stock_label;
  frm.refresh_fields();
}

function toggle_table_visibility(frm) {
  // Hide asset table for Issue type
  if (frm.doc.request_type === "Issue") {
    frm.set_df_property("asset_items", "hidden", 1);
  } else {
    frm.set_df_property("asset_items", "hidden", 0);
  }
}

function get_available_stock(frm, cdt, cdn) {
  let row = locals[cdt][cdn];

  if (row.item_code && row.warehouse) {
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
}

function has_stock_entries(frm) {
  let has_entries = false;

  (frm.doc.asset_items || []).forEach((item) => {
    if (item.stock_entry) has_entries = true;
  });

  (frm.doc.stock_items || []).forEach((item) => {
    if (item.stock_entry) has_entries = true;
  });

  return has_entries;
}

function view_stock_entries(frm) {
  frappe.route_options = {
    custom_material_request: frm.doc.name,
  };
  frappe.set_route("List", "Stock Entry");
}

function create_stock_entry_dialog(frm, item_type) {
  frappe.confirm(
    __("Create Stock Entry for {0}?", [
      item_type === "asset" ? "Asset Items" : "Stock Items",
    ]),
    function () {
      frappe.call({
        method: "your_app.api.create_stock_entry_from_request",
        args: {
          material_request: frm.doc.name,
          item_type: item_type,
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
        error: function (r) {
          frappe.msgprint(__("Error creating Stock Entry"));
        },
      });
    }
  );
}
