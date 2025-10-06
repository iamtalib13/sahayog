frappe.ui.form.on("Lead", {
  refresh(frm) {
    hideNamingSeries();

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
  },
});

/* ---------------- Utility Functions ---------------- */
// Add "Assign to" button
function addAssignButton(frm) {
  frm.add_custom_button(__("Assign to"), function () {
    let dialog = new frappe.ui.Dialog({
      title: __("Assign User"),
      fields: [
        {
          fieldname: "branch",
          fieldtype: "Link",
          label: __("Branch"),
          options: "Branch",
          reqd: 1,
          onchange: function () {
            // Clear user field when branch changes
            dialog.set_value("user", "");

            // Update user field options based on selected branch
            let branch = dialog.get_value("branch");
            if (branch) {
              dialog.fields_dict.user.get_query = function () {
                return {
                  query:
                    "sahayog.scrm.controller.lead.lead.get_users_by_branch",
                  filters: {
                    branch: branch,
                  },
                };
              };
              dialog.fields_dict.user.refresh();
            }
          },
        },
        {
          fieldname: "user",
          fieldtype: "Link",
          label: __("User"),
          options: "User",
          reqd: 1,
        },
      ],
      primary_action_label: __("Assign"),
      primary_action: function (values) {
        // First call custom API to validate and update Lead fields
        frappe.call({
          method: "sahayog.scrm.controller.lead.lead.assign_employee_to_lead",
          args: {
            lead_name: frm.doc.name,
            user: values.user,
          },
          callback: function (r) {
            if (r.message && r.message.status === "success") {
              // Only if custom API succeeds → then assign
              frappe.call({
                method: "frappe.desk.form.assign_to.add",
                args: {
                  assign_to: [values.user],
                  doctype: frm.doc.doctype,
                  name: frm.doc.name,
                  notify: 1,
                  description: __("Assigned via dialog"),
                },
                callback: function () {
                  frappe.show_alert({
                    message: __(
                      "Lead assigned and assigned user details updated successfully"
                    ),
                    indicator: "green",
                  });
                  frm.reload_doc();
                  dialog.hide();
                },
              });
            } else {
              frappe.throw(
                __("Failed to update employee fields. Assignment cancelled.")
              );
            }
          },
          error: function () {
            frappe.throw(
              __("Error while updating employee fields. Assignment cancelled.")
            );
          },
        });
      },
    });

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
                  Branch: ${owner.branch || "-"}
                </div>
            `;

            if (assigned) {
              html += `
                <div style="flex: 1; min-width: 200px; padding: 8px; background: #e8f0fe; border-radius: 5px;">
                  <strong>Assigned To</strong><br>
                  Name: ${assigned.employee_name || "-"}<br>
                  Employee ID: ${assigned.employee_number || "-"}<br>
                  Branch: ${assigned.branch || "-"}
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
    frappe.new_doc("Appointment", {
      customer_name: frm.doc.first_name,
      customer_phone_number: frm.doc.mobile_no || frm.doc.phone || "",
      customer_email: frm.doc.email_id || "",
      appointment_with: "Lead",
      party: frm.doc.name,
      status: "Open",
    });
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
