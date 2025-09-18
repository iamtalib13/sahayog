frappe.listview_settings['Material Request'] = {
    onload(listview) {
    $("span.sidebar-toggle-btn").hide();
    $(".col-lg-2.layout-side-section").hide();
  },

  refresh(listview) {
    const btn = listview.page.btn_primary;
    if (btn) {
      btn.find("span.hidden-xs").text("Add Inward");
      btn.attr("data-label", "Add Inward");
    }
  },
};
