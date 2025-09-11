frappe.ui.form.on("Purchase Receipt", {
  refresh: function (frm) {
    if (cur_page && cur_page.set_title) {
      cur_page.set_title("Inward Form");
    }

    if (frm.page) {
      frm.page.set_title("Inward Form");
    }
  },

  onload: function (frm) {
    if (frm.page) {
      frm.page.set_title("Inward Form");
    }
  },
});
