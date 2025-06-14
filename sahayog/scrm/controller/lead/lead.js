frappe.ui.form.on("Lead", {
  refresh(frm) {
    // Add "Create Appointment" button
    if (!frm.is_new()) {
      // Remove the default "Customer" button under the "Create" group
      setTimeout(() => {
        frm.remove_custom_button("Customer", "Create");
        frm.remove_custom_button("Prospect", "Create");
        frm.remove_custom_button("Quotation", "Create");
        frm.remove_custom_button("Opportunity", "Create");
        frm.remove_custom_button("Add to Prospect", "Action");
      }, 100);

      frm.add_custom_button(
        "Create Appointment",
        () => {
          frappe.new_doc("Appointment", {
            customer_name: frm.doc.first_name,
            customer_phone_number: frm.doc.mobile_no || frm.doc.phone || "",
            customer_email: frm.doc.email_id || "",
            appointment_with: "Lead",
            party: frm.doc.name,
            status: "Open",
          });
        },
        __("Create")
      );
    }

    if (isAdmin()) return;

    hideFields(frm, [
      "lead_name",
      "middle_name",
      "last_name",
      "job_title",
      "type",
      "request_type",
      "website",
      "phone",
      "phone_ext",
      "organization_section",
      "other_info_tab",
      "qualification_tab",
      "address_html",
      "contact_html",
    ]);

    frm.set_df_property("first_name", "label", "Full Name");

    makeFieldsReadOnly(frm, ["lead_owner"]);
    setFilterOnFields(frm);
    setMandtatoryFields(frm, ["source", "mobile_no"]);
  },
});

//  Check if current user is Administrator
function isAdmin() {
  return frappe.session.user === "Administrator";
}

// Hide multiple fields
function hideFields(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "hidden", true));

  $("#lead-activities_tab-tab").hide();
  $("#lead-notes_tab-tab").hide();
}

//  Make multiple fields read-only
function makeFieldsReadOnly(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "read_only", 1));
}

// Apply filter to source field
function setFilterOnFields(frm) {
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
function setMandtatoryFields(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "reqd", 1));
}
