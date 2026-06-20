frappe.listview_settings["Sahayog Branch"] = {
  onload(listview) {
    // Hide sidebar elements
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();

    listview.page.add_inner_button(__("Sync Finacle Branch"), () => {
      frappe.call({
        method: "sahayog.sahayog.doctype.sahayog_branch.sahayog_branch.auto_create_sahayog_branches_from_finacle",
        freeze: true,
        freeze_message: __("Branch update is in progress. Please wait..."),
        callback(r) {
          if (!r.exc) listview.refresh();
        },
      });
    });
  },
};
