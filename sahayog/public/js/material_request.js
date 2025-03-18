frappe.ui.form.on("Material Request", {
  refresh: function (frm) {
    // Make 'description' field mandatory for all existing rows in child table
    cur_frm.fields_dict.items.grid.toggle_reqd("description", true);
    frm.refresh_field("items");
    frm.toggle_reqd("set_warehouse", true);
  },

  onload: function (frm) {
    frm.trigger("store_query");
    frm.trigger("branch_query");
    frm.trigger("project_query");
    frm.toggle_reqd("set_warehouse", true);
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
});

frappe.ui.form.on("Material Request Item", {
  item_code: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    row.description = ""; // Blank the description
    frm.refresh_field("items"); // Refresh the child table
  },
  form_render(frm, cdt, cdn) {
    // Get the current child table row document
    let row = locals[cdt][cdn];
    if (row) {
      cur_frm.fields_dict.items.grid.toggle_reqd("description", true);
    } else {
      // console.error("Row is undefined.");
    }
  },
});
