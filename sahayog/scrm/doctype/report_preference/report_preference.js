frappe.ui.form.on("Report Preference", {
  refresh: function (frm) {
    frm.trigger("toggle_region_mandatory");
  },
  all_regions: function (frm) {
    frm.trigger("toggle_region_mandatory");
  },
  zone_add: function (frm) {
    frm.trigger("toggle_region_mandatory");
  },
  zone_remove: function (frm) {
    frm.trigger("toggle_region_mandatory");
  },
  toggle_region_mandatory: function (frm) {
    // If all_regions is NOT checked, and zone is selected, then region is mandatory
    let is_mandatory = (frm.doc.zone && frm.doc.zone.length > 0 && !frm.doc.all_regions);
    frm.set_df_property("region", "reqd", is_mandatory);
  },
  region_add: function (frm) {
    frm.trigger("toggle_region_mandatory");
  },
  region_remove: function (frm) {
    frm.trigger("toggle_region_mandatory");
  }
});
