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

  region_add: function (frm) {
    frm.trigger("toggle_region_mandatory");
  },

  region_remove: function (frm) {
    frm.trigger("toggle_region_mandatory");
  }, // ✅ comma added here

  // toggle_region_mandatory: function (frm) {
  //   let zone_selected = frm.doc.zone && frm.doc.zone.length > 0;
  //   let is_mandatory = zone_selected && !frm.doc.all_regions;

  //   if (frm.fields_dict.region.grid) {
  //     frm.fields_dict.region.grid.set_column_disp(
  //       "region",
  //       "reqd",
  //       is_mandatory,
  //     );
  //   } else {
  //     frm.set_df_property("region", "reqd", is_mandatory);
  //   }
  // },

  enable_preferences: function (frm) {
    if (!frm.doc.enable_preferences) {
      // Clear child tables
      frm.clear_table("product");
      frm.clear_table("source");
      frm.clear_table("zone");
      frm.clear_table("region");
      frm.clear_table("sol_id");

      frm.refresh_fields();

      frappe.msgprint("All preferences cleared.");
    }
  },
  validate: function (frm) {
    let has_preference = false;

    if (
      (frm.doc.zone && frm.doc.zone.length > 0) ||
      (frm.doc.region && frm.doc.region.length > 0) ||
      (frm.doc.product && frm.doc.product.length > 0) ||
      (frm.doc.source && frm.doc.source.length > 0) ||
      (frm.doc.sol_id && frm.doc.sol_id.length > 0)
    ) {
      has_preference = true;
    }

    if (!has_preference) {
      frappe.throw("Select at least one preference before saving.");
    }
  },
});
