frappe.ui.form.on("Purchase Receipt", {
  refresh: function (frm) {
    frm.trigger("hide_sidebar");

    var cur_page = frappe.ui.get_cur_page();
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
  hide_sidebar: function (frm) {
    $("span.sidebar-toggle-btn").hide();
    $(".col-lg-2.layout-side-section").hide();
  },
});
