frappe.ui.form.on("Task", {
  refresh: function (frm) {
    frm.trigger("hide_fields");
    frm.trigger("set_readonly_fields");
    frm.trigger("collapsible_false");
    if (
      !frappe.user.has_role("System Manager") &&
      !frappe.user.has_role("Administrator")
    ) {
      frm.set_df_property("sb_depends_on", "hidden", 1);
      frm.set_df_property("description", "hidden", 1);
      frm.set_df_property("expected_time", "hidden", 1);
      frm.set_df_property("progress", "hidden", 1);
      frm.set_df_property("is_milestone", "hidden", 1);
      frm.set_df_property("actual_time", "hidden", 1);
      frm.set_df_property("sb_more_info", "hidden", 1);
      frm.set_df_property("sb_costing", "hidden", 1);

      frm.set_df_property("it_checklist_table", "cannot_add_rows", true); // Hide add row button
      frm.set_df_property("it_checklist_table", "cannot_delete_rows", true); // Hide delete button
      frm.set_df_property("it_checklist_table", "cannot_delete_all_rows", true); // Hide delete all button

      frm.set_df_property(
        "manpower_recruitment_table",
        "cannot_add_rows",
        true
      ); // Hide add row button
      frm.set_df_property(
        "manpower_recruitment_table",
        "cannot_delete_rows",
        true
      ); // Hide delete button
      frm.set_df_property(
        "manpower_recruitment_table",
        "cannot_delete_all_rows",
        true
      ); // Hide delete all button

      frm.set_df_property("lto_training_table", "cannot_add_rows", true); // Hide add row button
      frm.set_df_property("lto_training_table", "cannot_delete_rows", true); // Hide delete button
      frm.set_df_property("lto_training_table", "cannot_delete_all_rows", true); // Hide delete all button

      frm.set_df_property(
        "infrastructure_development_table",
        "cannot_add_rows",
        true
      ); // Hide add row button
      frm.set_df_property(
        "infrastructure_development_table",
        "cannot_delete_rows",
        true
      ); // Hide delete button
      frm.set_df_property(
        "infrastructure_development_table",
        "cannot_delete_all_rows",
        true
      ); // Hide delete all button
    }

    let project = frm.doc.project;

    if (frm.doc.subject == "Task 2 : Letter of Intent") {
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
            console.log("LOI exists for project:", project);
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

    if (
      frm.doc.subject === "Task 4 : Manpower Recruitment" &&
      !frm.doc.is_template
    ) {
      render_manpower_summary(frm);
    }
  },
});

frappe.ui.form.on("Manpower Recruitment Hiring Table", {
  status: function (frm, cdt, cdn) {
    render_manpower_summary(frm); // jab status change ho
  },
  employee_name: function (frm, cdt, cdn) {
    render_manpower_summary(frm); // jab employee_name change ho
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
      estimate_rent: row.estimate_rent,
    });
  });

  let html = `
        <div class="location-album-container">
            <table class="table table-bordered" style="margin:0;">
                <thead>
                    <tr>
                        <th style="width: 150px;">Location Name</th>
                        <th>Location Images</th>
                        <th style="width: 120px;">Estimate Rent<br>(per month)</th>
                        <th style="width: 100px;">Status</th>
                    </tr>
                </thead>
                <tbody>`;

  let row_num = 1;

  for (let location in grouped) {
    if (!location) continue;

    const currentStatus = getCurrentLocationStatus(frm, location);
    const currentRent = getCurrentLocationRent(frm, location);

    html += `
            <tr data-location="${encodeURIComponent(location)}">
              <td>
                <div class="location-header">
                 <textarea
                    class="editable-location location-input"
                    data-location="${encodeURIComponent(location)}"
                    data-old-location="${encodeURIComponent(location)}"
                    style="border: none; background: transparent; width: 100%; font-weight: bold; resize: vertical; min-height: 40px;" spellcheck="false"

                  >${frappe.utils.escape_html(location)}</textarea>
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
                                        <div class="media-overlay" title="See Image"></div>
                                    </a>
                                    <a href="#" data-docname="${
                                      item.docname
                                    }" class="delete-img" title="Delete Image">
                                        <i class="fa fa-trash"></i>
                                    </a>
                                </div>`;
    });
    const encodedLocation = encodeURIComponent(location);

    html += `
            <div class="media-thumbnail upload-thumbnail" title="Add Media" data-location="${encodeURIComponent(
              location
            )}">
                <div class="upload-icon">
                  <i class="fa fa-plus"></i>
                </div>
              </div>
            </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; align-items: start; gap: 4px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 16px; color: #555;">₹</span>
                  <input type="text"
                         class="form-control estimate-rent-input"
                         data-location="${encodeURIComponent(location)}"
                         value="${
                           currentRent ? formatCurrencyInput(currentRent) : ""
                         }"
                         placeholder="Enter rent"
                         style="flex: 1; max-width: 120px;">
                </div>
                <div class="amount-in-words"
                     data-location="${encodedLocation}"
                     style="font-size: 12px; color: #555;">
                     ${
                       currentRent
                         ? numberToWords(parseInt(currentRent)) + " Rupees only"
                         : ""
                     }
                </div>
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
    .find(".location-input")
    .on("change", function () {
      const old_location = decodeURIComponent($(this).data("old-location"));
      const new_location = $(this).val().trim();

      update_location_name_inline(frm, old_location, new_location);
    });

  // Add thumbnail-style upload button click handler
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".upload-thumbnail")
    .on("click", function (e) {
      e.preventDefault();
      const location = decodeURIComponent($(this).data("location"));
      const currentRent = getCurrentLocationRent(frm, location);
      upload_media_files_for_task(frm, location, currentRent);
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

  // Number to words conversion on input change
  // Replace the existing estimate-rent-input event handlers with this:
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".estimate-rent-input")
    .off("input change blur") // Remove any existing handlers
    .on("input", function () {
      const input = $(this);
      const formatted = formatCurrencyInput(input.val());
      if (formatted !== input.val()) {
        // Set cursor position
        const cursorPos = input[0].selectionStart;
        input.val(formatted);
        // Adjust cursor position after formatting
        const diff = formatted.length - input.val().length;
        input[0].setSelectionRange(cursorPos + diff, cursorPos + diff);
      }

      // Update words in real-time
      const encodedLocation = input.data("location");
      const wordSpan =
        frm.fields_dict.custom_location_details_html.$wrapper.find(
          `.amount-in-words[data-location="${CSS.escape(encodedLocation)}"]`
        );

      if (wordSpan.length) {
        const numericValue = parseCurrencyInput(input.val());
        if (numericValue) {
          const amountInWords =
            numberToWords(Math.floor(numericValue)) + " Rupees only";
          wordSpan.text(amountInWords);
        } else {
          wordSpan.text("");
        }
      }
    })
    .on("blur", function () {
      const input = $(this);
      const location = decodeURIComponent(input.data("location"));
      const numericValue = parseCurrencyInput(input.val());

      // Format properly on blur
      input.val(formatCurrencyInput(numericValue));

      // Update the database
      update_rent_for_location(frm, location, numericValue);
    });

  // Apply background color initially and on change
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".status-select")
    .each(function () {
      applyStatusSelectColor(this);
    })
    .on("change", function () {
      applyStatusSelectColor(this);
    });

  function applyStatusSelectColor(selectEl) {
    const val = selectEl.value;
    let bg = "";
    let textColor = "#fff"; // default black

    switch (val) {
      case "Pending":
        bg = "#6c757d";
        break;
      case "Approved":
        bg = "#28a745";
        break;
      case "Rejected":
        bg = "#dc3545";
        break;
      case "Mixed":
        bg = "#ffc107";
        textColor = "#212529"; // black text on yellow
        break;
      default:
        bg = "";
        textColor = "#212529";
        break;
    }

    if (bg) {
      selectEl.style.background = `linear-gradient(${bg}, ${bg})`;
    } else {
      selectEl.style.background = "";
    }

    selectEl.style.color = textColor;
  }

  // Status change handler
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".status-select")
    .on("change", function () {
      const location = decodeURIComponent($(this).data("location"));
      const new_status = $(this).val();

      const $select = $(this);
      $select.prop("disabled", true);

      update_status_for_location(frm, location, new_status).catch(() => {
        // Error handling is done in update_status_for_location
      });
    });
}

// Number to words function
function numberToWords(num) {
  if (!num || isNaN(num)) return "";
  num = parseInt(num);
  if (num === 0) return "Zero";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] + " Hundred " + (n % 100 ? convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand " +
        (n % 1000 ? convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " Lakh " +
        (n % 100000 ? convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      " Crore " +
      (n % 10000000 ? convert(n % 10000000) : "")
    );
  };

  return convert(num).trim();
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

// Helper function to get current location rent
function getCurrentLocationRent(frm, location) {
  const child_table = frm.doc.custom_location_details || [];
  const rents = [
    ...new Set(
      child_table
        .filter((row) => row.location_name === location)
        .map((row) => row.estimate_rent)
    ),
  ];

  // Return the rent value if all records agree, or empty string if mixed/undefined
  return rents.length === 1 ? rents[0] : "";
}

// Add these helper functions somewhere in your code
// Add these helper functions
function formatCurrencyInput(value) {
  if (!value) return "";
  // Convert to number first to remove any existing formatting
  const num = parseFloat(value.toString().replace(/,/g, ""));
  // Format with commas and no decimal places
  return num.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

function parseCurrencyInput(formattedValue) {
  if (!formattedValue) return 0;
  // Remove all non-digit characters
  const numStr = formattedValue.replace(/\D/g, "");
  return parseInt(numStr) || 0;
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
      {
        label: "Estimate Rent",
        fieldname: "estimate_rent",
        fieldtype: "Currency",
        description: "Enter estimated rent for this location (optional)",
      },
    ],
    (values) => {
      if (!values.location_name) return;
      frappe.show_alert(
        { message: __("Preparing uploader..."), indicator: "blue" },
        3
      );
      setTimeout(() => {
        upload_media_files_for_task(
          frm,
          values.location_name,
          values.estimate_rent
        );
      }, 300);
    },
    __("Add New Location"),
    __("Add")
  );
}

function update_location_name_inline(frm, old_location, new_location) {
  if (!new_location || new_location === old_location) return;

  const updates = [];
  (frm.doc.custom_location_details || []).forEach((row) => {
    if (row.location_name === old_location) {
      updates.push(() => {
        return frappe.model.set_value(
          row.doctype,
          row.name,
          "location_name",
          new_location
        );
      });
    }
  });

  if (updates.length === 0) return;

  updates
    .reduce((p, fn) => p.then(fn), Promise.resolve())
    .then(() => {
      frm.refresh_field("custom_location_details");
      render_custom_location_ui_for_task(frm); // re-render
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
}

function update_rent_for_location(frm, location, new_rent) {
  // Ensure new_rent is a number (in case it comes from formatted input)
  const numericRent =
    typeof new_rent === "string" ? parseCurrencyInput(new_rent) : new_rent;

  let updates = [];
  (frm.doc.custom_location_details || []).forEach((row) => {
    if (row.location_name === location && row.estimate_rent != numericRent) {
      updates.push(() => {
        return frappe.model.set_value(
          row.doctype,
          row.name,
          "estimate_rent",
          numericRent
        );
      });
    }
  });

  if (updates.length === 0) return;

  updates
    .reduce((p, fn) => p.then(fn), Promise.resolve())
    .then(() => {
      frm.refresh_field("custom_location_details");
      render_custom_location_ui_for_task(frm);
      return frm.save();
    })
    .then(() => {
      frappe.show_alert(
        { message: __("Rent estimate updated"), indicator: "green" },
        3
      );
    })
    .catch((err) => {
      console.error("Error updating rent:", err);
      frappe.msgprint({
        title: __("Error"),
        message: __("Failed to update rent estimate"),
        indicator: "red",
      });
    });
}

function upload_media_files_for_task(frm, location, estimate_rent) {
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

        // 3. Add child row with updated file_url and estimate rent
        const new_row = frm.add_child("custom_location_details");
        new_row.location_name = location;
        new_row.location_image = updated_file.file_url;
        new_row.estimate_rent = estimate_rent || 0; // default to 0 if undefined
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
  /* Overall Container and Table Styling */
  .location-album-container {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    margin-bottom: 20px;
  }

  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }

  table th {
    font-weight: 600;
    text-align: left;
    padding: 12px 15px;
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: #f8fafc;
    color: #36414c;
    border-bottom: 1px solid #e5e9ed;
  }

  table td {
    background-color: #ffffff;
    padding: 12px 15px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
    transition: background-color 0.2s ease;
  }

  table tr:last-child td {
    border-bottom: none;
  }

  table tr:hover td {
    background-color: #f8fafd;
  }

  /* Column widths */
  table th:first-child,
  table td:first-child {
    width: 180px;
    min-width: 180px;
  }

  table th:nth-child(3),
  table td:nth-child(3) {
    width: 150px;
    min-width: 150px;
  }

  table th:last-child,
  table td:last-child {
    width: 130px;
    min-width: 130px;
  }

  /* Middle column takes remaining space */
  table td:nth-child(2) {
    width: auto;
  }

  /* Location Header Styling */
  .location-header {
    margin-bottom: 8px;
  }

  .editable-location {
    font-size: 13px;
    font-weight: 500;
    width: 100%;
    padding: 8px 10px;
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    resize: vertical;
    min-height: 60px;
    line-height: 1.5;
    transition: all 0.2s;
    color: #36414c;
  }

  .editable-location:focus {
    outline: none;
    background-color: #fff;
    border-color: #5e64ff;
    box-shadow: 0 0 0 2px rgba(94, 100, 255, 0.2);
  }

  /* Media Thumbnails Section */
  .location-images-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    min-height: 54px;
  }

  .media-thumbnail {
    position: relative;
    width: 50px;
    height: 50px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
    transition: all 0.2s ease;
    background: #f9f9f9;
  }

  .media-thumbnail:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
    border-color: #5e64ff;
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
    transition: transform 0.3s ease;
  }

  .media-link:hover video,
  .media-link:hover img {
    transform: scale(1.05);
  }

  .media-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.2), transparent);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .media-thumbnail:hover .media-overlay {
    opacity: 1;
  }

  /* Delete Button */
  .delete-img {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 20px;
    height: 20px;
    background: rgba(255,255,255,0.9);
    color: #ff5858;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s;
    text-decoration: none;
    font-size: 10px;
    border: 1px solid rgba(0,0,0,0.1);
    z-index: 2;
  }

  .media-thumbnail:hover .delete-img {
    opacity: 1;
  }

  .delete-img:hover {
    background: #ff5858;
    color: white;
    transform: scale(1.1);
  }

  /* Upload Thumbnail */
  .upload-thumbnail {
    background-color: #f5f7fa;
    border: 2px dashed #c7d1dd;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #7a8ca5;
    font-size: 18px;
    transition: all 0.2s ease;
  }

  .upload-thumbnail:hover {
    background-color: #ebf0f7;
    border-color: #5e64ff;
    color: #5e64ff;
  }

  .upload-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  /* Status Selector */
  .status-selection-container {
    position: relative;
  }

  .status-select {
    width: 100%;
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid #d1d8e0;
    font-size: 13px;
    appearance: none;
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 12px;
    transition: all 0.2s;
    cursor: pointer;
    color: #36414c;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b778c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-color: #f8f9fa;
  }

  .status-select:focus {
    outline: none;
    border-color: #5e64ff;
    box-shadow: 0 0 0 2px rgba(94, 100, 255, 0.2);
  }

  .status-select option {
    color: #36414c;
    background-color: #fff;
  }

  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: 6px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    background-color: #f8f9fa;
    color: #6b778c;
  }

  .status-badge.pending {
    background-color: #fcefdc;
    color: #f0b429;
  }

  .status-badge.approved {
    background-color: #e3f8e8;
    color: #23a565;
  }

  .status-badge.rejected {
    background-color: #fce8e6;
    color: #f05656;
  }

  .status-badge.mixed {
    background-color: #f0f4f7;
    color: #6b778c;
  }

  /* Add Location Button */
  .add-location-container {
    margin-top: 15px;
    text-align: right;
    padding: 0 15px 15px;
  }

  .add-location-container .btn {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.3px;
    background-color: #5e64ff;
    color: white;
    border: none;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .add-location-container .btn:hover {
    background-color: #4a50d8;
    transform: translateY(-1px);
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }

  /* Rent Input Styling */
  .estimate-rent-input {
    font-size: 13px;
    width: 100%;
    padding: 8px 10px;
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    transition: all 0.2s;
    text-align: right;
    color: #36414c;
  }

  .estimate-rent-input:focus {
    outline: none;
    background-color: #fff;
    border-color: #23a565;
    box-shadow: 0 0 0 2px rgba(35, 165, 101, 0.1);
  }

  /* Remove spinner arrows */
  .estimate-rent-input::-webkit-outer-spin-button,
  .estimate-rent-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  .estimate-rent-input[type="number"] {
    -moz-appearance: textfield;
  }

  /* Amount in Words */
  .amount-in-words {
    font-size: 11px;
    color: #6b778c;
    line-height: 1.4;
    margin-top: 4px;
    font-style: italic;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    table th:first-child,
    table td:first-child {
        width: 120px;
        min-width: 120px;
    }
    
    table th:nth-child(3),
    table td:nth-child(3) {
        width: 100px;
        min-width: 100px;
    }
    
    table th:last-child,
    table td:last-child {
        width: 100px;
        min-width: 100px;
    }
    
    .media-thumbnail {
        width: 40px;
        height: 40px;
    }
    
    .editable-location {
        min-height: 50px;
        font-size: 12px;
    }
  }

  /* Animation for status changes */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .status-select, .status-badge {
    animation: fadeIn 0.3s ease-out;
  }

  /* Custom scrollbar for table container */
  .location-album-container::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  .location-album-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .location-album-container::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
  }

  .location-album-container::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  /* Hover effects for table rows */
  table tr {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  /* Loading state */
  .loading-state {
    position: relative;
    opacity: 0.7;
  }

  .loading-state::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255,255,255,0.7);
    z-index: 1;
    border-radius: 4px;
  }

  /* Status select colors */
  .status-select[value="Pending"] {
    background-color: #fcefdc;
    color: #f0b429;
  }

  .status-select[value="Approved"] {
    background-color: #e3f8e8;
    color: #23a565;
  }

  .status-select[value="Rejected"] {
    background-color: #fce8e6;
    color: #f05656;
  }

  .status-select[value="Mixed"] {
    background-color: #f0f4f7;
    color: #6b778c;
  }
  `;

  frappe.dom.set_style(css);
}
function render_manpower_summary(frm) {
  let total_hirable = frm.doc.manpower_recruitment_table.length || 0;
  let total_hired_or_inprogress = 0;

  (frm.doc.manpower_recruitment_table || []).forEach((row) => {
    if (["Hired", "In-Progress"].includes(row.status) && row.employee_name) {
      total_hired_or_inprogress += 1;
    }
  });

  let remaining = total_hirable - total_hired_or_inprogress;

  let html = `
    <div style="display:flex; gap:20px; margin: 10px 0;">
      <div style="flex:1; text-align:center; border:1px solid #007bff; border-radius:8px; padding:10px;">
        <div style="font-size:14px; color:var(--text-muted);">Hirable</div>
        <div style="font-size:20px; font-weight:600; color:#007bff;">${total_hirable}</div>
      </div>
      <div style="flex:1; text-align:center; border:1px solid #28a745; border-radius:8px; padding:10px;">
        <div style="font-size:14px; color:var(--text-muted);">In-Progress / Hired</div>
        <div style="font-size:20px; font-weight:600; color:#28a745;">${total_hired_or_inprogress}</div>
      </div>
      <div style="flex:1; text-align:center; border:1px solid #dc3545; border-radius:8px; padding:10px;">
        <div style="font-size:14px; color:var(--text-muted);">Remaining</div>
        <div style="font-size:20px; font-weight:600; color:#dc3545;">${remaining}</div>
      </div>
    </div>
  `;

  frm.fields_dict.manpower_summary_html.$wrapper.html(html);
}
