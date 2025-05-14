frappe.ui.form.on("Request for Quotation", {
  refresh: function (frm) {
    //Make 'description' field mandatory for all existing rows in child table
    cur_frm.fields_dict.items.grid.toggle_reqd("description", true);
    frm.refresh_field("items");
  },
});

frappe.ui.form.on("Request for Quotation Item", {
  form_render(frm, cdt, cdn) {
    // Get the current child table row document
    let row = locals[cdt][cdn];

    if (row) {
      cur_frm.fields_dict.items.grid.toggle_reqd("description", true);
    } else {
      // console.error("Row is undefined.");
    }
  },
});
