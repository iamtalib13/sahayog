// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent Activation Call Log", {
  refresh(frm) {
    frm.trigger("hide_sidebar_options");

    // Exclude agents with Exited calling_status from dropdown
    frm.set_query("agent", () => ({
      filters: [["Agent", "calling_status", "!=", "Exited"]]
    }));

    if (frm.doc.agent) {
      frm.trigger("load_agent_details");
    }
    if (frm.doc.trainer) {
      frm.trigger("show_trainer_name");
    }
    // Only toggle visibility on refresh — don't set values, which would dirty the form
    if (frm.doc.reply_type) {
      frm.trigger("_apply_reply_type_display");
    }
  },

  hide_sidebar_options(frm) {
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
  },

  wants_to_stay: function (frm) {
    if (frm.doc.wants_to_stay === 1) {
      frm.set_value("want_to_exit", 0);
      frm.set_value("exited", 0);
      frm.set_value("amount", "");
      frm.set_value("collection_date", "");
      frm.set_value("attachment", "");
    }
  },

  want_to_exit: function (frm) {
    if (frm.doc.want_to_exit === 1) {
      frappe.confirm(
        `Agent <b>${frappe.utils.escape_html(frm.doc.agent || "this SS")}</b> will be marked as <b>Want to Exit</b>
        and removed from the inactive SS pool permanently.<br><br>Are you sure?`,
        () => {
          // confirmed — clear other checkboxes
          frm.set_value("wants_to_stay", 0);
          frm.set_value("exited", 0);
          frm.set_value("amount", "");
          frm.set_value("collection_date", "");
          frm.set_value("attachment", "");
        },
        () => {
          // cancelled — uncheck want_to_exit
          frm.set_value("want_to_exit", 0);
        }
      );
    } else {
      frm.set_value("date_of_exit", "");
    }
  },

  exited: function (frm) {
    if (frm.doc.exited === 1) {
      frappe.confirm(
        `Agent <b>${frappe.utils.escape_html(frm.doc.agent || "this SS")}</b> will be marked as <b>Exited</b>
        and removed from the inactive SS pool permanently.<br><br>Are you sure?`,
        () => {
          // confirmed — clear other checkboxes
          frm.set_value("wants_to_stay", 0);
          frm.set_value("want_to_exit", 0);
          frm.set_value("amount", "");
          frm.set_value("collection_date", "");
          frm.set_value("attachment", "");
        },
        () => {
          // cancelled — uncheck exited
          frm.set_value("exited", 0);
        }
      );
    } else {
      frm.set_value("date_of_exit", "");
    }
  },

  reply_type: function (frm) {
    frm.trigger("_apply_reply_type_display");

    const followupTypes = ["Follow-up Required", "Call Back Later"];
    const checkboxTypes = ["Positive", "Negative"];
    const reply = frm.doc.reply_type;

    // Clear checkboxes when switching away from Positive/Negative
    if (!checkboxTypes.includes(reply)) {
      frm.set_value("wants_to_stay", 0);
      frm.set_value("exited", 0);
      frm.set_value("amount", "");
      frm.set_value("collection_date", "");
      frm.set_value("attachment", "");
      frm.set_value("date_of_exit", "");
    }

    // Clear follow_up_date when switching away from follow-up types
    if (!followupTypes.includes(reply)) {
      frm.set_value("follow_up_date", "");
    }
  },

  _apply_reply_type_display: function (frm) {
    const checkboxTypes = ["Positive", "Negative"];
    const needsCheckbox = checkboxTypes.includes(frm.doc.reply_type);

    frm.toggle_display("status_section", needsCheckbox);
    frm.toggle_display("active_details_column", needsCheckbox);
    frm.toggle_display("column_break_ekar", needsCheckbox);
    frm.toggle_display("wants_to_stay", needsCheckbox);
    frm.toggle_display("amount", needsCheckbox);
    frm.toggle_display("collection_date", needsCheckbox);
    frm.toggle_display("attachment", needsCheckbox);
    frm.toggle_display("exited", needsCheckbox);
    frm.toggle_display("want_to_exit", needsCheckbox);
    frm.toggle_display("date_of_exit", needsCheckbox);
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

    const isNew = frm.is_new();

    frappe.db.get_doc("Agent", frm.doc.agent).then((agent) => {
      // Only set values on new docs — for saved docs just update display
      if (isNew) {
        if (agent.phone_number) {
          frm.set_value("agent_phone_number", agent.phone_number);
          frm.set_df_property("agent_phone_number", "read_only", 1);
        } else {
          frm.set_df_property("agent_phone_number", "read_only", 0);
        }
        if (agent.creation_date) {
          frm.set_value("date_of_joining", agent.creation_date);
        }
      } else {
        frm.set_df_property(
          "agent_phone_number",
          "read_only",
          agent.phone_number ? 1 : 0
        );
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
