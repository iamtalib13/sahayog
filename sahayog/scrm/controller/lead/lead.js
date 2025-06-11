frappe.ui.form.on("Lead", {
  refresh(frm) {
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
        ],
      ],
    },
  }));
}

// Set mandatory fields
function setMandtatoryFields(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "reqd", 1));
}
