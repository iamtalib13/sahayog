// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent Activation Call Log", {
  refresh(frm) {
    // Refresh on load also
    if (frm.doc.agent) {
      frm.trigger("agent");
    }
  },

  // wants_to_stay checkbox par click karne par
  wants_to_stay: function (frm) {
    if (frm.doc.wants_to_stay === 1) {
      // dusre do checkboxes ko uncheck karo
      frm.set_value("want_to_exit", 0);
      frm.set_value("exited", 0);
    }
  },

  // want_to_exit checkbox par click karne par
  want_to_exit: function (frm) {
    if (frm.doc.want_to_exit === 1) {
      // dusre do checkboxes ko uncheck karo
      frm.set_value("wants_to_stay", 0);
      frm.set_value("exited", 0);
    }
  },

  // exited checkbox par click karne par
  exited: function (frm) {
    if (frm.doc.exited === 1) {
      // dusre do checkboxes ko uncheck karo
      frm.set_value("wants_to_stay", 0);
      frm.set_value("want_to_exit", 0);
    }
  },
  agent: function (frm) {
    if (frm.doc.agent) {
      frappe.db.get_doc("Agent", frm.doc.agent).then((agent) => {
        // Get district + branch from Sahayog Branch using sol_id (branch_code)
        frappe.db
          .get_value("Sahayog Branch", { sol_id: agent.branch_code }, [
            "district",
            "branch",
          ])
          .then((res) => {
            const district = res?.message?.district || "-";
            const branch = res?.message?.branch || agent.branch_name || "-";

            // Show Agent Details (Agent Name only)
            frm.fields_dict.agent_details_html.$wrapper.html(`
              <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px;">
                  <div style="flex: 1 1 200px;">
                      <label style="font-weight: 500; color: #555; margin-bottom: -1.5rem;">Agent Name</label>
                      <div style="background: #f5f5f5; padding: 6px 10px; border-radius: 7px; margin-top: 1px;">
                          ${frappe.utils.escape_html(agent.agent_name || "-")}
                      </div>
                  </div>
              </div>
          `);

            // Show Branch Details (Branch Code, Branch Name, District)
            frm.fields_dict.branch_details_html.$wrapper.html(`
              <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px;">
                  
                  <div style="flex: 1 1 200px;">
                      <label style="font-weight: 500; color: #555; margin-bottom: -1.5rem;">Branch Code</label>
                      <div style="background: #f5f5f5; padding: 6px 10px; border-radius: 7px; margin-top: 1px;">
                          ${frappe.utils.escape_html(agent.branch_code || "-")}
                      </div>
                  </div>

                  <div style="flex: 1 1 200px;">
                      <label style="font-weight: 500; color: #555; margin-bottom: -1.5rem;">Branch Name</label>
                      <div style="background: #f5f5f5; padding: 6px 10px; border-radius: 7px; margin-top: 1px;">
                          ${frappe.utils.escape_html(branch)}
                      </div>
                  </div>

                  <div style="flex: 1 1 200px;">
                      <label style="font-weight: 500; color: #555; margin-bottom: -1.5rem;">District</label>
                      <div style="background: #f5f5f5; padding: 6px 10px; border-radius: 7px; margin-top: 1px;">
                          ${frappe.utils.escape_html(district)}
                      </div>
                  </div>

              </div>
          `);
          });
      });
    } else {
      frm.fields_dict.agent_details_html.$wrapper.html(
        `<div style="color: #888; font-size: 13px;">No agent selected.</div>`
      );
      frm.fields_dict.branch_details_html.$wrapper.html("");
    }
  },
});
