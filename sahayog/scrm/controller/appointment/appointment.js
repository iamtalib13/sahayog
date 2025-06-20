frappe.ui.form.on("Appointment", {
  refresh(frm) {
    hideFields(frm, ["customer_skype"]);
  },
});

function hideFields(frm, fields) {
  fields.forEach((field) => frm.set_df_property(field, "hidden", true));
}
