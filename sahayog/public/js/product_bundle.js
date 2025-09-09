frappe.ui.form.on("Product Bundle", {
  refresh: function (frm) {
    frm.trigger("sidebar");
    frm.trigger("customize_fields");
    if (frappe.session.user !== "Administrator") {
    }
  },

  sidebar: function (frm) {
    $("span.sidebar-toggle-btn").hide();
    $(".col-lg-2.layout-side-section").hide();
  },

  customize_fields: function (frm) {
    //hide field about field
    frm.set_df_property("about", "hidden", 1);
    frm.set_df_property("description", "hidden", 1);

    //relabel fields
    frm.set_df_property("new_item_code", "label", "BOM Template");
    frm.set_query("new_item_code", function () {
      return {
        filters: {
          bom_template: 1,
          is_stock_item: 0,
        },
      };
    });
  },
});
// Child table event handler
frappe.ui.form.on("Product Bundle Item", {
  item_code: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.item_code) {
      frappe.db.get_value("Item", row.item_code, "item_group").then((r) => {
        if (r.message && r.message.item_group) {
          frappe.model.set_value(cdt, cdn, "item_group", r.message.item_group);
        }
      });
    }
  },
});
