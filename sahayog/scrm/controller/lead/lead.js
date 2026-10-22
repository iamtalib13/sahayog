frappe.ui.form.on("Lead", {
  refresh(frm) {
    hideNamingSeries();
    frm.set_df_property("custom_verification_section", "collapsible", 0);
    setVerificationHighlight(frm);
    toggleCallingSource(frm);
    toggleAuditStatusAndLock(frm);
    customizeTimelineTimestamps(frm);

    if (!frm.is_new()) {
      addAssignButton(frm); // ✅ Only show when form is not new
      customizeButtons(frm);
      addAppointmentButton(frm);
      setIntro(frm); // Display assigned employee details
    }

    if (!isAdmin()) {
      hideFields(frm, getHiddenFields());
      frm.set_df_property("first_name", "label", "Full Name");
      makeFieldsReadOnly(frm, ["lead_owner"]);
      setSourceFilter(frm);
      setMandatoryFields(frm, ["source", "mobile_no"]);
    }
  },

  validate(frm) {
    validateMobileNumber(frm.doc.mobile_no);

    // Validate Account details when Converting an Operation Lead
    if (frm.doc.custom_is_operation_lead && frm.doc.status === "Converted") {
      const rows = frm.doc.custom_product_table || [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.account_number || !row.account_creation_date) {
          frappe.throw(
            __("Row {0}: Account Number and Account Creation Date are mandatory to convert an Operation Lead.", [i + 1])
          );
        }
      }
    }
  },
});

/* ---------------- Utility Functions ---------------- */
function setVerificationHighlight(frm) {
  if (frm.is_new()) return;
  const status = frm.doc.custom_verification_status || "Pending";

  setTimeout(() => {
    let f = frm.get_field("custom_verification_status");
    if (f && f.$wrapper) {
      let $input = f.$wrapper.find("input, select, .control-value");
      if (status === "Pending") {
        $input.css({
          "background-color": "#fef3c7",
          "border": "2px solid #f59e0b",
          "color": "#92400e",
          "border-radius": "6px",
          "font-weight": "bold"
        });
      } else if (status === "Verified") {
        $input.css({
          "background-color": "#dcfce7",
          "border": "2px solid #22c55e",
          "color": "#166534",
          "border-radius": "6px",
          "font-weight": "bold"
        });
      } else if (status === "Rejected") {
        $input.css({
          "background-color": "#fee2e2",
          "border": "2px solid #ef4444",
          "color": "#991b1b",
          "border-radius": "6px",
          "font-weight": "bold"
        });
      }
    }
  }, 200);

  if (status === "Pending") {
    frm.dashboard.set_headline(
      __("⚠️ <b>BM Verification Pending:</b> This lead is currently pending for Branch Manager Verification."),
      "orange"
    );
  } else if (status === "Verified") {
    let vBy = frm.doc.custom_verified_by || "BM";
    let vOn = frm.doc.custom_verified_on ? frappe.datetime.str_to_user(frm.doc.custom_verified_on) : "";
    frm.dashboard.set_headline(
      __("✅ <b>BM Verified:</b> This lead has been verified by <b>{0}</b> on <b>{1}</b>.", [vBy, vOn]),
      "green"
    );
  } else if (status === "Rejected") {
    let rem = frm.doc.custom_verification_remarks || "No remarks";
    frm.dashboard.set_headline(
      __("❌ <b>BM Verification Rejected:</b> Remarks: {0}", [rem]),
      "red"
    );
  }
}

// Add "Assign to" button

function addAssignButton(frm) {
  frm.add_custom_button(__("Assign to"), function () {
    let dialog = new frappe.ui.Dialog({
      title: __("Assign User"),
      fields: [
        // =====================
        // 1️⃣ Branch
        // =====================
        {
          fieldname: "branch",
          fieldtype: "Link",
          label: __("Branch"),
          options: "Branch",
          reqd: 1,
          onchange() {
            dialog.set_value("designation", "");
            dialog.set_value("user", "");

            const branch = dialog.get_value("branch");

            dialog.get_field("designation").df.hidden = !branch;
            dialog.get_field("user").df.hidden = 1;

            dialog.get_field("designation").refresh();
            dialog.get_field("user").refresh();
          },
        },

        // =====================
        // 2️⃣ Designation
        // =====================
        {
          fieldname: "designation",
          fieldtype: "Link",
          label: __("Designation"),
          options: "Designation",
          reqd: 1,
          onchange() {
            dialog.set_value("user", "");

            const branch = dialog.get_value("branch");
            const designation = dialog.get_value("designation");

            if (!branch) {
              frappe.msgprint(__("Please select Branch first"));
              dialog.set_value("designation", "");
              return;
            }

            let user_field = dialog.get_field("user");
            user_field.df.hidden = !(branch && designation);
            user_field.refresh();

            if (branch && designation) {
              dialog.fields_dict.user.get_query = () => ({
                query:
                  "sahayog.scrm.controller.lead.lead.get_users_by_branch_and_designation",
                filters: {
                  branch,
                  designation,
                },
              });
            }
          },
        },

        // =====================
        // 3️⃣ User
        // =====================
        {
          fieldname: "user",
          fieldtype: "Link",
          label: __("User"),
          options: "User",
          reqd: 1,
        },
      ],

      // =====================
      // Assign Action
      // =====================
      primary_action_label: __("Assign"),
      primary_action(values) {
        frappe.call({
          method:
            "sahayog.scrm.controller.lead.lead.assign_employee_to_lead",
          args: {
            lead_name: frm.doc.name,
            user: values.user,
          },
          callback(r) {
            if (r.message?.status === "success") {
              frappe.call({
                method: "frappe.desk.form.assign_to.add",
                args: {
                  assign_to: [values.user],
                  doctype: frm.doc.doctype,
                  name: frm.doc.name,
                  notify: 1,
                },
                callback() {
                  frappe.show_alert({
                    message: __("Lead assigned successfully"),
                    indicator: "green",
                  });
                  frm.reload_doc();
                  dialog.hide();
                },
              });
            } else {
              frappe.throw(__("Assignment failed"));
            }
          },
        });
      },
    });

    // Initial hide
    dialog.get_field("designation").df.hidden = 1;
    dialog.get_field("user").df.hidden = 1;
    dialog.get_field("designation").refresh();
    dialog.get_field("user").refresh();

    dialog.show();
  });
}


// Set introductory message showing Lead Owner + Assigned User
function setIntro(frm) {
  frm.set_intro(""); // clear first

  if (!frm.doc.__islocal) {
    // Fetch lead owner info
    frappe.call({
      method: "sahayog.scrm.controller.lead.lead.get_lead_owner_info",
      args: { lead_name: frm.doc.name },
      callback: function (ownerRes) {
        const owner = ownerRes.message || {};

        // Fetch assigned employee info
        frappe.call({
          method:
            "sahayog.scrm.controller.lead.lead.get_assigned_employee_info",
          args: { lead_name: frm.doc.name },
          callback: function (assignedRes) {
            const assigned = assignedRes.message || null;

            // Build intro HTML
            let html = `
              <div style="display: flex; gap: 40px; flex-wrap: wrap; font-size: 13px;">
                <div style="flex: 1; min-width: 200px; padding: 8px; background: #f5f5f5; border-radius: 5px;">
                  <strong>Lead Owner</strong><br>
                  Name: ${owner.employee_name || "-"}<br>
                  Employee ID: ${owner.employee_number || "-"}<br>
                  Branch: ${owner.branch || "-"}<br>
                  Designation: ${owner.designation || "-"}
                </div>
            `;

            if (assigned) {
              html += `
                <div style="flex: 1; min-width: 200px; padding: 8px; background: #e8f0fe; border-radius: 5px;">
                  <strong>Assigned To</strong><br>
                  Name: ${assigned.employee_name || "-"}<br>
                  Employee ID: ${assigned.employee_number || "-"}<br>
                  Branch: ${assigned.branch || "-"}<br>
                  Designation: ${assigned.designation || "-"}
                </div>
              `;
            }

            html += `</div>`;

            frm.set_intro(html);
          },
        });
      },
    });
  }
}

// Hide naming_series field
function hideNamingSeries() {
  $('div[data-fieldname="naming_series"]').hide();
}

// Customize default buttons
function customizeButtons(frm) {
  setTimeout(() => {
    ["Customer", "Prospect", "Quotation", "Opportunity"].forEach((btn) =>
      frm.remove_custom_button(btn, "Create")
    );
    frm.remove_custom_button("Add to Prospect", "Action");
  }, 100);
}

// Add "Create Appointment" button
function addAppointmentButton(frm) {
  frm.add_custom_button("Create Appointment", () => {
    let dialog = new frappe.ui.Dialog({
      title: __("Create New Appointment"),
      fields: [
        {
          fieldname: "scheduled_time",
          fieldtype: "Datetime",
          label: __("Scheduled Time"),
          reqd: 1,
        },
        {
          fieldname: "status",
          fieldtype: "Select",
          label: __("Status"),
          options: "Open\nClosed",
          default: "Open",
        },
        {
          fieldname: "customer_name",
          fieldtype: "Data",
          label: __("Customer Name"),
          default: frm.doc.first_name,
          read_only: 1,
        },
        {
          fieldname: "customer_phone_number",
          fieldtype: "Data",
          label: __("Phone"),
          default: frm.doc.mobile_no || frm.doc.phone || "",
          read_only: 1,
        },
        {
          fieldname: "customer_email",
          fieldtype: "Data",
          label: __("Email"),
          default: frm.doc.email_id || "",
          read_only: 1,
        },
        {
          fieldname: "customer_details",
          fieldtype: "Small Text",
          label: __("Remarks / Notes"),
        },
      ],
      primary_action_label: __("Create"),
      primary_action(values) {
        frappe.call({
          method: "frappe.client.insert",
          args: {
            doc: {
              doctype: "Appointment",
              appointment_with: "Lead",
              party: frm.doc.name,
              scheduled_time: values.scheduled_time,
              status: values.status,
              customer_name: values.customer_name,
              customer_phone_number: values.customer_phone_number,
              customer_email: values.customer_email,
              customer_details: values.customer_details,
            },
          },
          freeze: true,
          freeze_message: __("Creating Appointment..."),
          callback(r) {
            if (!r.exc) {
              frappe.show_alert({
                message: __("Appointment created successfully"),
                indicator: "green",
              });
              dialog.hide();
              frm.reload_doc();
            }
          },
        });
      },
    });
    dialog.show();
  });
}

// Check if current user is Administrator
function isAdmin() {
  return frappe.session.user === "Administrator";
}

// Fields to hide
function getHiddenFields() {
  return [
    "lead_name",
    "middle_name",
    "last_name",
    "job_title",
    "type",
    "gender",
    "email_id",
    "lead_owner",
    "salutation",
    "request_type",
    "website",
    "phone",
    "whatsapp_no",
    "phone_ext",
    "organization_section",
    "other_info_tab",
    "qualification_tab",
    "address_html",
    "contact_html",
    "dashboard_tab",
    "address_section",
    "customer",
    "custom_lead_owner_details_section",
  ];
}

// Hide multiple fields
function hideFields(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "hidden", true));

  // Hide tabs
  [
    "lead-activities_tab-tab",
    "lead-notes_tab-tab",
    "lead-dashboard_tab-tab",
  ].forEach((tab) => $("#" + tab).hide());
}

// Make multiple fields read-only
function makeFieldsReadOnly(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "read_only", 1));
}

// Apply filter to source field
function setSourceFilter(frm) {
  frm.set_query("source", () => ({
    filters: {
      name: [
        "in",
        [
          "Walk In",
          "Campaign",
          "Advertisement",
          "Reference",
          "Existing Customer",
          "Calling",
          "Marketing Activity",
          "TeleCalling",
        ],
      ],
    },
  }));
}

// Set mandatory fields
function setMandatoryFields(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "reqd", 1));
}

// Validate mobile number
function validateMobileNumber(mobile) {
  const mobileRegex = /^[6-9]\d{9}$/;
  if (mobile && !mobileRegex.test(mobile)) {
    frappe.throw(__("Please enter a valid 10-digit mobile number."));
  }
}

function canAuditLeadProduct() {
  const user_roles = frappe.user_roles || [];
  const is_admin = frappe.session.user === "Administrator";
  const is_sys_mgr = user_roles.includes("System Manager");
  const is_ops_mgr = user_roles.includes("Operations Support Manager");
  const is_emp_1034 =
    frappe.session.user === "1034@sahayog.com" ||
    (frappe.boot && frappe.boot.user && (frappe.boot.user.name === "1034" || frappe.boot.user.employee_number === "1034"));

  return is_admin || is_sys_mgr || is_ops_mgr || is_emp_1034;
}

frappe.ui.form.on("Lead Product", {
  account_number(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.account_number) {
      // Strip non-digits and limit to max 15 digits
      const sanitized = String(row.account_number).replace(/\D/g, "").slice(0, 15);
      if (row.account_number !== sanitized) {
        frappe.model.set_value(cdt, cdn, "account_number", sanitized);
      }
    }
  },

  form_render(frm, cdt, cdn) {
    const user_roles = frappe.user_roles || [];
    const is_operations =
      user_roles.includes("Operations Support Manager") ||
      user_roles.includes("Operations Support Executive") ||
      (frappe.session.user === "Administrator");

    const row = locals[cdt][cdn];
    const can_audit = canAuditLeadProduct();
    const grid_row = frm.fields_dict["custom_product_table"].grid.get_row(cdn);

    if (grid_row) {
      grid_row.toggle_display("account_number", is_operations);
      grid_row.toggle_display("account_creation_date", is_operations);

      // Attach listener to block non-digits and limit to 15 digits
      if (grid_row.grid_form && grid_row.grid_form.fields_dict.account_number) {
        const input_field = grid_row.grid_form.fields_dict.account_number.$wrapper.find("input");
        if (input_field && input_field.length) {
          input_field.attr("maxlength", 15);
          input_field.off("input.ac_filter").on("input.ac_filter", function () {
            this.value = this.value.replace(/[^0-9]/g, "").slice(0, 15);
          });
        }
      }

      // If Approved or Rejected row and user is NOT authorized, lock all fields and hide delete button
      if (["Approved", "Rejected"].includes(row.audit_status) && !can_audit) {
        ["product", "product_name", "product_amount", "account_number", "account_creation_date", "audit_status"].forEach((fn) => {
          grid_row.toggle_editable(fn, false);
        });
        if (grid_row.grid_form && grid_row.grid_form.wrapper) {
          grid_row.grid_form.wrapper.find("input, select, textarea, button.btn-open-row").prop("disabled", true);
          grid_row.grid_form.wrapper.find(".grid-delete-row, .grid-duplicate-row").hide();
        }
      }
    }
  }
});

// Show custom_calling_source only for Operations roles
function toggleCallingSource(frm) {
  const user_roles = frappe.user_roles || [];
  const is_operations =
    user_roles.includes("Operations Support Manager") ||
    user_roles.includes("Operations Support Executive") ||
    (frappe.session.user === "Administrator");

  frm.toggle_display("custom_calling_source", is_operations);
}

// Handle Lead Product Audit Status read-only/editability in child table
function toggleAuditStatusAndLock(frm) {
  const can_audit = canAuditLeadProduct();
  const grid = frm.fields_dict["custom_product_table"] && frm.fields_dict["custom_product_table"].grid;
  if (!grid) return;

  // Make audit_status read-only in the child table grid for non-auditors
  grid.update_docfield_property(
    "audit_status",
    "read_only",
    can_audit ? 0 : 1
  );

  // If not auditor, lock grid rows that are Approved or Rejected completely
  if (!can_audit) {
    const lockRows = () => {
      (grid.grid_rows || []).forEach((grid_row) => {
        if (grid_row.doc && ["Approved", "Rejected"].includes(grid_row.doc.audit_status)) {
          if (grid_row.row) {
            // Disable inline inputs in grid view
            grid_row.row.find("input, select, textarea").prop("disabled", true);
            // Hide delete & duplicate/move action buttons
            grid_row.row.find(".grid-delete-row, .grid-duplicate-row, .grid-move-row").hide();
            // Locked visual styling on data columns, while keeping pencil (btn-open-row) clickable
            grid_row.row.css({
              "background-color": "#f8fafc"
            });
            grid_row.row.find(".grid-static-col:not(:has(.btn-open-row)), .col:not(:has(.btn-open-row))").css({
              "pointer-events": "none",
              "cursor": "not-allowed"
            });
          }
        }
      });
    };

    lockRows();
    setTimeout(lockRows, 200);
    setTimeout(lockRows, 600);
  }
}

// Format timeline & sidebar activity timestamps as: 'Day, DD-MMM-YYYY hh:mm A'
function customizeTimelineTimestamps(frm) {
  if (frm.is_new()) return;

  const formatActivityDate = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const dayName = days[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, "0");
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? String(hours).padStart(2, "0") : "12";

    return dayName + ", " + dateNum + "-" + monthName + "-" + year + " " + hours + ":" + minutes + " " + ampm;
  };

  const applyCustomFormat = () => {
    // 1. Sidebar (.modified-by & .created-by)
    $(".modified-by, .created-by").each(function () {
      const $el = $(this);
      const text = $el.text();
      const is_mod = $el.hasClass("modified-by") || text.includes("last edited");
      const dt = is_mod ? frm.doc.modified : frm.doc.creation;
      if (!dt) return;

      const user_prefix = is_mod
        ? (frm.doc.modified_by === frappe.session.user ? __("You last edited this") : frm.doc.modified_by + " " + __("last edited this"))
        : (frm.doc.owner === frappe.session.user ? __("You created this") : frm.doc.owner + " " + __("created this"));

      $el.html(user_prefix + " · " + formatActivityDate(dt));
    });

    // 2. Timeline items in footer
    $(".timeline-item").each(function () {
      const $item = $(this);
      const timestamp = $item.attr("data-timestamp");
      if (timestamp) {
        $item.find(".timeline-content > span").each(function () {
          const $s = $(this);
          if ($s.text().startsWith(" · ")) {
            $s.text(" · " + formatActivityDate(timestamp));
          }
        });
      }
    });
  };

  // Run immediately and periodically until rendered
  applyCustomFormat();
  [200, 500, 1000, 2000].forEach((ms) => setTimeout(applyCustomFormat, ms));
}
