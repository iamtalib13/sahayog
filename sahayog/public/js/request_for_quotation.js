frappe.ui.form.on("Request for Quotation", {
  refresh: function (frm) {
    //Make 'description' field mandatory for all existing rows in child table
    cur_frm.fields_dict.items.grid.toggle_reqd("description", true);
    frm.refresh_field("items");
  },
});

frappe.ui.form.on("Request for Quotation Item", {
  // item_code: function (frm, cdt, cdn) {
  //   let row = locals[cdt][cdn];
  //   row.description = ""; // Blank the description

  //   frm.refresh_field("items"); // Refresh the child table
  // },

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
