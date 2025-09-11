frappe.listview_settings["Purchase Receipt"] = {
  onload(listview) {
    listview.page.set_title("Inward List");
    $("span.sidebar-toggle-btn").hide();
    $(".col-lg-2.layout-side-section").hide();
  },
};
