frappe.ui.form.on("Lead", {
  refresh(frm) {
    if (!isAdmin()) return;

    hideFields(frm, [
      "full_name",
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

    makeFieldsReadOnly(frm, ["lead_owner"]);
    setSelectFieldOptions(frm);
    setFilterOnFields(frm);
    setMandtatoryFields(frm, ["source", "mobile_no"]);
  },

  // Before saving the document
  before_save(frm) {
    if (frm.doc.custom_full_name) {
      frm.set_value("first_name", frm.doc.custom_full_name);
    }
  },
});

//  Check if current user is Administrator
function isAdmin() {
  return frappe.session.user === "Administrator";
}

// Hide multiple fields
function hideFields(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "hidden", true));
}

//  Make multiple fields read-only
function makeFieldsReadOnly(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "read_only", 1));
}

//  Set custom options for the status field
function setSelectFieldOptions(frm) {
  const options = [
    "Lead",
    "New",
    "Converted",
    "Follow Up",
    "Not Interested",
    "Opportunity",
  ];
  frm.set_df_property("status", "options", options.join("\n"));
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
