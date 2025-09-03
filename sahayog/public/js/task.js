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
  async supplier_allocation(frm) {
    if (!frm.doc.project) {
      frm.set_intro("Please select a Project first.", "orange");
      return;
    }

    // -----------------------------
    // 1️⃣ Fetch Project and existing suppliers
    // -----------------------------
    let project = await frappe.db.get_doc("Project", frm.doc.project);
    let existing_suppliers = project.custom_supplier_details || [];

    // -----------------------------
    // 2️⃣ Set intro with clickable links
    // -----------------------------
    if (existing_suppliers.length > 0) {
      let html = `<ul style="margin-top:8px;">${existing_suppliers
        .map(
          (r, idx) =>
            `<li>
                ${idx + 1}. 
                <a href="#Form/Supplier/${
                  r.supplier
                }" onclick="frappe.set_route('Form','Supplier','${
              r.supplier
            }'); return false;">
                    ${r.supplier}
                </a>
            </li>`
        )
        .join("")}</ul>`;

      frm.set_intro(
        `This Project has ${existing_suppliers.length} supplier(s) Allocated: ${html}`,
        "green"
      );
    } else {
      frm.set_intro("No suppliers linked in the Project.", "orange");
    }

    // -----------------------------
    // 3️⃣ Always add custom button
    // -----------------------------
    frm.add_custom_button("Allocate Supplier", async () => {
      const dialog = new frappe.ui.Dialog({
        title: __("Allocate Suppliers"),
        fields: [
          {
            fieldname: "suppliers",
            fieldtype: "Table",
            label: __("Suppliers"),
            in_place_edit: true,
            reqd: 1,
            fields: [
              {
                fieldname: "supplier",
                label: __("Supplier"),
                fieldtype: "Link",
                options: "Supplier",
                in_list_view: 1,
                reqd: 1,
              },
            ],
            data: existing_suppliers.map((r) => ({ supplier: r.supplier })),
          },
        ],
        primary_action_label: __("Submit"),
        primary_action: async function (values) {
          // -----------------------------
          // 4️⃣ Filter empty/invalid suppliers
          // -----------------------------
          let supplier_list = values.suppliers
            .map((r) => r.supplier)
            .filter((s) => s && s.trim() !== "");

          if (supplier_list.length === 0) {
            frappe.msgprint("Please add at least one valid supplier.");
            return;
          }
          console.log("Suppliers to allocate:", supplier_list);
          // -----------------------------
          // 5️⃣ Call Python API to update child table
          // -----------------------------
          try {
            await frappe.call({
              method: "sahayog.doc_events.task.update_project_suppliers",
              args: {
                project_name: frm.doc.project,
                suppliers: JSON.stringify(supplier_list), // <- important
              },
              callback: function (r) {
                frappe.show_alert({
                  message: "Suppliers updated successfully!",
                  indicator: "green",
                });
                frm.trigger("supplier_allocation");
              },
            });

            dialog.hide();
            window.location.reload();
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

// html field
frappe.ui.form.on("Task", {
  refresh: function (frm) {
    if (
      frm.doc.subject === "Acquisition of the Property" &&
      !frm.doc.is_template
    ) {
      // Render custom UI
      if (
        frappe.session.user != "Administrator" &&
        !frappe.user.has_role("System Manager")
      ) {
        frm.fields_dict.custom_location_details.$wrapper
          .closest(".form-group")
          .hide();
      }
      render_custom_location_ui_for_task(frm);

      // Add CSS
      add_custom_css();
    }

    if (frm.doc.subject === "Manpower Recruitment" && !frm.doc.is_template) {
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

  // Group rows by location_name
  table.forEach((row) => {
    if (!row.location_name) return;
    if (!grouped[row.location_name]) grouped[row.location_name] = [];
    grouped[row.location_name].push({
      image: row.location_image,
      name: row.name,
      docname: row.name,
      status: row.status,
      estimate_rent: row.estimate_rent,
      address: row.address,
      security_deposit: row.security_deposit,
      floor: row.floor,
      remarks: row.remarks,
      contact_number: row.contact_number,
      occupation: row.occupation,
      carpet_area: row.carpet_area,
    });
  });

  let html = `
        <div class="location-album-container">
            <table class="table table-bordered" style="margin:0;">
                <thead>
                    <tr>
                        <th style="width: 150px;">Location Name</th>
                        <th>Location Images</th>
                        <th style="width: 200px;">Address</th>
                        <th style="width: 120px;">Estimate Rent<br>(per month)</th>
                        <th style="width: 120px;">Security Deposit</th>
                        <th style="width: 80px;">Floor</th>
                        <th style="width: 150px;">Contact Number</th>
                        <th style="width: 200px;">Remarks</th>
                        <th style="width: 120px;">Occupation</th>
                        <th style="width: 120px;">Carpet Area (sq.ft)</th>
                        <th style="width: 100px;">Status</th>   
                    </tr>
                </thead>
                <tbody>`;

  for (let location in grouped) {
    if (!location) continue;

    // Use the unified function to get all field values
    const currentStatus = getLocationFieldValue(frm, location, "status");
    const currentRent = getLocationFieldValue(frm, location, "estimate_rent");
    const currentDeposit = getLocationFieldValue(
      frm,
      location,
      "security_deposit"
    );
    const currentAddress = getLocationFieldValue(frm, location, "address");
    const currentFloor = getLocationFieldValue(frm, location, "floor");
    const currentContact = getLocationFieldValue(
      frm,
      location,
      "contact_number"
    );
    const currentRemarks = getLocationFieldValue(frm, location, "remarks");

    const firstRow = grouped[location][0] || {};
    const encodedLocation = encodeURIComponent(location);

    html += `
            <tr data-location="${encodedLocation}" class="location-row">
              <!-- Location Name -->
              <td>
                <textarea
                  class="editable-location location-input"
                  data-location="${encodedLocation}"
                  data-old-location="${encodedLocation}"
                  style="border: none; background: transparent; width: 100%; font-weight: bold; resize: vertical; min-height: 40px;" 
                  spellcheck="false"
                >${frappe.utils.escape_html(location)}</textarea>
              </td>

              <!-- Images -->
              <td>
                <div class="location-images-container">`;

    grouped[location].forEach((item) => {
      const file = item.image || "";
      const is_video = file.toLowerCase().endsWith(".mp4");
      html += `
        <div class="media-thumbnail" data-status="${item.status}">
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

    html += `
        <div class="media-thumbnail upload-thumbnail" title="Add Media" data-location="${encodedLocation}">
          <div class="upload-icon"><i class="fa fa-plus"></i></div>
        </div>
        </div>
      </td>

      <!-- Address -->
      <td>
        <textarea class="form-control address-input"
                  data-location="${encodedLocation}"
                  placeholder="Enter address"
                  style="border: none; background: transparent; width: 100%; font-weight: bold; resize: vertical; min-height: 40px;" 
                  spellcheck="false">${frappe.utils.escape_html(
                    currentAddress || ""
                  )}</textarea>
      </td>


      <!-- Estimate Rent -->
      <td>
        <div style="display: flex; flex-direction: column; align-items: start; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 4px;">
          <input type="text"
                   class="form-control estimate-rent-input"
                   data-location="${encodedLocation}"
                   value="₹${
                     currentRent ? formatCurrencyInput(currentRent) : "000"
                   }"
                   placeholder="Enter rent"
                   style="flex: 1; max-width: 120px;">
          </div>
          <div class="amount-in-words estimate-rent-words"
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

      <!-- Security Deposit -->
     <td>
        <div style="display: flex; flex-direction: column; align-items: start; gap: 4px;">
          <input type="text" class="form-control security-deposit-input"
                 data-location="${encodedLocation}"
                 value="₹${
                   currentDeposit ? formatCurrencyInput(currentDeposit) : "000"
                 }"
                 placeholder="Enter deposit"
                 style="flex: 1; max-width: 120px;">
          <div class="amount-in-words security-deposit-words"
               data-location="${encodedLocation}"
               style="font-size: 12px; color: #555;">
            ${
              currentDeposit
                ? numberToWords(parseInt(currentDeposit)) + " Rupees only"
                : ""
            }
          </div>
        </div>
      </td>
          
      <!-- Floor -->
      <td>
        <input type="text" class="form-control floor-input"
               data-location="${encodedLocation}"
               value="${frappe.utils.escape_html(currentFloor || "")}"
               placeholder="Floor">
      </td>

      <!-- Contact Number -->
      <td>
        <input type="text" class="form-control contact-input"
               data-location="${encodedLocation}"
               value="${frappe.utils.escape_html(currentContact || "")}"
               placeholder="Contact Number">
      </td>

      <!-- Remarks -->
      <td>
        <textarea class="form-control remarks-input"
                  data-location="${encodedLocation}"
                  placeholder="Remarks" style="border: none; background: transparent; width: 100%; font-weight: bold; resize: vertical; min-height: 40px;" 
                  spellcheck="false">${frappe.utils.escape_html(
                    currentRemarks || ""
                  )}</textarea>
      </td>

      <!-- Occupation -->
      <td>
        <input type="text" class="form-control occupation-input"
               data-location="${encodedLocation}"
               value="${frappe.utils.escape_html(firstRow.occupation || "")}"
               placeholder="Occupation">
      </td>

      <!-- Carpet Area -->
      <td>
        <input type="text" class="form-control carpet-area-input"
               data-location="${encodedLocation}"
               value="${frappe.utils.escape_html(firstRow.carpet_area || "")}"
               placeholder="Carpet Area">
      </td>


      <!-- Status -->
      <td>
        <div class="status-selection-container">`;

    // Project Manager logic
    if (frappe.user.has_role("Project Manager")) {
      const anyApproved = isAnyLocationApproved(frm);
      const isThisLocationApproved = currentStatus === "Approved";
      const isReadOnly = anyApproved && !isThisLocationApproved;

      // Status select
      html += `
      <select class="form-control status-select" 
              data-location="${encodedLocation}"
              ${isReadOnly ? "disabled" : ""}>
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

      // Help message
      if (isReadOnly) {
        html += `<div class="help-message" style="font-size: 11px; color: #6b778c; margin-top: 4px;">
            Cannot change - another location is approved
          </div>`;
      }
    } else {
      html += `<span class="status-badge ${currentStatus.toLowerCase()}">${currentStatus}</span>`;
    }

    html += `
        </div>
      </td>
    </tr>`;
  }

  html += `
                </tbody>
            </table>
        </div>
        <div class="add-location-container" style="margin-bottom:10px; text-align:right;">
          <button class="btn btn-sm btn-primary" id="add-location">
            <i class="fa fa-plus"></i> Add New Location
          </button>
        </div>
        `;

  frm.fields_dict.custom_location_details_html.$wrapper.html(html);

  // ====== Event Bindings ======

  frm.fields_dict.custom_location_details_html.$wrapper
    .find("tr.location-row")
    .each(function () {
      const $row = $(this);
      const location = decodeURIComponent($row.data("location"));
      const currentStatus = getLocationFieldValue(frm, location, "status");
      const anyApproved = isAnyLocationApproved(frm);
      const isThisLocationApproved = currentStatus === "Approved";

      if (anyApproved && !isThisLocationApproved) {
        $row.find("input, textarea, select, button").prop("disabled", true);
        $row.css("opacity", 0.8);
      }
    });

  // Add location
  frm.fields_dict.custom_location_details_html.$wrapper
    .find("#add-location")
    .on("click", function () {
      add_new_location_for_task(frm);
    });

  // Location name update
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".location-input")
    .on("change", function () {
      const old_location = decodeURIComponent($(this).data("old-location"));
      const new_location = $(this).val().trim();
      update_location_name_inline(frm, old_location, new_location);
    });

  // Upload handler
  // Upload handler CALL 1
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".upload-thumbnail")
    .on("click", function (e) {
      e.preventDefault();
      const location = decodeURIComponent($(this).data("location"));

      // Collect all fields for this location
      const currentRent = getLocationFieldValue(frm, location, "estimate_rent");
      const securityDeposit = getLocationFieldValue(
        frm,
        location,
        "security_deposit"
      );
      const address = getLocationFieldValue(frm, location, "address");
      const floor = getLocationFieldValue(frm, location, "floor");
      const contact = getLocationFieldValue(frm, location, "contact_number");
      const remarks = getLocationFieldValue(frm, location, "remarks");
      const occupation = getLocationFieldValue(frm, location, "occupation");
      const carpet_area = getLocationFieldValue(frm, location, "carpet_area");

      upload_media_files_for_task(frm, location, currentRent, {
        security_deposit: securityDeposit,
        address: address,
        floor: floor,
        contact: contact,
        remarks: remarks,
        occupation: occupation,
        carpet_area: carpet_area,
      });
    });

  // Delete image handler
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".delete-img")
    .on("click", function (e) {
      e.preventDefault();
      const docname = $(this).data("docname");
      frappe.confirm(__("Are you sure you want to delete this item?"), () => {
        delete_media_item_for_task(frm, docname);
      });
    });

  // Estimate Rent input (with currency + words)
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".estimate-rent-input")
    .off("input change blur")
    .on("input", function () {
      const input = $(this);
      const formatted = formatCurrencyInput(input.val());
      if (formatted !== input.val()) {
        const cursorPos = input[0].selectionStart;
        input.val(formatted);
        const diff = formatted.length - input.val().length;
        input[0].setSelectionRange(cursorPos + diff, cursorPos + diff);
      }
      const encodedLocation = input.data("location");
      const wordSpan =
        frm.fields_dict.custom_location_details_html.$wrapper.find(
          `.estimate-rent-words[data-location="${CSS.escape(encodedLocation)}"]`
        );
      if (wordSpan.length) {
        const numericValue = parseCurrencyInput(input.val());
        if (numericValue) {
          wordSpan.text(
            numberToWords(Math.floor(numericValue)) + " Rupees only"
          );
        } else {
          wordSpan.text("");
        }
      }
    })
    .on("blur", function () {
      const input = $(this);
      const location = decodeURIComponent(input.data("location"));
      const numericValue = parseCurrencyInput(input.val());
      input.val(formatCurrencyInput(numericValue));
      update_field_for_location(
        frm,
        location,
        "estimate_rent",
        numericValue,
        "Rent updated"
      );
    });

  // Security Deposit input (with currency + words)
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".security-deposit-input")
    .off("input change blur")
    .on("input", function () {
      const input = $(this);
      const formatted = formatCurrencyInput(input.val());
      if (formatted !== input.val()) {
        const cursorPos = input[0].selectionStart;
        input.val(formatted);
        const diff = formatted.length - input.val().length;
        input[0].setSelectionRange(cursorPos + diff, cursorPos + diff);
      }
      const encodedLocation = input.data("location");
      const wordSpan =
        frm.fields_dict.custom_location_details_html.$wrapper.find(
          `.security-deposit-words[data-location="${CSS.escape(
            encodedLocation
          )}"]`
        );
      if (wordSpan.length) {
        const numericValue = parseCurrencyInput(input.val());
        if (numericValue) {
          wordSpan.text(
            numberToWords(Math.floor(numericValue)) + " Rupees only"
          );
        } else {
          wordSpan.text("");
        }
      }
    })
    .on("blur", function () {
      const input = $(this);
      const location = decodeURIComponent(input.data("location"));
      const numericValue = parseCurrencyInput(input.val());
      input.val(formatCurrencyInput(numericValue));
      update_field_for_location(
        frm,
        location,
        "security_deposit",
        numericValue,
        "Deposit updated"
      );
    });

  // New field handlers (directly generic)
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".address-input")
    .on("blur", function () {
      update_field_for_location(
        frm,
        decodeURIComponent($(this).data("location")),
        "address",
        $(this).val(),
        "Address updated"
      );
    });

  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".floor-input")
    .on("blur", function () {
      update_field_for_location(
        frm,
        decodeURIComponent($(this).data("location")),
        "floor",
        $(this).val(),
        "Floor updated"
      );
    });

  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".contact-input")
    .on("blur", function () {
      update_field_for_location(
        frm,
        decodeURIComponent($(this).data("location")),
        "contact_number",
        $(this).val(),
        "Contact updated"
      );
    });

  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".remarks-input")
    .on("blur", function () {
      update_field_for_location(
        frm,
        decodeURIComponent($(this).data("location")),
        "remarks",
        $(this).val(),
        "Remarks updated"
      );
    });

  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".carpet-area-input")
    .on("blur", function () {
      update_field_for_location(
        frm,
        decodeURIComponent($(this).data("location")),
        "carpet_area",
        $(this).val(),
        "Carpet Area updated"
      );
    });

  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".occupation-input")
    .on("blur", function () {
      update_field_for_location(
        frm,
        decodeURIComponent($(this).data("location")),
        "occupation",
        $(this).val(),
        "Occupation updated"
      );
    });

  // Status select styling + update
  frm.fields_dict.custom_location_details_html.$wrapper
    .find(".status-select")
    .each(function () {
      applyStatusSelectColor(this);
    })
    .on("change", function () {
      applyStatusSelectColor(this);
      const location = decodeURIComponent($(this).data("location"));
      const new_status = $(this).val();
      const $select = $(this);
      $select.prop("disabled", true);
      update_status_for_location(frm, location, new_status);
    });

  function applyStatusSelectColor(selectEl) {
    const val = selectEl.value;
    let bg = "";
    let textColor = "#fff";
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
        textColor = "#212529";
        break;
      default:
        bg = "";
        textColor = "#212529";
        break;
    }
    if (bg) selectEl.style.background = `linear-gradient(${bg}, ${bg})`;
    else selectEl.style.background = "";
    selectEl.style.color = textColor;
  }
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

// Unified function to get field values for a location
function getLocationFieldValue(frm, location, fieldName) {
  const child_table = frm.doc.custom_location_details || [];

  // Filter rows for the specific location
  const locationRows = child_table.filter(
    (row) => row.location_name === location
  );

  if (locationRows.length === 0) return "";

  // Get all unique values for the requested field
  const fieldValues = [...new Set(locationRows.map((row) => row[fieldName]))];

  // For status field, return "Mixed" if there are different values
  if (fieldName === "status") {
    return fieldValues.length === 1 ? fieldValues[0] : "Mixed";
  }

  // For other fields, return the value if all records agree, or empty string if mixed/undefined
  return fieldValues.length === 1 ? fieldValues[0] : "";
}

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

//helper function to  Check if any location is approved
function isAnyLocationApproved(frm) {
  const child_table = frm.doc.custom_location_details || [];
  return child_table.some((row) => row.status === "Approved");
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

  // If we're approving a location, reject all other locations
  if (new_status === "Approved") {
    child_table.forEach((row) => {
      if (row.location_name !== location && row.status !== "Rejected") {
        updates.push(() => {
          return frappe.model.set_value(
            row.doctype,
            row.name,
            "status",
            "Rejected"
          );
        });
      }
    });
  }

  // Update the current location's status
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
      let message = __("Status updated for all items in this location");
      if (new_status === "Approved") {
        message = __(
          "Location approved. All other locations have been rejected."
        );
      }
      frappe.show_alert(
        {
          message: message,
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
      throw err;
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
      },
      { label: "Address", fieldname: "address", fieldtype: "Data" },
      {
        label: "Estimate Rent",
        fieldname: "estimate_rent",
        fieldtype: "Currency",
      },
      {
        label: "Security Deposit",
        fieldname: "security_deposit",
        fieldtype: "Currency",
      },
      { label: "Floor", fieldname: "floor", fieldtype: "Data" },
      { label: "Remarks", fieldname: "remarks", fieldtype: "Small Text" },
      {
        label: "Contact Number",
        fieldname: "contact_number",
        fieldtype: "Data",
      },
      { label: "Occupation", fieldname: "occupation", fieldtype: "Data" },
      { label: "Carpet Area", fieldname: "carpet_area", fieldtype: "Data" },
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
          values.estimate_rent,
          values.address,
          values.security_deposit,
          values.floor,
          values.remarks,
          values.contact_number,
          values.occupation,
          values.carpet_area
        );
      }, 300);
    },
    __("Add New Location"),
    __("Add")
  );
}

function update_location_name_inline(frm, old_location, new_location) {
  if (!new_location || new_location === old_location) return;

  return update_field_for_location(
    frm,
    old_location,
    "location_name",
    new_location,
    "Location name updated"
  );
}

function update_field_for_location(
  frm,
  location,
  fieldname,
  new_value,
  success_message
) {
  const child_table = frm.doc.custom_location_details || [];
  let updates = [];

  child_table.forEach((row) => {
    if (row.location_name === location && row[fieldname] != new_value) {
      updates.push(() => {
        return frappe.model.set_value(
          row.doctype,
          row.name,
          fieldname,
          new_value
        );
      });
    }
  });

  if (updates.length === 0) return Promise.resolve();

  return updates
    .reduce((p, fn) => p.then(fn), Promise.resolve())
    .then(() => {
      frm.refresh_field("custom_location_details");
      render_custom_location_ui_for_task(frm);
      return frm.save();
    })
    .then(() => {
      if (success_message) {
        frappe.show_alert(
          { message: __(success_message), indicator: "green" },
          3
        );
      }
    })
    .catch((err) => {
      console.error(`Error updating ${fieldname}:`, err);
      frappe.msgprint({
        title: __("Error"),
        message: __(`Failed to update ${fieldname}`),
        indicator: "red",
      });
      render_custom_location_ui_for_task(frm);
      throw err;
    });
}

function upload_media_files_for_task(
  frm,
  location,
  estimate_rent,
  extraFields = {}
) {
  new frappe.ui.FileUploader({
    allow_multiple: true,
    restrictions: { allowed_file_types: ["image/*", "video/mp4"] },
    async on_success(file) {
      try {
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
        const updated_file = r.message;

        const new_row = frm.add_child("custom_location_details");
        new_row.location_name = location;
        new_row.location_image = updated_file.file_url;
        new_row.status = "Pending";
        new_row.estimate_rent = estimate_rent || 0;

        // merge all extra fields
        Object.assign(new_row, extraFields);

        frm.refresh_field("custom_location_details");
        render_custom_location_ui_for_task(frm);

        await frm.save();
        frappe.show_alert(
          { message: __("Media uploaded successfully"), indicator: "green" },
          3
        );

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
    .status-select:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background-color: #f5f5f5 !important;
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
    width: 40px;
    height: 40px;
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
  /* Scroll wrapper */
.location-album-container {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-x: auto;   /* horizontal scroll */
  overflow-y: hidden;
  margin-bottom: 20px;
  width: 100%;
}

/* Table layout */
.location-album-container table {
  min-width: 1200px; /* force scroll if small screen */
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  table-layout: fixed;
}

/* Sticky first column (Location Name) */
.location-album-container th:first-child,
.location-album-container td:first-child {
  position: sticky;
  left: 0;
  z-index: 11;
  background: #fff;
  width: 200px;
  min-width: 200px;
  max-width: 200px;
}

/* Images column takes max space */
.location-album-container th:nth-child(2),
.location-album-container td:nth-child(2) {
  width: 400px;
}

/* Other columns fixed widths */
.location-album-container th:nth-child(3),
.location-album-container td:nth-child(3) {
  width: 200px;
  min-width: 200px;
}
.location-album-container th:last-child,
.location-album-container td:last-child {
  width: 120px;
  min-width: 120px;
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

frappe.ui.form.on("Task", {
  refresh(frm) {
    if (!frm.doc.name || frm.doc.__islocal) return;
    setupUserAssignment(frm, "Task", frm.doc.name);
  },
});
