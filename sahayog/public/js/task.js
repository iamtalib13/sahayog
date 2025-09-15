frappe.ui.form.on("Task", {
  refresh: function (frm) {
    frm.trigger("hide_fields");
    if (frm.doc.subject == "Vendor Allocation") {
      frm.trigger("supplier_allocation");
    }
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

      // Filter options for the 'status' field
      let allowed_status = ["Open", "Working", "Overdue", "Completed"]; // options visible to normal users
      frm.set_df_property("status", "options", allowed_status.join("\n"));

      // Hide sidebar
      $(".layout-side-section").hide();
      $(".sidebar-toggle-btn").hide();
      // $(".form-assignments").hide();
      // $(".form-shared").hide();
      // $(".form-tags").hide();
      // $(".form-attachments").hide();
      // $(".form-sidebar-stats").hide();
      // $(".list-unstyled.sidebar-menu.text-muted").hide();
    }

    let project = frm.doc.project;

    if (frm.doc.subject == "Letter of Intent") {
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

  async supplier_allocation(frm) {
    frm.set_intro(""); // Clear any existing intro
    if (!frm.doc.project) {
      frm.set_intro("Please select a Project first.", "orange");
      return;
    }

    // Fetch all Material Requests linked to this project
    let mr_list = await frappe.db.get_list("Material Request", {
      fields: ["name", "custom_supplier"],
      filters: {
        custom_project: frm.doc.project,
      },
    });

    if (mr_list.length > 0) {
      // Build intro with clickable supplier + MR links
      let html = mr_list
        .map((mr) => {
          let supplier_link = mr.custom_supplier
            ? `<a href="#Form/Supplier/${mr.custom_supplier}" onclick="frappe.set_route('Form','Supplier','${mr.custom_supplier}'); return false;">
                        ${mr.custom_supplier}
                   </a>`
            : "No Supplier";

          return `${supplier_link} | MR: <a href="#Form/Material Request/${mr.name}">${mr.name}</a>`;
        })
        .join("<br>");

      frm.set_intro(
        `Material Requests created for this Project:<br>${html}`,
        "green"
      );
    } else {
      frm.set_intro("No Material Request created with any supplier.", "orange");
    }

    // Add custom button
    frm.add_custom_button("Allocate Vendor & Create MR", async () => {
      const dialog = new frappe.ui.Dialog({
        title: __("Allocate Vendor & Create Material Request"),
        fields: [
          {
            fieldname: "product_bundle",
            fieldtype: "Link",
            label: __("Product Bundle"),
            options: "Product Bundle",
            reqd: 1,
          },
          {
            fieldname: "supplier",
            fieldtype: "Link",
            label: __("Vendor"),
            options: "Supplier",
            reqd: 1,
          },
        ],
        primary_action_label: __("Create Material Request"),
        primary_action: async function (values) {
          if (!values.product_bundle) {
            frappe.msgprint("Please select a Product Bundle.");
            return;
          }

          if (!values.supplier) {
            frappe.msgprint("Please select a Vendor.");
            return;
          }

          try {
            await frappe.call({
              method: "sahayog.api.task.allocate_suppliers_and_create_mr",
              args: {
                project_name: frm.doc.project,
                supplier: values.supplier,
                product_bundle: values.product_bundle,
              },
              callback: function (r) {
                if (r.message.status === "exists") {
                  frappe.msgprint({
                    title: __("Already Exists"),
                    message: r.message.message,
                    indicator: "orange",
                  });
                } else if (r.message.status === "created") {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "green",
                  });
                  frm.trigger("supplier_allocation");
                }
              },
            });

            dialog.hide();
          } catch (err) {
            frappe.msgprint({
              title: __("Error"),
              message: err.message,
              indicator: "red",
            });
          }
        },
      });

      dialog.show();
    });
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

frappe.ui.form.on("Manpower Recruitment Hiring Table", {
  status: function (frm, cdt, cdn) {
    render_manpower_summary(frm); // jab status change ho
  },
  employee_name: function (frm, cdt, cdn) {
    render_manpower_summary(frm); // jab employee_name change ho
  },
});

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

// ========== CUSTOM LOCATION DETAILS FOR TASK ==========
frappe.ui.form.on("Task", {
  refresh: function (frm) {
    if (shouldRenderCustomUI(frm)) {
      handleCustomLocationVisibility(frm);
      renderCustomLocationUIForTask(frm);
      addCustomCSS();
    }

    if (!frm.doc.name || frm.doc.__islocal) return;
    setupUserAssignment(frm, "Task", frm.doc.name);

    if (
      frm.doc.subject === "Acquisition of the Property" &&
      !frm.doc.is_template
    ) {
      if (
        frappe.session.user != "Administrator" &&
        !frappe.user.has_role("System Manager")
      ) {
        frm.fields_dict.custom_location_details.$wrapper
          .closest(".form-group")
          .hide();
      }
    }

    if (frm.doc.subject === "Manpower Recruitment" && !frm.doc.is_template) {
      render_manpower_summary(frm);
    }
  },
});

// ========== HELPER FUNCTIONS ==========

function shouldRenderCustomUI(frm) {
  return (
    frm.doc.subject === "Acquisition of the Property" && !frm.doc.is_template
  );
}

function handleCustomLocationVisibility(frm) {
  const isRestrictedUser =
    frappe.session.user !== "Administrator" &&
    !frappe.user.has_role("System Manager");

  if (isRestrictedUser) {
    frm.fields_dict.custom_location_details.$wrapper
      .closest(".form-group")
      .hide();
  }
}

// ========== MAIN RENDERING FUNCTION ==========

function renderCustomLocationUIForTask(frm) {
  frm.refresh_field("custom_location_details_html");

  const table = frm.doc.custom_location_details || [];
  const groupedLocations = groupLocationsByLocationName(table);

  if (Object.keys(groupedLocations).length === 0) {
    renderEmptyState(frm);
    return;
  }

  const html = buildLocationTableHTML(frm, groupedLocations);
  frm.fields_dict.custom_location_details_html.$wrapper.html(html);

  bindEventHandlers(frm);
}

function groupLocationsByLocationName(table) {
  const grouped = {};

  table.forEach((row) => {
    if (!row.location_name) return;

    if (!grouped[row.location_name]) {
      grouped[row.location_name] = [];
    }

    grouped[row.location_name].push({
      ...row,
      docname: row.name,
      image: row.location_image,
    });
  });

  return grouped;
}

function renderEmptyState(frm) {
  const html = `
    <div class="empty-state">
      <div class="empty-state-icon">
        <i class="fa fa-map-marker"></i>
      </div>
      <div class="empty-state-text">
        <h4>No Locations Added</h4>
        <p>Click the button below to add your first location</p>
      </div>
      <div class="add-location-container">
        <button class="btn btn-sm btn-primary" id="add-location">
          <i class="fa fa-plus"></i> Add New Location
        </button>
      </div>
    </div>
  `;

  frm.fields_dict.custom_location_details_html.$wrapper.html(html);
  bindAddLocationHandler(frm);
}

// ========== TABLE RENDERING FUNCTIONS ==========

function buildLocationTableHTML(frm, groupedLocations) {
  let html = `
    <div class="location-album-container">
      <table class="table table-bordered" style="margin:0;">
        <thead>
          <tr>
            <th style="width: 150px;">Location Name &<br>Status</th>
            <th style="width: 150px;">Location Images</th>
            <th style="width: 150px;">Owner Name</th>
            <th style="width: 150px;">Owner Contact</th>
            <th style="width: 200px;">Location Address</th>
            <th style="width: 120px;">Carpet Area (sq.ft)</th>
            <th style="width: 80px;">Floor</th>
            <th style="width: 120px;">Estimate Rent<br>(per month)</th>
            <th style="width: 120px;">Security Deposit</th>
            <th style="width: 100px;">Actions</th>
          </tr>
        </thead>
        <tbody>`;

  for (let location in groupedLocations) {
    if (!location) continue;
    html += buildLocationRowHTML(frm, location, groupedLocations[location]);
  }

  html += `
        </tbody>
      </table>
      </div>
      <div class="add-location-container" style="margin-bottom:10px; text-align:left; padding-top: 10px;">
        <button class="btn btn-sm btn-primary" id="add-location">
          <i class="fa fa-plus"></i> Add New Location
        </button>
      </div>
    `;
  return html;
}

function buildLocationRowHTML(frm, location, locationItems) {
  const encodedLocation = encodeURIComponent(location);

  const currentStatus = getLocationFieldValue(frm, location, "status");
  const anyApproved = isAnyLocationApproved(frm);
  const isThisLocationApproved = currentStatus === "Approved";
  const isReadOnly = anyApproved && !isThisLocationApproved;

  return `
    <tr data-location="${encodedLocation}" class="location-row ${
    isReadOnly ? "read-only" : ""
  } ${isThisLocationApproved ? "approved-row" : ""}">
      ${buildLocationNameAndStatusCell(
        frm,
        location,
        currentStatus,
        isReadOnly
      )}
      ${buildImagesCell(locationItems, encodedLocation, isThisLocationApproved)}
      ${buildOwnerNameCell(frm, location, isReadOnly)}
      ${buildContactCell(frm, location, isReadOnly)}
      ${buildAddressCell(frm, location, isReadOnly)}
      ${buildCarpetAreaCell(frm, location, isReadOnly)}
      ${buildFloorCell(frm, location, isReadOnly)}
      ${buildEstimateRentCell(frm, location, isReadOnly)}
      ${buildSecurityDepositCell(frm, location, isReadOnly)}
      ${buildActionsCell(location)}
    </tr>`;
}

// ========== CELL BUILDER FUNCTIONS ==========

function buildLocationNameAndStatusCell(
  frm,
  location,
  currentStatus,
  isReadOnly
) {
  const encodedLocation = encodeURIComponent(location);
  return `
    <td>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <textarea
          class="editable-location location-input"
          data-location="${encodedLocation}"
          data-old-location="${encodedLocation}"
          spellcheck="false"
          ${isReadOnly ? "disabled" : ""}
        >${frappe.utils.escape_html(location)}</textarea>
        <div class="status-selection-container">
          ${buildStatusSelector(frm, location, currentStatus)}
        </div>
      </div>
    </td>`;
}

function buildStatusSelector(frm, location, currentStatus) {
  if (!frappe.user.has_role("Project Manager")) {
    return `<span class="status-badge ${currentStatus.toLowerCase()}">${currentStatus}</span>`;
  }

  const anyApproved = isAnyLocationApproved(frm);
  const isThisLocationApproved = currentStatus === "Approved";
  const isDisabled = anyApproved && !isThisLocationApproved;

  let html = `
        <select class="form-control status-select" 
                data-location="${encodeURIComponent(location)}"
                ${isDisabled ? "disabled" : ""}>
            <option value="Pending" ${
              currentStatus === "Pending" ? "selected" : ""
            }>Pending</option>
            <option value="Approved" ${
              currentStatus === "Approved" ? "selected" : ""
            }>Approved</option>
            <option value="Rejected" ${
              currentStatus === "Rejected" ? "selected" : ""
            }>Rejected</option>
            ${
              currentStatus === "Mixed"
                ? '<option value="Mixed" selected>Mixed Status</option>'
                : ""
            }
        </select>`;

  if (isDisabled) {
    html += `<div class="help-message">Cannot change status</div>`;
  }
  return html;
}
function buildImagesCell(
  locationItems,
  encodedLocation,
  isThisLocationApproved
) {
  let html = `
    <td>
      <div class="location-images-container">`;

  locationItems.forEach((item) => {
    const file = item.image || "";
    if (!file) return;
    const isVideo = file.toLowerCase().endsWith(".mp4");
    html += `
      <div class="media-thumbnail" data-status="${item.status}">
        <a href="${file}" target="_blank" class="media-link">
          ${
            isVideo
              ? `<video src="${file}" width="100%" height="100%" muted></video>`
              : `<img src="${file}" width="100%" height="100%" alt="${frappe.utils.escape_html(
                  item.name
                )}">`
          }
          <div class="media-overlay" title="See Media"></div>
        </a>
        ${
          !isThisLocationApproved
            ? `<a href="#" data-docname="${item.docname}" class="delete-img" title="Delete Media"><i class="fa fa-trash"></i></a>`
            : ""
        }
      </div>`;
  });

  if (!isThisLocationApproved) {
    html += `
        <div class="media-thumbnail upload-thumbnail" title="Add Media" data-location="${encodedLocation}">
          <div class="upload-icon"><i class="fa fa-plus"></i></div>
        </div>`;
  }

  html += `
      </div>
    </td>`;
  return html;
}

function buildOwnerNameCell(frm, location, isReadOnly) {
  const ownerName = getLocationFieldValue(frm, location, "owner_name");
  return `
        <td>
            <input type="text" class="editable-field owner-name-input"
                data-location="${encodeURIComponent(location)}"
                data-field="owner_name"
                value="${frappe.utils.escape_html(ownerName || "")}"
                placeholder="Owner Name"
                ${isReadOnly ? "disabled" : ""}>
        </td>
    `;
}

function buildContactCell(frm, location, isReadOnly) {
  const mobileNumber = getLocationFieldValue(frm, location, "mobile_number");
  return `
        <td>
            <input type="text" class="editable-field contact-input"
                data-location="${encodeURIComponent(location)}"
                data-field="mobile_number"
                value="${frappe.utils.escape_html(mobileNumber || "")}"
                placeholder="Mobile Number"
                ${isReadOnly ? "disabled" : ""}>
        </td>
    `;
}

function buildAddressCell(frm, location, isReadOnly) {
  const address = getLocationFieldValue(frm, location, "premises_offered");
  return `
        <td>
            <textarea class="editable-field address-input"
                data-location="${encodeURIComponent(location)}"
                data-field="premises_offered"
                placeholder="Enter address"
                ${isReadOnly ? "disabled" : ""}
            >${frappe.utils.escape_html(address || "")}</textarea>
        </td>
    `;
}

function buildCarpetAreaCell(frm, location, isReadOnly) {
  const carpetArea = getLocationFieldValue(frm, location, "carpet_area");
  return `
        <td>
            <input type="text" class="editable-field carpet-area-input"
                data-location="${encodeURIComponent(location)}"
                data-field="carpet_area"
                value="${frappe.utils.escape_html(carpetArea || "")}"
                placeholder="Carpet Area"
                ${isReadOnly ? "disabled" : ""}>
        </td>
    `;
}

function buildFloorCell(frm, location, isReadOnly) {
  const floor = getLocationFieldValue(frm, location, "floor");
  return `
        <td>
            <input type="text" class="editable-field floor-input"
                data-location="${encodeURIComponent(location)}"
                data-field="floor"
                value="${frappe.utils.escape_html(floor || "")}"
                placeholder="Floor"
                ${isReadOnly ? "disabled" : ""}>
        </td>
    `;
}

function buildEstimateRentCell(frm, location, isReadOnly) {
  const rent = getLocationFieldValue(frm, location, "rent_per_month");
  return `
        <td>
            <div class="financial-group">
                <input type="text" class="estimate-rent-input"
                    data-location="${encodeURIComponent(location)}"
                    value="${rent ? formatCurrencyInput(rent) : ""}"
                    placeholder="Enter rent"
                    ${isReadOnly ? "disabled" : ""}>
                <div class="amount-in-words estimate-rent-words" data-location="${encodeURIComponent(
                  location
                )}">
                    ${
                      rent ? numberToWords(parseInt(rent)) + " Rupees only" : ""
                    }
                </div>
            </div>
        </td>
    `;
}

function buildSecurityDepositCell(frm, location, isReadOnly) {
  const deposit = getLocationFieldValue(frm, location, "security_deposit");
  return `
        <td>
            <div class="financial-group">
                <input type="text" class="security-deposit-input"
                    data-location="${encodeURIComponent(location)}"
                    value="${deposit ? formatCurrencyInput(deposit) : ""}"
                    placeholder="Enter deposit"
                    ${isReadOnly ? "disabled" : ""}>
                <div class="amount-in-words security-deposit-words" data-location="${encodeURIComponent(
                  location
                )}">
                    ${
                      deposit
                        ? numberToWords(parseInt(deposit)) + " Rupees only"
                        : ""
                    }
                </div>
            </div>
        </td>
    `;
}

function buildActionsCell(location) {
  return `
    <td>
      <button class="btn btn-default btn-xs view-details-btn" 
              data-location="${encodeURIComponent(location)}"
              title="View all details">
        <i class="fa fa-eye"></i> View Details
      </button>
    </td>`;
}

// ========== EVENT HANDLING ==========

function bindEventHandlers(frm) {
  const $wrapper = frm.fields_dict.custom_location_details_html.$wrapper;

  applyReadOnlyState(frm);
  bindAddLocationHandler(frm);
  bindLocationNameUpdateHandler(frm, $wrapper);
  bindUploadHandler($wrapper, frm);
  bindDeleteImageHandler($wrapper, frm);
  bindCurrencyInputHandlers($wrapper, frm);
  bindFieldUpdateHandlers($wrapper, frm);
  bindStatusSelectHandlers($wrapper, frm);
  bindViewDetailsHandler($wrapper, frm);
}

function bindViewDetailsHandler($wrapper, frm) {
  $wrapper.find(".view-details-btn").on("click", function () {
    const location = decodeURIComponent($(this).data("location"));
    showLocationDetailsDialog(frm, location);
  });
}

function bindAddLocationHandler(frm) {
  frm.fields_dict.custom_location_details_html.$wrapper
    .find("#add-location")
    .off("click")
    .on("click", function () {
      if (isAnyLocationApproved(frm)) {
        frappe.msgprint(
          __("Cannot add new locations once a location has been approved.")
        );
        return;
      }
      addNewLocationForTask(frm);
    });
}

function bindLocationNameUpdateHandler(frm, $wrapper) {
  $wrapper.find(".location-input").on("change", function () {
    const oldLocation = decodeURIComponent($(this).data("old-location"));
    const newLocation = $(this).val().trim();
    updateLocationNameInline(frm, oldLocation, newLocation);
  });
}

function bindUploadHandler($wrapper, frm) {
  $wrapper.find(".upload-thumbnail").on("click", function (e) {
    e.preventDefault();
    const location = decodeURIComponent($(this).data("location"));

    const childTable = frm.doc.custom_location_details || [];
    const firstItem = childTable.find((row) => row.location_name === location);

    uploadMediaFilesForTask(
      frm,
      location,
      firstItem ? firstItem.rent_per_month : 0,
      firstItem || {}
    );
  });
}

function bindDeleteImageHandler($wrapper, frm) {
  $wrapper.find(".delete-img").on("click", function (e) {
    e.preventDefault();
    const docname = $(this).data("docname");
    frappe.confirm(__("Are you sure you want to delete this item?"), () => {
      deleteMediaItemForTask(frm, docname);
    });
  });
}

function bindCurrencyInputHandlers($wrapper, frm) {
  bindCurrencyInputHandler(
    $wrapper,
    ".estimate-rent-input",
    ".estimate-rent-words",
    (location, value) =>
      updateFieldForLocation(frm, location, "rent_per_month", value, null)
  );
  bindCurrencyInputHandler(
    $wrapper,
    ".security-deposit-input",
    ".security-deposit-words",
    (location, value) =>
      updateFieldForLocation(frm, location, "security_deposit", value, null)
  );
}

function bindCurrencyInputHandler(
  $wrapper,
  inputSelector,
  wordsSelector,
  updateCallback
) {
  $wrapper
    .find(inputSelector)
    .off("input change blur")
    .on("input", function () {
      handleCurrencyInput($(this), wordsSelector);
    })
    .on("blur", function () {
      const input = $(this);
      const location = decodeURIComponent(input.data("location"));
      const numericValue = parseCurrencyInput(input.val());

      const wordSpan = $wrapper.find(
        `${wordsSelector}[data-location="${CSS.escape(
          input.data("location")
        )}"]`
      );
      if (numericValue > 0) {
        wordSpan.text(numberToWords(Math.floor(numericValue)) + " Rupees only");
      } else {
        wordSpan.text("");
      }

      input.val(formatCurrencyInput(numericValue));
      updateCallback(location, numericValue);
    });
}

function bindFieldUpdateHandlers($wrapper, frm) {
  $wrapper.find(".editable-field").on("blur", function () {
    const $input = $(this);
    const location = decodeURIComponent($input.data("location"));
    const fieldname = $input.data("field");
    const value = $input.val();

    updateFieldForLocation(frm, location, fieldname, value, null);
  });
}

function bindStatusSelectHandlers($wrapper, frm) {
  $wrapper
    .find(".status-select")
    .each(function () {
      applyStatusSelectColor(this);
    })
    .on("change", function () {
      applyStatusSelectColor(this);
      const location = decodeURIComponent($(this).data("location"));
      const newStatus = $(this).val();
      const $select = $(this);
      $select.prop("disabled", true);
      updateStatusForLocation(frm, location, newStatus);
    });
}

// ========== DIALOGS ==========

function showAddNewLocationDialog(frm) {
  const dialog = new frappe.ui.Dialog({
    title: "Add New Location",
    fields: [
      {
        fieldname: "location_details_section",
        fieldtype: "Section Break",
        label: "Location Details",
      },
      {
        fieldname: "location_name",
        label: "Location Name",
        fieldtype: "Data",
        reqd: 1,
      },
      {
        fieldname: "personal_information_section",
        fieldtype: "Section Break",
        label: "Personal Information",
      },
      {
        fieldname: "salutation",
        label: "Salutation",
        fieldtype: "Link",
        options: "Salutation",
      },
      { fieldname: "owner_name", label: "Owner Name", fieldtype: "Data" },
      { fieldname: "occupation", label: "Owner Occupation", fieldtype: "Data" },
      {
        fieldname: "residential_address",
        label: "Owner Address",
        fieldtype: "Small Text",
        max_height: "80px",
      },

      { fieldname: "column_break_personal", fieldtype: "Column Break" },
      { fieldname: "mobile_number", label: "Mobile Number", fieldtype: "Data" },
      { fieldname: "email_address", label: "Email Address", fieldtype: "Data" },
      { fieldname: "pan_number", label: "PAN Number", fieldtype: "Data" },
      { fieldname: "aadhar_number", label: "Aadhar Number", fieldtype: "Data" },

      {
        fieldname: "property_details_section",
        fieldtype: "Section Break",
        label: "Property Details",
      },
      {
        fieldname: "premises_offered",
        label: "Location Address",
        fieldtype: "Small Text",
        max_height: "80px",
      },
      { fieldname: "carpet_area", label: "Carpet Area", fieldtype: "Data" },
      { fieldname: "floor", label: "Floor", fieldtype: "Data" },

      { fieldname: "column_break_property", fieldtype: "Column Break" },
      {
        fieldname: "rent_per_month",
        label: "Rent per Month",
        fieldtype: "Currency",
      },
      {
        fieldname: "security_deposit",
        label: "Security Deposit",
        fieldtype: "Currency",
      },
      { fieldname: "maintenance", label: "Maintenance", fieldtype: "Currency" },
      {
        fieldname: "municipal_taxes",
        label: "Municipal Taxes",
        fieldtype: "Currency",
      },

      {
        fieldname: "financial_terms_section",
        fieldtype: "Section Break",
        label: "Financial Terms & Amenities",
      },
      {
        fieldname: "leave_and_license",
        label: "Leave and License Period",
        fieldtype: "Data",
      },
      {
        fieldname: "lock_in_period",
        label: "Lock-in Period",
        fieldtype: "Data",
      },
      {
        fieldname: "escalations_or_increments",
        label: "Escalations or Increments",
        fieldtype: "Data",
      },
      {
        fieldname: "rent_free_period",
        label: "Rent Free Period",
        fieldtype: "Data",
      },
      {
        fieldname: "stamp_duty",
        label: "Stamp Duty and Registration",
        fieldtype: "Data",
      },
      {
        fieldname: "arbitration_and_jurisdiction",
        label: "Arbitration and Jurisdiction",
        fieldtype: "Data",
      },

      { fieldname: "column_break_financial", fieldtype: "Column Break" },
      { fieldname: "parking_area", label: "Parking Area", fieldtype: "Data" },
      { fieldname: "water_supply", label: "Water Supply", fieldtype: "Data" },
      {
        fieldname: "electricity_and_backup",
        label: "Electricity and Backup",
        fieldtype: "Data",
      },
      {
        fieldname: "drainage_and_sewerage",
        label: "Drainage and Sewerage",
        fieldtype: "Data",
      },
      {
        fieldname: "internet_antina",
        label: "Internet Antenna",
        fieldtype: "Small Text",
        max_height: "80px",
      },
      {
        fieldname: "signage",
        label: "Signage",
        fieldtype: "Small Text",
        max_height: "80px",
      },

      { fieldname: "column_break_financial_2", fieldtype: "Column Break" },
      {
        fieldname: "exit_clause",
        label: "Exit Clause",
        fieldtype: "Small Text",
        max_height: "80px",
      },
      {
        fieldname: "payment_terms",
        label: "Payment Terms of Security Deposit",
        fieldtype: "Small Text",
        max_height: "80px",
      },
      {
        fieldname: "landlord_scope_of_work",
        label: "Landlord Scope of Work",
        fieldtype: "Small Text",
        max_height: "80px",
      },
      {
        fieldname: "split_ratio",
        label: "Split Ratio",
        fieldtype: "Small Text",
        max_height: "80px",
      },

      {
        fieldname: "other_details_section",
        fieldtype: "Section Break",
        label: "Other Details",
      },
      {
        fieldname: "remarks",
        label: "Remarks",
        fieldtype: "Small Text",
        max_height: "80px",
      },
    ],
    size: "large",
    primary_action_label: "Add & Upload Media",
    primary_action: function (values) {
      if (!values.location_name) {
        frappe.msgprint(__("Location Name is required."));
        return;
      }
      uploadMediaFilesForTask(
        frm,
        values.location_name,
        values.rent_per_month,
        values
      );
      dialog.hide();
    },
  });

  dialog.show();
}

function showLocationDetailsDialog(frm, location) {
  const childTable = frm.doc.custom_location_details || [];
  const locationItems = childTable.filter(
    (row) => row.location_name === location
  );

  if (locationItems.length === 0) {
    frappe.msgprint(__("Location data not found. Please refresh."));
    return;
  }

  const firstItem = locationItems[0];
  const anyApproved = isAnyLocationApproved(frm);
  const isThisLocationApproved = firstItem.status === "Approved";
  const isReadOnly = anyApproved && !isThisLocationApproved;
  const projectManager = frappe.user.has_role("Project Manager");

  const dialog = new frappe.ui.Dialog({
    title: `Location Details: ${location}`,
    fields: [
      {
        fieldname: "location_details_section",
        fieldtype: "Section Break",
        label: "Location Details",
      },
      {
        fieldname: "location_name",
        label: "Location Name",
        fieldtype: "Data",
        default: firstItem.location_name,
        read_only: true,
      },
      { fieldtype: "Column Break" },
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select",
        options: "Pending\nApproved\nRejected",
        default: firstItem.status,
        read_only: !projectManager || isReadOnly,
        description: isReadOnly
          ? "Cannot change: another location is approved."
          : "",
      },

      {
        fieldname: "personal_information_section",
        fieldtype: "Section Break",
        label: "Personal Information",
      },
      {
        fieldname: "salutation",
        label: "Salutation",
        fieldtype: "Link",
        options: "Salutation",
        default: firstItem.salutation,
        read_only: isReadOnly,
      },
      {
        fieldname: "owner_name",
        label: "Owner Name",
        fieldtype: "Data",
        default: firstItem.owner_name,
        read_only: isReadOnly,
      },
      {
        fieldname: "occupation",
        label: "Owner Occupation",
        fieldtype: "Data",
        default: firstItem.occupation,
        read_only: isReadOnly,
      },
      {
        fieldname: "residential_address",
        label: "Owner Address",
        fieldtype: "Small Text",
        default: firstItem.residential_address,
        read_only: isReadOnly,
        max_height: "80px",
      },

      { fieldname: "column_break_personal", fieldtype: "Column Break" },
      {
        fieldname: "mobile_number",
        label: "Mobile Number",
        fieldtype: "Data",
        default: firstItem.mobile_number,
        read_only: isReadOnly,
      },
      {
        fieldname: "email_address",
        label: "Email Address",
        fieldtype: "Data",
        default: firstItem.email_address,
        read_only: isReadOnly,
      },
      {
        fieldname: "pan_number",
        label: "PAN Number",
        fieldtype: "Data",
        default: firstItem.pan_number,
        read_only: isReadOnly,
      },
      {
        fieldname: "aadhar_number",
        label: "Aadhar Number",
        fieldtype: "Data",
        default: firstItem.aadhar_number,
        read_only: isReadOnly,
      },
      {
        fieldname: "property_details_section",
        fieldtype: "Section Break",
        label: "Property Details",
      },
      {
        fieldname: "premises_offered",
        label: "Location Address",
        fieldtype: "Small Text",
        default: firstItem.premises_offered,
        read_only: isReadOnly,
        max_height: "80px",
      },
      {
        fieldname: "carpet_area",
        label: "Carpet Area",
        fieldtype: "Data",
        default: firstItem.carpet_area,
        read_only: isReadOnly,
      },
      {
        fieldname: "floor",
        label: "Floor",
        fieldtype: "Data",
        default: firstItem.floor,
        read_only: isReadOnly,
      },

      { fieldname: "column_break_property", fieldtype: "Column Break" },
      {
        fieldname: "rent_per_month",
        label: "Rent per Month",
        fieldtype: "Currency",
        default: firstItem.rent_per_month,
        read_only: isReadOnly,
      },
      {
        fieldname: "security_deposit",
        label: "Security Deposit",
        fieldtype: "Currency",
        default: firstItem.security_deposit,
        read_only: isReadOnly,
      },
      {
        fieldname: "maintenance",
        label: "Maintenance",
        fieldtype: "Currency",
        default: firstItem.maintenance,
        read_only: isReadOnly,
      },
      {
        fieldname: "municipal_taxes",
        label: "Municipal Taxes",
        fieldtype: "Currency",
        default: firstItem.municipal_taxes,
        read_only: isReadOnly,
      },

      {
        fieldname: "financial_terms_section",
        fieldtype: "Section Break",
        label: "Financial Terms & Amenities",
      },
      {
        fieldname: "leave_and_license",
        label: "Leave and License Period",
        fieldtype: "Data",
        default: firstItem.leave_and_license,
        read_only: isReadOnly,
      },
      {
        fieldname: "lock_in_period",
        label: "Lock-in Period",
        fieldtype: "Data",
        default: firstItem.lock_in_period,
        read_only: isReadOnly,
      },
      {
        fieldname: "escalations_or_increments",
        label: "Escalations or Increments",
        fieldtype: "Data",
        default: firstItem.escalations_or_increments,
        read_only: isReadOnly,
      },
      {
        fieldname: "rent_free_period",
        label: "Rent Free Period",
        fieldtype: "Data",
        default: firstItem.rent_free_period,
        read_only: isReadOnly,
      },
      {
        fieldname: "stamp_duty",
        label: "Stamp Duty and Registration",
        fieldtype: "Data",
        default: firstItem.stamp_duty,
        read_only: isReadOnly,
      },
      {
        fieldname: "arbitration_and_jurisdiction",
        label: "Arbitration and Jurisdiction",
        fieldtype: "Data",
        default: firstItem.arbitration_and_jurisdiction,
        read_only: isReadOnly,
      },

      { fieldname: "column_break_financial", fieldtype: "Column Break" },
      {
        fieldname: "parking_area",
        label: "Parking Area",
        fieldtype: "Data",
        default: firstItem.parking_area,
        read_only: isReadOnly,
      },
      {
        fieldname: "water_supply",
        label: "Water Supply",
        fieldtype: "Data",
        default: firstItem.water_supply,
        read_only: isReadOnly,
      },
      {
        fieldname: "electricity_and_backup",
        label: "Electricity and Backup",
        fieldtype: "Data",
        default: firstItem.electricity_and_backup,
        read_only: isReadOnly,
      },
      {
        fieldname: "drainage_and_sewerage",
        label: "Drainage and Sewerage",
        fieldtype: "Data",
        default: firstItem.drainage_and_sewerage,
        read_only: isReadOnly,
      },
      {
        fieldname: "internet_antina",
        label: "Internet Antenna",
        fieldtype: "Small Text",
        default: firstItem.internet_antina,
        read_only: isReadOnly,
        max_height: "80px",
      },
      {
        fieldname: "signage",
        label: "Signage",
        fieldtype: "Small Text",
        default: firstItem.signage,
        read_only: isReadOnly,
        max_height: "80px",
      },

      { fieldname: "column_break_financial_2", fieldtype: "Column Break" },
      {
        fieldname: "exit_clause",
        label: "Exit Clause",
        fieldtype: "Small Text",
        default: firstItem.exit_clause,
        read_only: isReadOnly,
        max_height: "80px",
      },
      {
        fieldname: "payment_terms",
        label: "Payment Terms of Security Deposit",
        fieldtype: "Small Text",
        default: firstItem.payment_terms,
        read_only: isReadOnly,
        max_height: "80px",
      },
      {
        fieldname: "landlord_scope_of_work",
        label: "Landlord Scope of Work",
        fieldtype: "Small Text",
        default: firstItem.landlord_scope_of_work,
        read_only: isReadOnly,
        max_height: "80px",
      },
      {
        fieldname: "split_ratio",
        label: "Split Ratio",
        fieldtype: "Small Text",
        default: firstItem.split_ratio,
        read_only: isReadOnly,
        max_height: "80px",
      },
      {
        fieldname: "other_details_section",
        fieldtype: "Section Break",
        label: "Other Details",
      },
      {
        fieldname: "remarks",
        label: "Remarks",
        fieldtype: "Small Text",
        default: firstItem.remarks,
        read_only: isReadOnly,
        max_height: "80px",
      },

      {
        fieldname: "media_section",
        fieldtype: "Section Break",
        label: "Media Files",
        collapsible: 1,
      },
      {
        fieldname: "media_html",
        fieldtype: "HTML",
        options: buildMediaHTML(
          locationItems,
          isReadOnly,
          isThisLocationApproved
        ),
      },
      {
        fieldname: "add_media_btn",
        fieldtype: "Button",
        label: "Add More Media",
        hidden: isReadOnly,
      },
    ],
    size: "large",
    primary_action_label: isReadOnly ? "Close" : "Save Changes",
    primary_action: function (values) {
      if (isReadOnly) {
        dialog.hide();
        return;
      }
      saveLocationDetails(frm, location, values, dialog);
    },
    secondary_action_label: "Delete Location",
    secondary_action: function () {
      if (!isReadOnly) {
        deleteLocationGroup(frm, location, dialog);
      } else {
        frappe.show_alert(
          {
            message: __(
              "Cannot delete a rejected location when another is approved."
            ),
            indicator: "orange",
          },
          5
        );
      }
    },
  });

  if (isReadOnly || isThisLocationApproved) {
    dialog.get_secondary_btn().hide();
  }

  dialog.fields_dict.add_media_btn.$input.on("click", function () {
    const existingData = locationItems[0] || {};
    uploadMediaFilesForTask(
      frm,
      location,
      existingData.rent_per_month,
      existingData
    ).then(() => {
      dialog.hide();
      showLocationDetailsDialog(frm, location);
    });
  });

  dialog.show();

  dialog
    .get_field("media_html")
    .$wrapper.on("click", ".delete-media", function (e) {
      e.preventDefault();
      if (isReadOnly || isThisLocationApproved) return;
      const docname = $(this).data("docname");
      frappe.confirm(
        __("Are you sure you want to delete this media file?"),
        () => {
          dialog.get_primary_btn().prop("disabled", true);
          deleteMediaItemForTask(frm, docname)
            .then(() => {
              dialog.hide();
              showLocationDetailsDialog(frm, location);
            })
            .catch(() => {
              dialog.get_primary_btn().prop("disabled", false);
            });
        }
      );
    });
}
function buildMediaHTML(locationItems, isReadOnly, isThisLocationApproved) {
  let html = `<div class="location-images-container dialog-media-grid">`;
  locationItems.forEach((item) => {
    if (item.location_image) {
      const file = item.location_image;
      const isVideo = file.toLowerCase().endsWith(".mp4");
      html += `
        <div class="media-thumbnail">
          <a href="${file}" target="_blank" class="media-link">
            ${
              isVideo
                ? `<video src="${file}" width="100%" height="100%" muted></video>`
                : `<img src="${file}" alt="Location Image">`
            }
            <div class="media-overlay" title="See Media"></div>
          </a>
          ${
            !isReadOnly && !isThisLocationApproved
              ? `<a href="#" class="delete-media" data-docname="${item.name}" title="Delete Media"><i class="fa fa-trash"></i></a>`
              : ""
          }
        </div>`;
    }
  });
  html += `</div>`;
  return html;
}

// ========== UTILITY & STATE FUNCTIONS ==========
function applyReadOnlyState(frm) {
  const $wrapper = frm.fields_dict.custom_location_details_html.$wrapper;
  const anyApproved = isAnyLocationApproved(frm);

  if (anyApproved) {
    // Make all non-approved rows read-only
    $wrapper.find("tr.location-row").each(function () {
      const $row = $(this);
      const location = decodeURIComponent($row.data("location"));
      const currentStatus = getLocationFieldValue(frm, location, "status");

      if (currentStatus !== "Approved") {
        $row.addClass("read-only");
        $row
          .find("input, textarea, select, .delete-img, .upload-thumbnail")
          .prop("disabled", true)
          .css("pointer-events", "none");
        $row.find(".delete-img, .upload-thumbnail").hide();
      }
    });

    // Also hide delete/upload controls on the approved row itself
    const $approvedRow = $wrapper.find("tr.approved-row");
    if ($approvedRow.length) {
      $approvedRow.find(".delete-img, .upload-thumbnail").hide();
    }
  }
}

function getLocationFieldValue(frm, location, fieldName) {
  const childTable = frm.doc.custom_location_details || [];
  const locationRows = childTable.filter(
    (row) => row.location_name === location
  );

  if (locationRows.length === 0) return "";

  const fieldValues = [...new Set(locationRows.map((row) => row[fieldName]))];

  if (fieldName === "status") {
    return fieldValues.length === 1 ? fieldValues[0] : "Mixed";
  }

  return fieldValues[0];
}

function isAnyLocationApproved(frm) {
  const childTable = frm.doc.custom_location_details || [];
  return childTable.some((row) => row.status === "Approved");
}

function formatCurrencyInput(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return "";
  return (
    "₹" +
    num.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })
  );
}

function parseCurrencyInput(formattedValue) {
  if (!formattedValue) return 0;
  const numStr = String(formattedValue).replace(/[^0-9.-]+/g, "");
  return parseFloat(numStr) || 0;
}

function handleCurrencyInput(input, wordsSelector) {
  const value = input.val();
  const numericValue = parseCurrencyInput(value);

  const encodedLocation = input.data("location");
  const wordSpan = frm.fields_dict.custom_location_details_html.$wrapper.find(
    `${wordsSelector}[data-location="${CSS.escape(encodedLocation)}"]`
  );
  if (wordSpan.length) {
    if (numericValue) {
      wordSpan.text(numberToWords(Math.floor(numericValue)) + " Rupees only");
    } else {
      wordSpan.text("");
    }
  }
}

function applyStatusSelectColor(selectEl) {
  const val = selectEl.value;
  selectEl.className = selectEl.className.replace(/\bstatus-\w+/g, "");
  selectEl.classList.add(`status-${val.toLowerCase()}`);
}

// ========== DATA OPERATIONS ==========
function saveLocationDetails(frm, location, values, dialog) {
  frappe.dom.freeze(__("Saving..."));

  // Status change is handled separately on the client
  const statusChanged =
    values.status !== getLocationFieldValue(frm, location, "status");
  if (statusChanged && values.status !== "Mixed") {
    updateStatusForLocation(frm, location, values.status)
      .then(() => {
        dialog.hide();
      })
      .finally(() => {
        frappe.dom.unfreeze();
      });
    return;
  }

  frappe.call({
    method: "sahayog.api.task.update_location_details",
    args: {
      parent_docname: frm.doc.name,
      location_name: location,
      new_values_json: JSON.stringify(values),
    },
    callback: function (r) {
      frappe.dom.unfreeze();
      if (r.message && !r.message.error) {
        dialog.hide();
        frm.reload_doc();

        // --- Confirmation Log ---
        // Print the detailed message from the server to the console
        console.log("Server response:", r.message);

        frappe.show_alert(
          {
            message: __(r.message),
            indicator: r.message.includes("No changes") ? "blue" : "green",
          },
          7 // Increased duration to see the detailed message
        );
      } else {
        console.error("Server-side error:", r.message.error);
        frappe.msgprint({
          title: __("Error"),
          message: __(
            "Failed to save changes on the server. Please check the console."
          ),
          indicator: "red",
        });
      }
    },
    error: function (r) {
      frappe.dom.unfreeze();
      console.error("Frappe call failed:", r);
      frappe.msgprint(__("An unexpected error occurred."));
    },
  });
}

function updateStatusForLocation(frm, location, newStatus) {
  if (newStatus === "Mixed") return Promise.resolve();
  frappe.dom.freeze(__("Updating Status..."));

  const childTable = frm.doc.custom_location_details || [];
  const updates = [];

  if (newStatus === "Approved") {
    childTable.forEach((row) => {
      if (row.location_name !== location && row.status !== "Rejected") {
        updates.push(() =>
          frappe.model.set_value(row.doctype, row.name, "status", "Rejected")
        );
      }
    });
  }

  childTable.forEach((row) => {
    if (row.location_name === location && row.status !== newStatus) {
      updates.push(() =>
        frappe.model.set_value(row.doctype, row.name, "status", newStatus)
      );
    }
  });

  if (updates.length === 0) {
    frappe.dom.unfreeze();
    return Promise.resolve();
  }

  return executeSequentialUpdates(updates)
    .then(() => frm.save())
    .then(() => {
      renderCustomLocationUIForTask(frm);
      showStatusUpdateMessage(newStatus);
    })
    .catch((err) => handleUpdateError(err, frm))
    .finally(() => frappe.dom.unfreeze());
}

function executeSequentialUpdates(updates) {
  return updates.reduce((p, fn) => p.then(fn), Promise.resolve());
}

function showStatusUpdateMessage(newStatus) {
  let message = __("Status updated for all items in this location.");
  if (newStatus === "Approved") {
    message = __(
      "Location approved. All other locations have been automatically rejected."
    );
  }
  frappe.show_alert({ message: message, indicator: "green" }, 5);
}

function handleUpdateError(err, frm) {
  console.error("Error updating status:", err);
  frappe.msgprint({
    title: __("Error"),
    message: __("Failed to update status. Please check console for details."),
    indicator: "red",
  });
  renderCustomLocationUIForTask(frm);
}

function addNewLocationForTask(frm) {
  showAddNewLocationDialog(frm);
}

function updateLocationNameInline(frm, oldLocation, newLocation) {
  if (!newLocation || newLocation === oldLocation) return;
  return updateFieldForLocation(
    frm,
    oldLocation,
    "location_name",
    newLocation,
    "Location name updated"
  );
}

function updateFieldForLocation(
  frm,
  location,
  fieldname,
  newValue,
  successMessage
) {
  const childTable = frm.doc.custom_location_details || [];
  const updates = [];

  childTable.forEach((row) => {
    if (row.location_name === location && row[fieldname] != newValue) {
      updates.push(() =>
        frappe.model.set_value(row.doctype, row.name, fieldname, newValue)
      );
    }
  });

  if (updates.length === 0) return Promise.resolve();

  return executeSequentialUpdates(updates)
    .then(() => {
      if (fieldname === "location_name") {
        renderCustomLocationUIForTask(frm);
      }
      return frm.save();
    })
    .then(() => {
      if (successMessage) {
        frappe.show_alert(
          { message: __(successMessage), indicator: "green" },
          3
        );
      }
    })
    .catch((err) => {
      console.error(`Error updating ${fieldname}:`, err);
      frappe.msgprint({
        title: __("Error"),
        message: __(`Failed to update ${fieldname}.`),
        indicator: "red",
      });
      renderCustomLocationUIForTask(frm);
      throw err;
    });
}

function uploadMediaFilesForTask(
  frm,
  location,
  estimateRent,
  extraFields = {}
) {
  return new Promise((resolve, reject) => {
    new frappe.ui.FileUploader({
      allow_multiple: true,
      restrictions: { allowed_file_types: ["image/*", "video/mp4"] },
      on_success: async (file) => {
        try {
          frappe.dom.freeze(__("Attaching media..."));
          await frappe.call({
            method: "frappe.client.set_value",
            args: {
              doctype: "File",
              name: file.name,
              fieldname: { is_private: 0 },
            },
          });
          const r = await frappe.call({
            method: "frappe.client.get",
            args: { doctype: "File", name: file.name },
          });

          const newRow = frm.add_child("custom_location_details");
          Object.assign(newRow, extraFields);
          newRow.location_name = location;
          newRow.location_image = r.message.file_url;
          newRow.status = "Pending";
          newRow.rent_per_month = estimateRent || 0;

          await frm.save();
          frappe.show_alert(
            { message: __("Media uploaded successfully."), indicator: "green" },
            3
          );
          renderCustomLocationUIForTask(frm);
          resolve();
        } catch (err) {
          console.error("Error in upload success flow:", err);
          frappe.msgprint(
            __("Failed to attach media. See console for details.")
          );
          reject(err);
        } finally {
          frappe.dom.unfreeze();
        }
      },
      on_error: (error) => {
        frappe.msgprint({
          title: __("Upload Error"),
          message: error.message || __("An error occurred during upload."),
          indicator: "red",
        });
        reject(error);
      },
    });
  });
}

function deleteMediaItemForTask(frm, docname) {
  const grid = frm.get_field("custom_location_details").grid;
  const gridRow = grid.grid_rows.find((row) => row.doc.name === docname);

  if (gridRow) {
    gridRow.remove();
    renderCustomLocationUIForTask(frm);
    return frm
      .save()
      .then(() => {
        frappe.show_alert(
          { message: __("Item deleted."), indicator: "green" },
          3
        );
      })
      .catch((err) => {
        frappe.msgprint({
          title: __("Error"),
          message: __("Failed to save deletion."),
          indicator: "red",
        });
        renderCustomLocationUIForTask(frm);
        throw err;
      });
  } else {
    frappe.msgprint({
      title: __("Not Found"),
      message: __("Row not found."),
      indicator: "orange",
    });
    return Promise.resolve();
  }
}

function deleteLocationGroup(frm, location, dialog) {
  frappe.confirm(
    __(
      "Are you sure you want to delete the location '{0}' and all its media?",
      [location]
    ),
    () => {
      frappe.dom.freeze(__("Deleting..."));
      const grid = frm.get_field("custom_location_details").grid;
      const rowsToDelete = grid.grid_rows.filter(
        (row) => row.doc.location_name === location
      );

      if (rowsToDelete.length > 0) {
        rowsToDelete
          .slice()
          .reverse()
          .forEach((row) => row.remove());

        frm
          .save()
          .then(() => {
            dialog.hide();
            frappe.show_alert(
              {
                message: __("Location '{0}' deleted.", [location]),
                indicator: "green",
              },
              5
            );
            renderCustomLocationUIForTask(frm);
          })
          .catch((err) => {
            console.error("Error deleting location:", err);
            frappe.msgprint(__("Failed to delete location."));
            renderCustomLocationUIForTask(frm);
          })
          .finally(() => frappe.dom.unfreeze());
      } else {
        frappe.dom.unfreeze();
        frappe.msgprint(__("No items found to delete."));
      }
    }
  );
}

// ========== NUMBER TO WORDS FUNCTION ==========
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
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + convert(n % 10000000) : "")
    );
  };
  return convert(num).trim().replace(/\s+/g, " ");
}

// ========== CSS FUNCTION ==========
function addCustomCSS() {
  const css = `
  /* Container and Table Layout */
  .location-album-container {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    overflow-x: auto;
    margin-bottom: 20px;
    width: 100%;
  }
  .location-album-container table {
    min-width: 1600px;
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    table-layout: fixed;
  }
  .location-album-container th:first-child,
  .location-album-container td:first-child {
    position: sticky;
    left: 0;
    z-index: 2;
    background: #fff;
  }
  table th {
    font-weight: 600;
    text-align: left;
    padding: 12px 15px;
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: #f8fafc;
    color: #36414c;
    border-bottom: 1px solid #e5e9ed;
  }
  table td {
    padding: 8px 10px; /* Adjusted padding for inputs */
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }
  table tr.read-only {
    background-color: #f8f9fa;
    opacity: 0.7;
  }
  table tr.read-only:hover {
    background-color: #f8f9fa;
  }

  /* Unified Input and Textarea Styling */
  .location-album-container .editable-field,
  .location-album-container .location-input,
  .location-album-container .estimate-rent-input,
  .location-album-container .security-deposit-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #d1d8e0;
    border-radius: 4px;
    background-color: #fff;
    box-sizing: border-box;
    font-size: 13px;
    color: #212529;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .location-album-container .editable-field:focus,
  .location-album-container .location-input:focus,
  .location-album-container .estimate-rent-input:focus,
  .location-album-container .security-deposit-input:focus {
    outline: none;
    border-color: #5e64ff;
    box-shadow: 0 0 0 2px rgba(94, 100, 255, 0.2);
  }
  
  .location-album-container .editable-field[disabled],
  .location-album-container .location-input[disabled],
  .location-album-container .estimate-rent-input[disabled],
  .location-album-container .security-deposit-input[disabled] {
      background-color: #f8f9fa;
      cursor: not-allowed;
  }
  
  /* Specific styling for Textareas */
  .location-album-container textarea.editable-field,
  .location-album-container textarea.location-input {
      resize: vertical;
      min-height: 40px;
  }

  /* Specific styling for Location Name textarea */
  .location-album-container .location-input {
    font-weight: bold;
  }

  /* Financial input styling */
  .financial-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .amount-in-words {
    font-size: 11px;
    color: #6c757d;
    min-height: 14px;
    padding: 0 4px;
  }

  /* Media Gallery Styling */
  .location-images-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .media-thumbnail {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
    background: #f9f9f9;
    display: inline-block;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .media-thumbnail:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  }
  .media-link img, .media-link video {
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
    background: linear-gradient(to top, rgba(0,0,0,0.2), transparent);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .media-thumbnail:hover .media-overlay { opacity: 1; }
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
    font-size: 10px;
    border: 1px solid rgba(0,0,0,0.1);
    z-index: 2;
    opacity: 0;
    transition: all 0.2s;
  }
  .media-thumbnail:hover .delete-img { opacity: 1; }
  .delete-img:hover {
    background: #ff5858;
    color: white;
    transform: scale(1.1);
  }
  .upload-thumbnail {
    border: 2px dashed #c7d1dd;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #7a8ca5;
    font-size: 18px;
    width: 40px;
    height: 40px;
    box-sizing: border-box;
  }
  .upload-thumbnail:hover {
    border-color: #5e64ff;
    color: #5e64ff;
  }
  
  /* Status Selector Styling */
  .status-select {
    border-radius: 4px;
    border: 1px solid #d1d8e0;
    font-size: 13px;
    font-weight: 600;
    background-repeat: no-repeat;
    background-position: right 8px center;
    transition: all 0.2s;
    cursor: pointer;
    color: #fff;
    padding: 6px 28px 6px 10px;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  }
  .status-select.status-pending { background-color: #ffc107; border-color: #ffc107; }
  .status-select.status-approved { background-color: #28a745; border-color: #28a745; }
  .status-select.status-rejected { background-color: #dc3545; border-color: #dc3545; }
  .status-select.status-mixed { background-color: #6c757d; border-color: #6c757d; color: #fff; }
  .status-select:disabled { opacity: 0.6; cursor: not-allowed; }
  
  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    background-color: #fdfdfd;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }
  .empty-state-icon {
    font-size: 40px;
    color: #adb5bd;
    margin-bottom: 15px;
  }
  
  /* Dialog Media Grid */
  .dialog-media-grid {
    padding: 10px;
    max-height: 400px;
    overflow-y: auto;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .dialog-media-grid .media-thumbnail {
    width: 80px;
    height: 80px;
  }
  .delete-media {
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
    font-size: 10px;
    border: 1px solid rgba(0,0,0,0.1);
    z-index: 2;
    opacity: 0;
    transition: all 0.2s;
  }
  .dialog-media-grid .media-thumbnail:hover .delete-media { opacity: 1; }
  .delete-media:hover {
    background: #ff5858;
    color: white;
    transform: scale(1.1);
  }
  `;
  frappe.dom.set_style(css);
}
