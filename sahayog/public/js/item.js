frappe.ui.form.on("Item", {
  refresh: function (frm) {},

  item_group: function (frm) {
    frm.set_query("item_group", function () {
      return {
        filters: {
          is_group: 0,
        },
      };
    });
  },
});
