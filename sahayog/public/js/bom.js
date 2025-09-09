frappe.ui.form.on("BOM", {
  setup: function (frm) {},
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
    frm.set_query("item", function () {
      return {
        filters: {
          bom_template: 1,
        },
      };
    });
  },
});
// Child table event handler
frappe.ui.form.on("BOM Item", {
  item_code: function (frm, cdt, cdn) {},
});
