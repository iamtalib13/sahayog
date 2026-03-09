frappe.ui.form.on("Loan Application", {
  onload: function (frm) {
    // Form load hote hi check karega
    frm.trigger("is_new_customer");
  },
  refresh: function (frm) {
    // Form refresh par bhi check karega
    frm.trigger("is_new_customer");
  },
  is_new_customer: function (frm) {
    // Agar checkbox Checked hai (1) toh fields Editable (read_only = 0)
    // Agar checkbox Unchecked hai (0) toh fields Locked (read_only = 1)
    let is_new = frm.doc.is_new_customer ? 0 : 1;

    frm.set_df_property("customer_name", "read_only", is_new);
    frm.set_df_property("pan__aadhaar", "read_only", is_new);
    frm.set_df_property("mobile_number", "read_only", is_new);
  },
});
