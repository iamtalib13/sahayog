frappe.ui.form.on("Task", {
  refresh: function (frm) {
    frm.trigger("hide_fields");
    frm.trigger("set_readonly_fields");
    frm.trigger("collapsible_false");

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

  onload: function (frm) {},

  async hide_fields(frm) {
    const fields_to_hide = [
      "is_template",
      "is_group",
      "color",
      "parent_task",
      "task_weight",
      "issue",
      "priority",
      "type",
      "sb_depends_on",
    ];

    const allowed_roles = ["System Manager", "Administrator"];

    const user_has_role = allowed_roles.some((role) =>
      frappe.user.has_role(role)
    );

    if (!user_has_role) {
      fields_to_hide.forEach((field) => {
        frm.toggle_display(field, false);
        console.log(`${field} hidden`);
      });
    }
  },

  async set_readonly_fields(frm) {
    const fields_to_readonly = [
      "project",
      "subject",
      "progress",
      "expected_time",
      "is_milestone",
    ];

    const allowed_roles = ["System Manager", "Administrator"];

    const user_has_role = allowed_roles.some((role) =>
      frappe.user.has_role(role)
    );

    if (!user_has_role) {
      fields_to_readonly.forEach((field) => {
        frm.set_df_property(field, "read_only", 1);
        console.log(`${field} set to read-only`);
      });
    }
  },

  async collapsible_false(frm) {
    if (frm.fields_dict["sb_timeline"]) {
      frm.fields_dict["sb_timeline"].collapse(false);
    }
  },
});

// html field
frappe.ui.form.on("Task", {
  refresh: function (frm) {
    if (frm.doc.subject === "Task 1 : Acquisition of the Property") {
      // Render custom UI
      frm.fields_dict.custom_location_details.$wrapper
        .closest(".form-group")
        .hide();
      render_custom_location_ui_for_task(frm);

      // Add CSS
      add_custom_css();
    }
  },
});

// Custom UI render
function render_custom_location_ui_for_task(frm) {
  frm.refresh_field("custom_location_details_html");
  const table = frm.doc.custom_location_details || [];
  const grouped = {};

  table.forEach((row) => {
    if (!row.location_name) return;
    if (!grouped[row.location_name]) grouped[row.location_name] = [];
    grouped[row.location_name].push({
      image: row.location_image,
      name: row.name,
      docname: row.name,
      status: row.status,
    });
  });

  let html = `
        <div class="location-album-container">
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th style="width: 150px;">Location</th>
                        <th>Images</th>
                        <th style="width: 100px;">Status</th>
                    </tr>
                </thead>
                <tbody>`;

  let row_num = 1;

  for (let location in grouped) {
    if (!location) continue;

    const currentStatus = getCurrentLocationStatus(frm, location);

    html += `
                    <tr data-location="${encodeURIComponent(location)}">
                        <td>
                            <div class="location-header">
                                <h5 class="editable-location" data-location="${encodeURIComponent(
                                  location
                                )}">
                                    ${row_num++}. ${frappe.utils.escape_html(
      location
    )}
                                </h5>
                            </div>
                        </td>
                        <td>
                            <div class="location-images-container">`;

    grouped[location].forEach((item) => {
      const file = item.image || "";
      const is_video = file.toLowerCase().endsWith(".mp4");

      html += `
                                <div class="media-thumbnail" data-status="${
                                  item.status
                                }">
                                    <a href="${file}" target="_blank" class="media-link">
                                        ${
                                          is_video
                                            ? `<video src="${file}" width="100%" height="100%" muted></video>`
                                            : `<img src="${file}" width="100%" height="100%" alt="${frappe.utils.escape_html(
                                                item.name
                                              )}">`
                                        }
                                        <div class="media-overlay"></div>
                                    </a>
                                    <a href="#" data-docname="${
                                      item.docname
                                    }" class="delete-img">
                                        <i class="fa fa-trash"></i>
                                    </a>
                                </div>`;
    });

    html += `
                            </div>
                            <div class="location-actions">
                                <button class="btn btn-sm btn-outline-primary upload-images" data-location="${encodeURIComponent(
                                  location
                                )}">
                                    <i class="fa fa-upload"></i> Upload Media
                                </button>
                            </div>
                        </td>
                        <td>
                            <div class="status-selection-container">`;

    if (frappe.user.has_role("Project Manager")) {
      html += `
                                <select class="form-control status-select" data-location="${encodeURIComponent(
                                  location
                                )}">
                                    <option value="Pending" ${
                                      currentStatus === "Pending"
                                        ? "selected"
                                        : ""
                                    }>Pending</option>
                                    <option value="Approved" ${
                                      currentStatus === "Approved"
                                        ? "selected"
                                        : ""
                                    }>Approved</option>
                                    <option value="Rejected" ${
                                      currentStatus === "Rejected"
                                        ? "selected"
                                        : ""
                                    }>Rejected</option>
                                    ${
                                      currentStatus === "Mixed"
                                        ? '<option value="Mixed" selected>Mixed Status</option>'
                                        : ""
                                    }
                                </select>`;
    } else {
      html += `
                                <span class="status-badge ${currentStatus.toLowerCase()}">${currentStatus}</span>`;
    }

    html += `
                            </div>
                        </td>
                    </tr>`;
  }

  html += `
                </tbody>
            </table>
            <div class="add-location-container">
                <button class="btn btn-sm btn-primary" id="add-location">
                    <i class="fa fa-plus"></i> Add New Location
                </button>
            </div>
        </div>`;

  frm.fields_dict.custom_location_details_html.$wrapper.html(html);

  // Event bindings
  frm.fields_dict.custom_location_details_html.$wrapper
    .find("#add-location")
    .on("click", function () {
      add_new_location_for_task(frm);
    });

  // Click handler for editable location names
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".editable-location")
    .on("click", function (e) {
      e.preventDefault();
      const old_location = decodeURIComponent($(this).data("location"));
      edit_location_name_for_task(frm, old_location);
    });

  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".upload-images")
    .on("click", function (e) {
      e.preventDefault();
      const location = decodeURIComponent($(this).data("location"));
      upload_media_files_for_task(frm, location);
    });

  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".delete-img")
    .on("click", function (e) {
      e.preventDefault();
      const docname = $(this).data("docname");

      frappe.confirm(__("Are you sure you want to delete this item?"), () => {
        delete_media_item_for_task(frm, docname);
      });
    });

  // Status change handler
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".status-select")
    .on("change", function () {
      const location = decodeURIComponent($(this).data("location"));
      const new_status = $(this).val();

      // Show loading indicator
      const $select = $(this);
      $select.prop("disabled", true);

      update_status_for_location(frm, location, new_status).catch(() => {
        // Error handling is done in update_status_for_location
      });
    });
}

// Helper function to get current location status
function getCurrentLocationStatus(frm, location) {
  const child_table = frm.doc.custom_location_details || [];
  const statuses = [
    ...new Set(
      child_table
        .filter((row) => row.location_name === location)
        .map((row) => row.status)
    ),
  ];
  return statuses.length === 1 ? statuses[0] : "Mixed";
}

// Function to update status for all items in a location
function update_status_for_location(frm, location, new_status) {
  if (new_status === "Mixed") return Promise.resolve();

  const child_table = frm.doc.custom_location_details || [];
  let updates = [];

  child_table.forEach((row) => {
    if (row.location_name === location && row.status !== new_status) {
      updates.push(() => {
        return frappe.model.set_value(
          row.doctype,
          row.name,
          "status",
          new_status
        );
      });
    }
  });

  if (updates.length === 0) return Promise.resolve();

  // Execute all updates sequentially
  return updates
    .reduce((p, fn) => p.then(fn), Promise.resolve())
    .then(() => {
      frm.refresh_field("custom_location_details");
      render_custom_location_ui_for_task(frm);
      return frm.save();
    })
    .then(() => {
      frappe.show_alert(
        {
          message: __("Status updated for all items in this location"),
          indicator: "green",
        },
        3
      );
    })
    .catch((err) => {
      console.error("Error updating status:", err);
      frappe.msgprint({
        title: __("Error"),
        message: __("Failed to update status"),
        indicator: "red",
      });
      // Re-render to show correct status
      render_custom_location_ui_for_task(frm);
      throw err; // Re-throw to allow caller to handle
    });
}

function add_new_location_for_task(frm) {
  frappe.prompt(
    [
      {
        label: "Location Name",
        fieldname: "location_name",
        fieldtype: "Data",
        reqd: true,
        description: "Enter a name for the new location",
      },
    ],
    (values) => {
      if (!values.location_name) return;
      frappe.show_alert(
        { message: __("Preparing uploader..."), indicator: "blue" },
        3
      );
      setTimeout(() => {
        upload_media_files_for_task(frm, values.location_name);
      }, 300);
    },
    __("Add New Location"),
    __("Add")
  );
}

function edit_location_name_for_task(frm, old_location) {
  frappe.prompt(
    [
      {
        label: "New Location Name",
        fieldname: "new_location_name",
        fieldtype: "Data",
        reqd: true,
        default: old_location,
      },
    ],
    (values) => {
      if (
        !values.new_location_name ||
        values.new_location_name === old_location
      )
        return;

      let updates = [];
      (frm.doc.custom_location_details || []).forEach((row) => {
        if (row.location_name === old_location) {
          updates.push(() => {
            return frappe.model.set_value(
              row.doctype,
              row.name,
              "location_name",
              values.new_location_name
            );
          });
        }
      });

      if (updates.length === 0) return;

      // Execute all updates sequentially
      updates
        .reduce((p, fn) => p.then(fn), Promise.resolve())
        .then(() => {
          frm.refresh_field("custom_location_details");
          render_custom_location_ui_for_task(frm);
          return frm.save();
        })
        .then(() => {
          frappe.show_alert(
            { message: __("Location name updated"), indicator: "green" },
            3
          );
        })
        .catch((err) => {
          console.error("Error updating location:", err);
          frappe.msgprint({
            title: __("Error"),
            message: __("Failed to update location name"),
            indicator: "red",
          });
        });
    },
    __("Edit Location Name"),
    __("Update")
  );
}

function upload_media_files_for_task(frm, location) {
  new frappe.ui.FileUploader({
    allow_multiple: true,
    restrictions: {
      allowed_file_types: ["image/*", "video/mp4"],
    },
    async on_success(file) {
      try {
        // 1. Set file as public
        await frappe.call({
          method: "frappe.client.set_value",
          args: {
            doctype: "File",
            name: file.name,
            fieldname: {
              is_private: 0,
            },
          },
        });

        // 2. Refetch the file to get updated file_url
        const r = await frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "File",
            name: file.name,
          },
        });

        const updated_file = r.message;

        // 3. Add child row with updated file_url
        const new_row = frm.add_child("custom_location_details");
        new_row.location_name = location;
        new_row.location_image = updated_file.file_url; // ✅ updated URL
        new_row.status = "Pending";
        frm.refresh_field("custom_location_details");

        render_custom_location_ui_for_task(frm);
        frm
          .save()
          .then(() => {
            frappe.show_alert(
              {
                message: __("Media uploaded successfully"),
                indicator: "green",
              },
              3
            );
          })
          .catch((err) => {
            console.error("Error saving after upload:", err);
            frappe.msgprint({
              title: __("Upload Error"),
              message: __("Media uploaded but failed to save document"),
              indicator: "red",
            });
          });
        console.log(`Uploaded and attached file: ${updated_file.file_url}`);
      } catch (err) {
        console.error("Error in upload success flow:", err);
        frappe.msgprint(
          __("Failed to attach uploaded media. See console for details.")
        );
      }
    },
    on_error(error) {
      frappe.msgprint({
        title: __("Upload Error"),
        message: error.message || __("An error occurred"),
        indicator: "red",
      });
    },
  });
}

function delete_media_item_for_task(frm, docname) {
  const grid = frm.get_field("custom_location_details").grid;
  const grid_row = grid.grid_rows.find((row) => row.doc.name === docname);

  if (grid_row) {
    // Remove the row directly using the grid_row's remove method
    grid_row.remove();

    // Refresh the field and custom UI
    frm.refresh_field("custom_location_details");
    render_custom_location_ui_for_task(frm);

    // Save the form after deletion
    frm
      .save()
      .then(() => {
        frappe.show_alert(
          { message: __("Item deleted successfully"), indicator: "green" },
          3
        );
      })
      .catch((err) => {
        console.error("Save failed:", err);
        frappe.msgprint({
          title: __("Error"),
          message: __("Item removed but save failed."),
          indicator: "red",
        });
      });
  } else {
    frappe.msgprint({
      title: __("Not Found"),
      message: __("Row not found in grid."),
      indicator: "red",
    });
  }
}

function add_custom_css() {
  const css = ` 
        .location-album-container {
            border-radius: 8px;       
        }
        table {
            width: 100%;
            table-layout: auto;
        }
        
        table th, table td {
            vertical-align: top;
            padding: 10px;
        }
        
        /* Fixed width columns */
        table th:first-child,
        table td:first-child {
            width: 100px;
        }
        
        table th:last-child,
        table td:last-child {
            width: 100px;
        }
        
        /* Make middle column take remaining space */
        table td:nth-child(2) {
            width: auto;
            min-width: 300px;
        }
        
        .location-header {
            margin-bottom: 10px;
        }
        
        .editable-location {
            cursor: pointer;
            color: #1a5276;
            font-weight: 500;
            transition: all 0.2s;
            padding: 8px;
            border-radius: 4px;
        }
        
        .editable-location:hover {
            background-color: #ebf5fb;
            text-decoration: underline;
        }
        
        .location-images-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .media-thumbnail {
            position: relative;
            width: 50px;
            height: 50px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #ddd;
            transition: all 0.2s;
        }
        
        .media-thumbnail:hover {
            transform: scale(1.05);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .media-link {
            display: block;
            width: 100%;
            height: 100%;
        }
        
        .media-link video,
        .media-link img {
            object-fit: cover;
            width: 100%;
            height: 100%;
        }
        
        .media-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.1);
            transition: all 0.2s;
        }
        
        .media-link:hover .media-overlay {
            background: rgba(0,0,0,0.3);
        }
        
        .delete-img {
            position: absolute;
            top: 5px;
            right: 5px;
            width: 20px;
            height: 20px;
            background: rgba(255,255,255,0.8);
            color: #e74c3c;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.2s;
            text-decoration: none;
        }
        
        .media-thumbnail:hover .delete-img {
            opacity: 1;
        }
        
        .delete-img:hover {
            background: #e74c3c;
            color: white;
        }
        
        .location-actions {
            text-align: right;
            margin-top: 10px;
        }
        
        .status-select {
            width: 100%;
            padding: 5px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            color: white;
        }
        
        .status-badge.pending {
            background: #6c757d;
        }
        
        .status-badge.approved {
            background: #28a745;
        }
        
        .status-badge.rejected {
            background: #dc3545;
        }
        
        .status-badge.mixed {
            background: #ffc107;
            color: #212529;
        }

        .status-select:disabled {
            opacity: 0.7;
            cursor: wait;
        }

        .add-location-container {
            margin-top: 20px;
            text-align: right;
        }
    `;

  frappe.dom.set_style(css);
}
