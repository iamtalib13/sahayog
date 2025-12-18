// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent Activation Call Log", {
  refresh(frm) {
    frm.trigger("hide_sidebar_options");
    // Refresh on load also
    if (frm.doc.agent) {
      frm.trigger("agent");
    }
    if (frm.doc.trainer) {
      frm.trigger("show_trainer_name");
    }

    // Hide date_of_exit on form load
    frm.toggle_display("date_of_exit", 0);
    // NEW: Show or hide amount field based on wants_to_stay
frm.toggle_display("amount", frm.doc.wants_to_stay === 1);
  },
  before_save: function (frm) {

  },
  hide_sidebar_options(frm) {
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
  },
  // wants_to_stay checkbox par click karne par
  // wants_to_stay checkbox par click karne par
wants_to_stay: function (frm) {
  if (frm.doc.wants_to_stay === 1) {
    // Show amount field if wants_to_stay is checked
    frm.toggle_display("amount", true);
    // Clear the amount field if wants_to_stay is checked
    frm.set_value("amount", "");
  } else {
    // Hide amount field if wants_to_stay is unchecked
    frm.toggle_display("amount", false);
    // Reset the amount value when hidden
    frm.set_value("amount", "");
  }

  // Clear other checkboxes when wants_to_stay is checked
  if (frm.doc.wants_to_stay === 1) {
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
  // exited: function (frm) {
  //   if (frm.doc.exited === 1) {
  //     // dusre do checkboxes ko uncheck karo
  //     frm.set_value("wants_to_stay", 0);
  //     frm.set_value("want_to_exit", 0);

  //     // Check if agent is selected
  //     if (frm.doc.agent) {
  //       // Show date of exit popup
  //       frappe.prompt(
  //         [
  //           {
  //             fieldname: "exit_date",
  //             fieldtype: "Date",
  //             label: "Date of Exit",
  //             reqd: 1,
  //             default: frappe.datetime.nowdate(),
  //           },
  //         ],
  //         function (values) {
  //           // Set the date when user submits popup
  //           frm.set_value("date_of_exit", values.exit_date);
  //           frm.toggle_display("date_of_exit", 1);
  //           frm.refresh_field("date_of_exit");
  //         },
  //         "Enter Date of Exit",
  //         "Submit"
  //       );
  //     } else {
  //       // If no agent selected, just clear date_of_exit
  //       frm.set_value("date_of_exit", "");
  //       frm.toggle_display("date_of_exit", 0);
  //     }
  //   } else {
  //     // Clear date_of_exit when exited is unchecked
  //     frm.set_value("date_of_exit", "");
  //     frm.toggle_display("date_of_exit", 0);
  //   }
  // },

  // // NEW: Handle date_of_exit visibility
  // date_of_exit: function (frm) {
  //   if (frm.doc.date_of_exit) {
  //     frm.toggle_display("date_of_exit", 1);
  //   } else {
  //     frm.toggle_display("date_of_exit", 0);
  //   }
  // },


   // exited checkbox par click karne par
    exited: function (frm) {
    if (frm.doc.exited === 1) {
      // Uncheck other two checkboxes if exited is checked
      frm.set_value("wants_to_stay", 0);
      frm.set_value("want_to_exit", 0);

      // Check if agent is selected
      if (frm.doc.agent) {
        // Before showing the popup, check if date_of_exit is already set
        if (!frm.doc.date_of_exit) {
          // Show the date of exit popup only if the date_of_exit is not set
          frappe.prompt(
            [
              {
                fieldname: "exit_date",
                fieldtype: "Date",
                label: "Date of Exit",
                reqd: 1,
                default: frappe.datetime.nowdate(),
              },
            ],
            function (values) {
              // Set the date when user submits the popup
              frm.set_value("date_of_exit", values.exit_date);
              frm.toggle_display("date_of_exit", 1);
              frm.refresh_field("date_of_exit");

              // Check if the date is selected after popup submission
              if (!frm.doc.date_of_exit) {
                // If no date was selected, uncheck the exited checkbox
                frm.set_value("exited", 0);
                frappe.msgprint("Please select Date of Exit.");
              }
            },
            "Enter Date of Exit",
            "Submit"
          );
        }
      } else {
        // If no agent selected, just clear date_of_exit
        frm.set_value("date_of_exit", "");
        frm.toggle_display("date_of_exit", 1);  // Keep date_of_exit visible when exited is checked
        frm.refresh_field("date_of_exit");
      }
    } else {
      // Clear date_of_exit when exited is unchecked
      frm.set_value("date_of_exit", "");
      frm.toggle_display("date_of_exit", 0);  // Hide date_of_exit when exited is unchecked
    }
  },

  agent: function (frm) {
    if (frm.doc.agent) {
      frappe.db.get_doc("Agent", frm.doc.agent).then((agent) => {
        if (agent.phone_number) {
          // Overwrite only if value came from Agent
          frm.set_value("agent_phone_number", agent.phone_number);
          frm.set_df_property("agent_phone_number", "read_only", 1);
        } else {
          // Only clear and make editable if field is currently empty
          if (!frm.doc.agent_phone_number) {
            frm.set_value("agent_phone_number", "");
          }
          frm.set_df_property("agent_phone_number", "read_only", 0);
        }
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
      // frm.set_value("agent_phone_number", "");
      frm.set_df_property("agent_phone_number", "read_only", 0);
    }

    // NEW: Hide date_of_exit when agent changes
    frm.set_value("date_of_exit", "");
    frm.toggle_display("date_of_exit", 0);
  },
  show_trainer_name: function (frm) {
    // 👇 Add this block for showing trainer's full name in description
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
      // Agar trainer blank hai
      frm.fields_dict.trainer.df.description = "Trainer not assigned.";
      frm.refresh_field("trainer");
    }
  },

  agent_phone_number: function (frm) {
  // Validate only when field is editable (not fetched from Agent)
  const df = frm.get_docfield("agent_phone_number");
  if (df && !df.read_only) {
    const phone = (frm.doc.agent_phone_number || "").trim();

    if (!phone) {
      frappe.msgprint("Please enter Agent Phone Number.");
      frappe.validated = false;
      return;
    }

    // Only digits and exactly 10 characters
    const phone_regex = /^\d{10}$/;
    if (!phone_regex.test(phone)) {
      frappe.msgprint(
        "Agent Phone Number must be exactly 10 digits and contain only numbers."
      );
      frappe.validated = false;
      return;
    }
  }
},
});
