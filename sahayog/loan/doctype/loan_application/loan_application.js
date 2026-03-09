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
    // 2. Customer Name Restriction - Only Alphabets & Spaces
    if (frm.fields_dict.customer_name && frm.fields_dict.customer_name.$input) {
      let name_input = frm.fields_dict.customer_name.$input;

      name_input.on("keypress", function (e) {
        // Allow: A-Z (65-90), a-z (97-122), and Space (32)
        let charCode = e.which;
        if (
          !(charCode >= 65 && charCode <= 90) && // Uppercase
          !(charCode >= 97 && charCode <= 122) && // Lowercase
          charCode !== 32 // Space
        ) {
          e.preventDefault();
          return false;
        }
      });

      // Paste block to clean numbers from name
      name_input.on("paste", function (e) {
        setTimeout(() => {
          let value = $(this)
            .val()
            .replace(/[^a-zA-Z\s]/g, "");
          $(this).val(value);
          frm.set_value("customer_name", value);
        }, 100);
      });
    }
    // 3. PAN/Aadhaar Restriction - Only Alphanumeric, Auto Uppercase
    if (frm.fields_dict.pan__aadhaar && frm.fields_dict.pan__aadhaar.$input) {
      let id_input = frm.fields_dict.pan__aadhaar.$input;

      // Typing block: Sirf Numbers aur Capital Letters allow karein
      // Typing block: Sirf Numbers aur Capital Letters allow karein
      id_input.on("keypress", function (e) {
        let charCode = e.which;
        let current_val = $(this).val();

        // 1. Max length check (12 characters)
        if (current_val.length >= 12) {
          e.preventDefault();
          return false;
        }

        // 2. Allowed characters (0-9, A-Z, a-z)
        if (
          !(charCode >= 48 && charCode <= 57) &&
          !(charCode >= 65 && charCode <= 90) &&
          !(charCode >= 97 && charCode <= 122)
        ) {
          e.preventDefault();
          return false;
        }
      });

      // Auto-Uppercase: PAN hamesha capital mein hota hai
      id_input.on("blur", function () {
        let val = $(this).val().toUpperCase();
        frm.set_value("pan__aadhaar", val);
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
    // Server pe save hone se pehle final check
    if (frm.doc.customer_name && /[^a-zA-Z\s]/.test(frm.doc.customer_name)) {
      frappe.throw(
        __("Customer Name should only contain alphabets and spaces."),
      );
    }

    // Mobile validation check (Existing)
    if (frm.doc.mobile_number && !/^\d{10}$/.test(frm.doc.mobile_number)) {
      frappe.throw(__("Mobile Number must be exactly 10 digits."));
    }
    let val = frm.doc.pan__aadhaar;
    if (val) {
      let is_pan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val); // PAN: ABCDE1234F
      let is_aadhaar = /^\d{12}$/.test(val); // Aadhaar: 12 digits

      if (!is_pan && !is_aadhaar) {
        frappe.throw(
          __("Please Enter valid PAN (ABCDE1234F) or Aadhaar (12 digits)."),
        );
      }
    }
  },
});
