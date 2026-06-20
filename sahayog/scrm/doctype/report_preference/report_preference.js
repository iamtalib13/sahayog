frappe.ui.form.on("Report Preference", {
  refresh: function (frm) {
    frm.trigger("toggle_region_mandatory");

    if (frm.is_new()) {
      frm.add_custom_button("Search User", function () {
        let d = new frappe.ui.Dialog({
          title: "Search User",
          fields: [
            {
              label: "Search User",
              fieldname: "search_text",
              fieldtype: "Data",
              reqd: 1,
            },
            {
              fieldname: "results",
              fieldtype: "HTML",
            },
          ],
        });

        // ✅ Real-time search: Har keypress par update hoga
        d.fields_dict.search_text.$input.on("input", function () {
          let value = d.get_value("search_text");

          if (!value || value.length < 1) {
            d.fields_dict.results.$wrapper.html("");
            return;
          }

          frappe.call({
            method:
              "sahayog.scrm.doctype.report_preference.report_preference.search_user",
            args: { search_text: value },
            callback: function (r) {
              let results = r.message || [];
              let html =
                "<ul style='list-style:none; padding:0; margin-top:10px; border:1px solid #d1d8dd; border-radius:4px;'>";

              // Highlight regex: Jo type kiya hai use mark karne ke liye
              let regex = new RegExp(`(${value})`, "gi");

              results.forEach((user) => {
                let highlightedName = user.name.replace(
                  regex,
                  "<mark style='background:#fff2ac; padding:0;'>$1</mark>",
                );
                let fullName = user.full_name || "";
                let highlightedFullName = fullName.replace(
                  regex,
                  "<mark style='background:#fff2ac; padding:0;'>$1</mark>",
                );

                html += `
                <li style="padding:10px; border-bottom:1px solid #f0f0f0; cursor:pointer;"
                    onmouseover="this.style.backgroundColor='#f9f9f9'"
                    onmouseout="this.style.backgroundColor='transparent'"
                    onclick="cur_frm.set_value('user', '${user.name}'); cur_dialog.hide();">
                    <span style="font-weight:bold;">${highlightedName}</span> 
                    <span style="color:#8d99a6; margin-left:10px;">- ${highlightedFullName}</span>
                </li>`;
              });

              html += "</ul>";
              d.fields_dict.results.$wrapper.html(html);
            },
          });
        });

        d.show();
      });
    }

    // Add "Clear" button to clear already set sol_id
    frm.add_custom_button(__("Clear"), function () {
      frm.clear_table("sol_id");
      frm.refresh_field("sol_id");
      frappe.show_alert({
        message: __("SOL IDs cleared."),
        indicator: "green",
      });
    });
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
});
