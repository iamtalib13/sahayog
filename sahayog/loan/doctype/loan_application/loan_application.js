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
    if (frm.fields_dict.pan_number && frm.fields_dict.pan_number.$input) {
      let pan_input = frm.fields_dict.pan_number.$input;

      pan_input.off("keypress paste");

      pan_input.on("keypress", function (e) {
        let charCode = e.which;
        let val = $(this).val();

        if (val.length >= 10) {
          e.preventDefault();
          return false;
        }

        if (
          !(charCode >= 48 && charCode <= 57) &&
          !(charCode >= 65 && charCode <= 90) &&
          !(charCode >= 97 && charCode <= 122)
        ) {
          e.preventDefault();
          return false;
        }
      });

      pan_input.on("blur", function () {
        let val = $(this).val().toUpperCase();
        frm.set_value("pan_number", val);
      });
    }

    if (
      frm.fields_dict.aadhaar_number &&
      frm.fields_dict.aadhaar_number.$input
    ) {
      let aadhaar_input = frm.fields_dict.aadhaar_number.$input;

      aadhaar_input.off("keypress paste");

      aadhaar_input.on("keypress", function (e) {
        let charCode = e.which;

        if (charCode < 48 || charCode > 57) {
          e.preventDefault();
          return false;
        }

        if ($(this).val().length >= 12) {
          e.preventDefault();
          return false;
        }
      });

      aadhaar_input.on("paste", function () {
        setTimeout(() => {
          let value = $(this).val().replace(/\D/g, "").slice(0, 12);
          $(this).val(value);
          frm.set_value("aadhaar_number", value);
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
    frm.set_df_property("pan_number", "read_only", lock);
    frm.set_df_property("aadhaar_number", "read_only", lock);
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
    // PAN validation
    if (
      frm.doc.pan_number &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(frm.doc.pan_number)
    ) {
      frappe.throw(__("Invalid PAN format. Example: ABCDE1234F"));
    }

    // Aadhaar validation
    if (frm.doc.aadhaar_number && !/^\d{12}$/.test(frm.doc.aadhaar_number)) {
      frappe.throw(__("Aadhaar Number must be exactly 12 digits."));
    }
    if (frm.doc.cibil_score) {
      if (frm.doc.cibil_score < 300 || frm.doc.cibil_score > 900) {
        // Sirf tab allow karein agar score -1 (No History) hai
        if (frm.doc.cibil_score !== -1 && frm.doc.cibil_score !== 0) {
          frappe.throw(
            __(
              "CIBIL Score must be between 300 and 900, or -1 for No History, or 0 for Not Checked.",
            ),
          );
        }
      }
    }
    if (frm.doc.kyc_status === "Rejected") {
      frappe.msgprint(
        __(
          "KYC Status is Rejected. Please ensure KYC is verified before proceeding.",
        ),
      );
      frappe.validated = false;
    }
  },
});
