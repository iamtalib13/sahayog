frappe.ui.form.on("Task", {
  refresh: function (frm) {
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

            // Add the View LOI button
            frm.add_custom_button(__("View LOI: " + project), function () {
              frappe.set_route(
                "Form",
                "Letter of Intent",
                response.message.name
              );
            });
          }
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
});
