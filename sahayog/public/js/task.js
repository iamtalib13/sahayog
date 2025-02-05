frappe.ui.form.on("Task", {
  refresh: function (frm) {
    frm.trigger("hide_fields");
    frm.trigger("set_readonly_fields");
    frm.trigger("collapsible_false");
    frm.trigger("populate_summary_html");
    let project = frm.doc.project;

    if (frm.doc.subject == "Task 2: Letter of Intent") {
      // Add the Create LOI button
      let createButton = frm.add_custom_button(__("Create LOI"), function () {
        frappe.new_doc("Letter of Intent", null, {
          project: project,
          docstatus: 0, // Draft status
        });
      });

      // Fetch the Letter of Intent record based on the project
      frappe.db
        .get_value("Letter of Intent", { project: project }, "name")
        .then((response) => {
          if (response && response.message && response.message.name) {
            // Hide or disable the Create LOI button
            createButton.hide(); // Or use `createButton.disable();` if you prefer to disable instead of hide
            if (frm.doc.status != "Template") {
              // Add the View LOI button
              frm.add_custom_button(__("View LOI: " + project), function () {
                frappe.set_route(
                  "Form",
                  "Letter of Intent",
                  response.message.name
                );
              });
            }
          }
        });
    }
  },
  onload: function (frm) {
    frm.trigger("populate_summary_html");
  },

  async hide_fields(frm) {
    // Array of fieldnames to hide
    const fields_to_hide = [
        "is_template", "is_group", "color", "parent_task",
        "task_weight", "issue", "priority", "type",
        "sb_depends_on", "custom_location_details"
    ]; // 👈 Add your field names here

    // Array of roles allowed to see these fields
    const allowed_roles = ["System Manager", "Administrator"]; // 👈 Add your allowed roles here

    // Check if the user has any of the allowed roles
    const user_has_role = allowed_roles.some(role => frappe.user.has_role(role));

    if (!user_has_role) {
        // Loop through the array and hide each field
        fields_to_hide.forEach(field => {
            frm.toggle_display(field, false); // Hide the field
            console.log(`${field} hidden`); // Log the hidden field
        });
    }
},


async set_readonly_fields(frm) {
  // Fields to make read-only
  const fields_to_readonly = [
      "project", "subject", "progress","expected_time","is_milestone"
  ]; 

  // Roles allowed to edit these fields
  const allowed_roles = ["System Manager", "Administrator"];

  // Check if the user has any of the allowed roles
  const user_has_role = allowed_roles.some(role => frappe.user.has_role(role));

  if (!user_has_role) {
      fields_to_readonly.forEach(field => {
          frm.set_df_property(field, "read_only", 1);
          console.log(`${field} set to read-only`);
      });
  }
},
  async populate_summary_html(frm) {
    frappe.call({
      method: "sahayog.doc_events.task.get_location_details_html",
      callback: function (r) {
        if (r.message) {
          frm.fields_dict["custom_location_details_html"].html(r.message);
        }
      },
    });
  },
  async collapsible_false(frm) {
    if (frm.fields_dict["sb_timeline"]) {
        frm.fields_dict["sb_timeline"].collapse(false);
    }
},

});
