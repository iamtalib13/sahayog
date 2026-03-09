frappe.ui.form.on("Loan Application", {
  refresh: function (frm) {
    frm.trigger("toggle_customer_fields");

    // Check if field is rendered to avoid 'undefined' error
    if (frm.fields_dict.mobile_number && frm.fields_dict.mobile_number.$input) {
      let mobile_input = frm.fields_dict.mobile_number.$input;

      // Unbind previous events to prevent multiple triggers
      mobile_input.off("keypress paste");

      // 1. Strictly block non-numeric typing
      mobile_input.on("keypress", function (e) {
        // Allow only 0-9 (ASCII 48-57)
        if (e.which < 48 || e.which > 57) {
          e.preventDefault();
          return false;
        }
        // Stop typing if length is already 10
        if ($(this).val().length >= 10) {
          e.preventDefault();
          return false;
        }
      });

      // 2. Handle copy-paste
      mobile_input.on("paste", function (e) {
        setTimeout(() => {
          let value = $(this).val().replace(/\D/g, "").slice(0, 10);
          $(this).val(value);
          frm.set_value("mobile_number", value);
        }, 100);
      });
    }
  },

  is_new_customer: function (frm) {
    frm.trigger("toggle_customer_fields");
  },

  toggle_customer_fields: function (frm) {
    // 1 = Locked (Read Only), 0 = Editable
    let lock = frm.doc.is_new_customer ? 0 : 1;

    frm.set_df_property("customer_name", "read_only", lock);
    frm.set_df_property("pan__aadhaar", "read_only", lock);
    frm.set_df_property("mobile_number", "read_only", lock);
  },

  validate: function (frm) {
    if (frm.doc.mobile_number && !/^\d{10}$/.test(frm.doc.mobile_number)) {
      frappe.throw(__("Mobile Number must be exactly 10 digits."));
    }
  },
});
