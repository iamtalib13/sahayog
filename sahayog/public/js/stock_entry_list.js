frappe.listview_settings["Stock Entry"] = {
  onload(listview) {
    listview.page.set_title("Outward List");
    $("span.sidebar-toggle-btn").hide();
    $(".col-lg-2.layout-side-section").hide();
  },

  refresh(listview) {
    const btn = listview.page.btn_primary;
    if (btn) {
      btn.find("span.hidden-xs").text("Add Outward");
      btn.attr("data-label", "Add Outward");
    }
  },
};
