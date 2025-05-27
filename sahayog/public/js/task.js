frappe.ui.form.on("Task", {
  refresh: function(frm) {
    if (frm.doc.subject === "Task 1: Acquisition of the Property") {
        // Render custom UI
        frm.fields_dict.custom_location_details.$wrapper.closest('.form-group').hide();
        render_custom_location_ui_for_task(frm);

        // Add CSS
        add_custom_css();

        // Set up event handler for delete
        setup_delete_handler_for_task(frm);
    }
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

  onload: function (frm) {
  },

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
      "sb_depends_on"
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

// Delete handler
function setup_delete_handler_for_task(frm) {
  $(document).off('click.delete_handler_task').on('click.delete_handler_task', '.delete-img', function(e) {
      e.preventDefault();
      const docname = $(this).data('docname');
      delete_media_item_for_task(frm, docname);
  });
}

// Custom UI render
function render_custom_location_ui_for_task(frm) {
  const table = frm.doc.custom_location_details || [];
  const grouped = {};
  const user_roles = frappe.user_roles || [];
  const current_user = frappe.session.user;

  const is_admin = user_roles.includes("Administrator");
  const is_project_manager = user_roles.includes("Project Manager");
  const is_pm_only = is_project_manager && !is_admin;
  const is_other_non_admin = !is_admin && !is_project_manager;

  table.forEach(row => {
      if (!row.location_name) return;
      if (!grouped[row.location_name]) grouped[row.location_name] = [];
      grouped[row.location_name].push({
          image: row.location_image,
          name: row.name,
          docname: row.name,
          status: row.status
      });
  });

  let html = `
      <div class="location-album-container">
          <div class="location-album-header">`;

  // Add New Location button visible for Admin & Other Non-PM users only
  if (is_admin || is_other_non_admin) {
      html += `
          <button class="btn btn-sm btn-primary" id="add-location">
              <i class="fa fa-plus"></i> Add New Location
          </button>`;
  }

  html += `</div><div class="location-gallery">`;

  let row_num = 1;

  for (let location in grouped) {
      if (!location) continue;

      const currentStatus = getCurrentLocationStatus(frm, location);

      html += `
          <div class="location-block" data-location="${encodeURIComponent(location)}">
              <div class="location-header">
                  <h5>${row_num++}. ${frappe.utils.escape_html(location)}</h5>`;

      // Status dropdown only visible & enabled for PM only & Admin
      if (is_pm_only || is_admin) {
          html += `
              <div class="location-status">
                  <select class="form-control status-select status-button" data-location="${encodeURIComponent(location)}">
                      <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                      <option value="Approved" ${currentStatus === 'Approved' ? 'selected' : ''}>Approved</option>
                      <option value="Rejected" ${currentStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
                      ${currentStatus === 'Mixed' ? '<option value="Mixed" selected>Mixed Status</option>' : ''}
                  </select>
              </div>`;
      } else {
          // Other non-admin non-PM users see readonly badge (no dropdown)
          html += `
              <div class="location-status">
                <div class="status-badge ${currentStatus.toLowerCase()}">${currentStatus}</div>
              </div>`;
      }

      // Edit location button visible only to Admin & Other Non-PM users (NOT PM only)
      if (is_admin || is_other_non_admin) {
          html += `
              <button class="btn btn-xs btn-default edit-location" data-location="${encodeURIComponent(location)}">
                  <i class="fa fa-edit"></i> Edit Location
              </button>`;
      }

      html += `</div><div class="location-images-container">`;

      grouped[location].forEach(item => {
          const file = item.image || "";
          const is_video = file.toLowerCase().endsWith('.mp4');

          html += `
              <div class="media-thumbnail" data-status="${item.status}">
                  <a href="${file}" target="_blank" class="media-link">
                      ${is_video
                          ? `<video src="${file}" width="100%" height="100%" muted></video>`
                          : `<img src="${file}" width="100%" height="100%" onerror="this.src='/assets/frappe/images/image_not_found.png'">`
                      }
                      <div class="media-overlay"></div>
                  </a>`;

          // Delete icon visible only to Admin & Other Non-PM users (NOT PM only)
          if (is_admin || is_other_non_admin) {
              html += `
                  <a href="#" data-docname="${item.docname}" class="delete-img">
                      <i class="fa fa-trash"></i>
                  </a>`;
          }

          // Status badge per image (always visible)
          html += `<div class="status-badge ${item.status.toLowerCase()}">${item.status}</div>
              </div>`;
      });

      html += `</div>`;

      // Upload images button visible only to Admin & Other Non-PM users (NOT PM only)
      if (is_admin || is_other_non_admin) {
          html += `
              <div class="location-actions">
                  <button class="btn btn-sm btn-outline-primary upload-images" data-location="${encodeURIComponent(location)}">
                      <i class="fa fa-upload"></i> Upload Media
                  </button>
              </div>`;
      }

      html += `</div>`;
  }

  html += `</div></div>`;
  frm.fields_dict.custom_location_details_html.$wrapper.html(html);

  // EVENT BINDINGS

  // Add/Edit/Upload/Delete only for Admin & Other Non-PM users
  if (is_admin || is_other_non_admin) {
      frm.fields_dict.custom_location_details_html.$wrapper.find('#add-location').on('click', function () {
          add_new_location_for_task(frm);
      });

      frm.fields_dict.custom_location_details_html.$wrapper.find('.edit-location').on('click', function (e) {
          e.preventDefault();
          const old_location = decodeURIComponent($(this).data('location'));
          edit_location_name_for_task(frm, old_location);
      });

      frm.fields_dict.custom_location_details_html.$wrapper.find('.upload-images').on('click', function (e) {
          e.preventDefault();
          const location = decodeURIComponent($(this).data('location'));
          upload_media_files_for_task(frm, location);
      });

      frm.fields_dict.custom_location_details_html.$wrapper.find('.delete-img').on('click', function (e) {
          e.preventDefault();
          const docname = $(this).data('docname');
          delete_image_from_task(frm, docname);
      });
  }

  // Status change event only for PM only & Admin
  if (is_pm_only || is_admin) {
      frm.fields_dict.custom_location_details_html.$wrapper.find('.status-select').on('change', function () {
          const location = decodeURIComponent($(this).data('location'));
          const new_status = $(this).val();
          const $select = $(this);
          $select.prop('disabled', true);

          update_status_for_location(frm, location, new_status)
              .catch(() => {
                  // Error handling inside update_status_for_location
              });
      });
  }
}

// Helper function to get current location status
function getCurrentLocationStatus(frm, location) {
  const child_table = frm.doc.custom_location_details || [];
  const statuses = [...new Set(child_table
      .filter(row => row.location_name === location)
      .map(row => row.status)
  )];
  return statuses.length === 1 ? statuses[0] : 'Mixed';
}

// Function to update status for all items in a location
function update_status_for_location(frm, location, new_status) {
  if (new_status === 'Mixed') return Promise.resolve();
  
  const child_table = frm.doc.custom_location_details || [];
  let updates = [];
  
  child_table.forEach(row => {
      if (row.location_name === location && row.status !== new_status) {
          updates.push(() => {
              return frappe.model.set_value(row.doctype, row.name, 'status', new_status);
          });
      }
  });
  
  if (updates.length === 0) return Promise.resolve();
  
  // Execute all updates sequentially
  return updates.reduce((p, fn) => p.then(fn), Promise.resolve())
      .then(() => {
          frm.refresh_field('custom_location_details');
          render_custom_location_ui_for_task(frm);
          return frm.save();
      })
      .then(() => {
          frappe.show_alert({ message: __('Status updated for all items in this location'), indicator: 'green' }, 3);
      })
      .catch((err) => {
          console.error('Error updating status:', err);
          frappe.msgprint({ 
              title: __('Error'), 
              message: __('Failed to update status'), 
              indicator: 'red' 
          });
          // Re-render to show correct status
          render_custom_location_ui_for_task(frm);
          throw err; // Re-throw to allow caller to handle
      });
}

function add_new_location_for_task(frm) {
  frappe.prompt([{
      label: 'Location Name',
      fieldname: 'location_name',
      fieldtype: 'Data',
      reqd: true,
      description: 'Enter a name for the new location'
  }], (values) => {
      if (!values.location_name) return;
      frappe.show_alert({ message: __('Preparing uploader...'), indicator: 'blue' }, 3);
      setTimeout(() => {
          upload_media_files_for_task(frm, values.location_name);
      }, 300);
  }, __('Add New Location'), __('Add'));
}

function edit_location_name_for_task(frm, old_location) {
  frappe.prompt([{
      label: 'New Location Name',
      fieldname: 'new_location_name',
      fieldtype: 'Data',
      reqd: true,
      default: old_location
  }], (values) => {
      if (!values.new_location_name || values.new_location_name === old_location) return;

      let updates = [];
      (frm.doc.custom_location_details || []).forEach(row => {
          if (row.location_name === old_location) {
              updates.push(() => {
                  return frappe.model.set_value(row.doctype, row.name, 'location_name', values.new_location_name);
              });
          }
      });

      if (updates.length === 0) return;

      // Execute all updates sequentially
      updates.reduce((p, fn) => p.then(fn), Promise.resolve())
          .then(() => {
              frm.refresh_field('custom_location_details');
              render_custom_location_ui_for_task(frm);
              return frm.save();
          })
          .then(() => {
              frappe.show_alert({ message: __('Location name updated'), indicator: 'green' }, 3);
          })
          .catch((err) => {
              console.error('Error updating location:', err);
              frappe.msgprint({ 
                  title: __('Error'), 
                  message: __('Failed to update location name'), 
                  indicator: 'red' 
              });
          });
  }, __('Edit Location Name'), __('Update'));
}

function upload_media_files_for_task(frm, location) {
  new frappe.ui.FileUploader({
      allow_multiple: true,
      restrictions: {
          allowed_file_types: ['image/*', 'video/mp4']
      },
      on_success(file) {
          const new_row = frm.add_child('custom_location_details');
          new_row.location_name = location;
          new_row.location_image = file.file_url;
          new_row.status = 'Pending';
          frm.refresh_field('custom_location_details');
      },
      on_upload_complete() {
          render_custom_location_ui_for_task(frm);
          frm.save()
              .then(() => {
                  frappe.show_alert({ message: __('Media uploaded successfully'), indicator: 'green' }, 3);
              })
              .catch((err) => {
                  console.error('Error saving after upload:', err);
                  frappe.msgprint({ 
                      title: __('Upload Error'), 
                      message: __('Media uploaded but failed to save document'), 
                      indicator: 'red' 
                  });
              });
      },
      on_error(error) {
          frappe.msgprint({ 
              title: __('Upload Error'), 
              message: error.message || __('An error occurred'), 
              indicator: 'red' 
          });
      }
  });
}

function delete_media_item_for_task(frm, docname) {
  frappe.confirm(__('Are you sure you want to delete this item?'), () => {
      const grid = frm.get_field('custom_location_details').grid;
      const grid_row = grid.grid_rows.find(row => row.doc.name === docname);
      if (grid_row) {
          grid_row.remove();
          frm.refresh_field('custom_location_details');
          render_custom_location_ui_for_task(frm);
          frm.save()
              .then(() => {
                  frappe.show_alert({ message: __('Item deleted'), indicator: 'green' }, 3);
              })
              .catch((err) => {
                  console.error('Error deleting item:', err);
                  frappe.msgprint({ 
                      title: __('Error'), 
                      message: __('Failed to delete item'), 
                      indicator: 'red' 
                  });
                  render_custom_location_ui_for_task(frm);
              });
      }
  });
}

function add_custom_css() {
  const css = `
      .location-album-container {
          padding: 15px;
      }
      
      .location-album-header {
          margin-bottom: 20px;
      }
      
      .location-block {
          margin-bottom: 30px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #e5e5e5;
      }
      
      .location-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          gap: 10px;
      }
      
      .location-header h5 {
          margin: 0;
          flex: 1;
      }
      
      .location-status {
          min-width: 150px;
      }
      
      .location-status select {
          height: 28px;
          padding: 3px 6px;
          font-size: 12px;
      }
      
      .location-images-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 15px;
      }
      
      .media-thumbnail {
          position: relative;
          width: 70px;
          height: 70px;
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
      }
      
      .status-badge {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          font-size: 10px;
          text-align: center;
          padding: 2px;
          color: white;
          background: #6c757d;
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

      .status-select:disabled {
          opacity: 0.7;
          cursor: wait;
      }
      .status-button {
          appearance: none;
          background-color: #f1f3f5;
          color: #212529;
          border: 1px solid #ced4da;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          width: 100%;
      }
      
      .status-button:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
      }
      
      .status-button:focus {
          outline: none;
          border-color: #5c9ded;
          box-shadow: 0 0 0 3px rgba(92, 157, 237, 0.2);
      }
      
      .status-button:disabled {
          background-color: #f8f9fa;
          color: #adb5bd;
          border-color: #dee2e6;
          cursor: not-allowed;
      }`;
  
  frappe.dom.set_style(css);
}