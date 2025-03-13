// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt


frappe.ui.form.on("Issue Register", {
  refresh: function (frm) {},

  onload: function (frm) {
    set_module_query(frm);
  },

  team: function (frm) {
    set_module_query(frm); // Update query when team field changes
  },
});

function set_module_query(frm) {
  frm.set_query("module", function () {
    return {
      filters: {
        team: frm.doc.team || "", // Dynamically filter by the team field
      },
    };
  });
}

