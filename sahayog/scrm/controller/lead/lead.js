frappe.ui.form.on("Lead", {
  refresh(frm) {
    hideNamingSeries();

    if (!frm.is_new()) {
      addAssignButton(frm); // ✅ Only show when form is not new
      customizeButtons(frm);
      addAppointmentButton(frm);
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

// Add "Assign" button
function addAssignButton(frm) {
  frm.add_custom_button(__("Assign"), () => {
    const d = new frappe.ui.Dialog({
      title: __("Assign Lead"),
      fields: [
        {
          label: "Branch",
          fieldname: "branch",
          fieldtype: "Link",
          options: "Branch",
          reqd: 1,
          change: function () {
            // Update employee query whenever branch changes
            d.set_query("employee", () => {
              const branch = d.get_value("branch") || "";
              return { filters: { branch } };
            });

            d.set_value("employee", "");
          },
        },
        {
          label: "Employee",
          fieldname: "employee",
          fieldtype: "Link",
          options: "Employee",
          ignore_user_permissions: 1,
          reqd: 1,
        },
      ],
      primary_action_label: __("Assign"),
      primary_action(values) {
        if (!values.branch || !values.employee) {
          frappe.msgprint(__("Please select both Branch and Employee"));
          return;
        }

        frappe.db.get_value("Employee", values.employee, "branch", (r) => {
          if (r && r.branch !== values.branch) {
            frappe.msgprint(
              __("Selected employee does not belong to the chosen branch.")
            );
            return;
          }

          frm.set_value("custom_assigned_to", values.employee);
          d.hide();
        });
      },
    });

    d.show();
  });
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
