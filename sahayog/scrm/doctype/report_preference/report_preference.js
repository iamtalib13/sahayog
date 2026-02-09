// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Report Preference", {
// 	refresh(frm) {

// 	},
// });
// Report Preference Client Script
frappe.ui.form.on("Report Preference", {
  refresh: function (frm) {
    frm.trigger("all_regions");
  },
  all_regions: function (frm) {
    // Agar "All Regions" checked hai (1), to region field hide/disabled karein
    // Yahan 'region' aapka table field name hona chahiye
    frm.set_df_property("region", "hidden", frm.doc.all_regions);
  },
});
