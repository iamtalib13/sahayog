// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent Activation Call Log", {
  refresh(frm) {
    frm.trigger("hide_sidebar_options");

    // Only trigger agent and trainer if they have values
    if (frm.doc.agent) {
      frm.trigger("load_agent_details");
    }
    if (frm.doc.trainer) {
      frm.trigger("show_trainer_name");
    }
  },

  hide_sidebar_options(frm) {
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
  },

  wants_to_stay: function (frm) {
    if (frm.doc.wants_to_stay === 1) {
      // Clear other checkboxes
      frm.set_value("want_to_exit", 0);
      frm.set_value("exited", 0);

      frm.set_value("amount", "");
    }
  },

  want_to_exit: function (frm) {
    if (frm.doc.want_to_exit === 1) {
      // Clear other checkboxes
      frm.set_value("wants_to_stay", 0);
      frm.set_value("exited", 0);
      frm.set_value("amount", "");
    }
  },

  exited: function (frm) {
    if (frm.doc.exited === 1) {
      // Clear other checkboxes
      frm.set_value("wants_to_stay", 0);
      frm.set_value("want_to_exit", 0);
      frm.set_value("amount", "");

      // Show popup only if agent is selected and date_of_exit is not already set
      // if (frm.doc.agent && !frm.doc.date_of_exit) {
      //   frappe.prompt(
      //     [
      //       {
      //         fieldname: "exit_date",
      //         fieldtype: "Date",
      //         label: "Date of Exit",
      //         reqd: 1,
      //         default: frappe.datetime.nowdate(),
      //       },
      //     ],
      //     function (values) {
      //       if (values.exit_date) {
      //         frm.set_value("date_of_exit", values.exit_date);
      //       } else {
      //         frm.set_value("exited", 0);
      //         frappe.msgprint("Please select Date of Exit.");
      //       }
      //     },
      //     "Enter Date of Exit",
      //     "Submit"
      //   );
      // }
    } else {
      // Clear date_of_exit when unchecked
      frm.set_value("date_of_exit", "");
    }
  },

  agent: function (frm) {
    // Clear all related fields first

    // Clear HTML wrappers
    frm.fields_dict.agent_details_html.$wrapper.html("");
    frm.fields_dict.branch_details_html.$wrapper.html("");

    // Reset phone number field state
    frm.set_df_property("agent_phone_number", "read_only", 0);

    // Load agent details if agent is selected
    if (frm.doc.agent) {
      frm.trigger("load_agent_details");
    } else {
      frm.fields_dict.agent_details_html.$wrapper.html(
        `<div style="color: #888; font-size: 13px;">No agent selected.</div>`
      );
    }
  },

  load_agent_details: function (frm) {
    if (!frm.doc.agent) return;

    frappe.db.get_doc("Agent", frm.doc.agent).then((agent) => {
      // Handle phone number
      if (agent.phone_number) {
        frm.set_value("agent_phone_number", agent.phone_number);
        frm.set_df_property("agent_phone_number", "read_only", 1);
      } else {
        frm.set_df_property("agent_phone_number", "read_only", 0);
      }

      // Set date of joining from creation_date
      if (agent.creation_date) {
        frm.set_value("date_of_joining", agent.creation_date);
      }

      // Display agent name
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

      // Fetch and display branch details
      if (agent.branch_code) {
        frappe.db
          .get_value("Sahayog Branch", { sol_id: agent.branch_code }, [
            "district",
            "branch",
          ])
          .then((res) => {
            const district = res?.message?.district || "-";
            const branch = res?.message?.branch || agent.branch_name || "-";

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
      }
    });
  },

  trainer: function (frm) {
    frm.trigger("show_trainer_name");
  },

  show_trainer_name: function (frm) {
    if (frm.doc.trainer) {
      frappe.db.get_value("User", frm.doc.trainer, ["full_name"]).then((r) => {
        if (r && r.message && r.message.full_name) {
          const fullName = r.message.full_name;
          frm.fields_dict.trainer.df.description = `Employee Name: <b>${frappe.utils.escape_html(
            fullName
          )}</b>`;
          frm.refresh_field("trainer");
        }
      });
    } else {
      frm.fields_dict.trainer.df.description = "Trainer not assigned.";
      frm.refresh_field("trainer");
    }
  },
});
