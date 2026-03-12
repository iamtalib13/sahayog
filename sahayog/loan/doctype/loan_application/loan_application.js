frappe.ui.form.on("Loan Application", {
  refresh: function (frm) {
    // Mobile Number Restriction - Only Numbers (10 digits)
    if (frm.fields_dict.mobile_number && frm.fields_dict.mobile_number.$input) {
      let mobile_input = frm.fields_dict.mobile_number.$input;

      mobile_input.off("keypress paste");

      mobile_input.on("keypress", function (e) {
        if (e.which < 48 || e.which > 57) {
          e.preventDefault();
          return false;
        }

        if ($(this).val().length >= 10) {
          e.preventDefault();
          return false;
        }
      });

      mobile_input.on("paste", function () {
        setTimeout(() => {
          let value = $(this).val().replace(/\D/g, "").slice(0, 10);
          $(this).val(value);
          frm.set_value("mobile_number", value);
        }, 100);
      });
    }

    // Customer Name Restriction - Only Alphabets & Spaces
    if (frm.fields_dict.customer_name && frm.fields_dict.customer_name.$input) {
      let name_input = frm.fields_dict.customer_name.$input;

      name_input.off("keypress paste");

      name_input.on("keypress", function (e) {
        let charCode = e.which;

        if (
          !(charCode >= 65 && charCode <= 90) &&
          !(charCode >= 97 && charCode <= 122) &&
          charCode !== 32
        ) {
          e.preventDefault();
          return false;
        }
      });

      name_input.on("paste", function () {
        setTimeout(() => {
          let value = $(this)
            .val()
            .replace(/[^a-zA-Z\s]/g, "");
          $(this).val(value);
          frm.set_value("customer_name", value);
        }, 100);
      });
    }
  },
  // --- CHILD TABLE LIVE TYING RESTRICTION ---
  // Jab aap row edit karte ho, tab ye trigger hota hai
  kyc_documents_on_form_render: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let field = frm.fields_dict.kyc_documents.grid.get_field("document_number");

    if (field && field.$input) {
      field.$input.on("input", function () {
        let val = $(this).val();

        if (row.document_type === "Aadhaar Card") {
          // Real-time: Only numbers and max 12
          let filtered = val.replace(/\D/g, "").slice(0, 12);
          $(this).val(filtered);
          row.document_number = filtered;
        } else if (row.document_type === "PAN Card") {
          // Real-time: Uppercase and max 10
          let filtered = val.toUpperCase().slice(0, 10);
          $(this).val(filtered);
          row.document_number = filtered;
        }
      });
    }
  },
  validate: function (frm) {
    // Customer Name Validation
    if (frm.doc.customer_name && /[^a-zA-Z\s]/.test(frm.doc.customer_name)) {
      frappe.throw(
        __("Customer Name should only contain alphabets and spaces."),
      );
    }

    // Mobile Validation
    if (frm.doc.mobile_number && !/^\d{10}$/.test(frm.doc.mobile_number)) {
      frappe.throw(__("Mobile Number must be exactly 10 digits."));
    }

    // Date of Birth Validation
    if (
      frm.doc.date_of_birth &&
      frappe.datetime.get_today() < frm.doc.date_of_birth
    ) {
      frappe.throw(__("Date of Birth cannot be in the future."));
    }

    // CIBIL Score Validation
    if (frm.doc.cibil_score) {
      if (frm.doc.cibil_score < 300 || frm.doc.cibil_score > 900) {
        if (frm.doc.cibil_score !== -1 && frm.doc.cibil_score !== 0) {
          frappe.throw(
            __(
              "CIBIL Score must be between 300 and 900, or -1 for No History, or 0 for Not Checked.",
            ),
          );
        }
      }
    }

    // KYC Documents Validation
    if (!frm.doc.kyc_documents || frm.doc.kyc_documents.length === 0) {
      frappe.throw(__("At least one KYC Document is required."));
    }

    // Positive Value Validations
    if (frm.doc.loan_amount && frm.doc.loan_amount <= 0) {
      frappe.throw(__("Loan Amount must be greater than zero."));
    }

    if (frm.doc.tenure_months && frm.doc.tenure_months <= 0) {
      frappe.throw(__("Tenure (Months) must be greater than zero."));
    }

    if (frm.doc.gold_rate_per_gram && frm.doc.gold_rate_per_gram <= 0) {
      frappe.throw(__("Gold Rate (per gram) must be greater than zero."));
    }

    // Loan Amount vs Eligible Amount Validation
    if (frm.doc.loan_amount && frm.doc.eligible_loan_amount) {
      if (frm.doc.loan_amount > frm.doc.eligible_loan_amount) {
        frappe.throw(
          __(
            "Loan Amount ({0}) cannot exceed the Eligible Loan Amount ({1}).",
            [frm.doc.loan_amount, frm.doc.eligible_loan_amount],
          ),
        );
      }
    }

    // LTV Percent Validation
    if (frm.doc.ltv_percent && frm.doc.ltv_percent > 75) {
      frappe.throw(__("LTV Percent (%) cannot exceed 75%."));
    }
    // KYC Documents Deep Validation
    if (frm.doc.kyc_documents) {
      frm.doc.kyc_documents.forEach((doc) => {
        if (doc.document_type === "Aadhaar Card") {
          // Check if exactly 12 digits
          if (!/^\d{12}$/.test(doc.document_number)) {
            frappe.throw(
              __("Row #{0}: Aadhaar Card number must be exactly 12 digits.", [
                doc.idx,
              ]),
            );
          }
        } else if (doc.document_type === "PAN Card") {
          // PAN Format: 5 Alphabets, 4 Digits, 1 Alphabet (e.g., ABCDE1234F)
          let pan_regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          if (!pan_regex.test(doc.document_number)) {
            frappe.throw(
              __(
                "Row #{0}: Invalid PAN Card format. It should be like ABCDE1234F.",
                [doc.idx],
              ),
            );
          }
        }
      });
    }
  },
  customer_name: function (frm) {
    if (frm.doc.customer_name) {
      let formatted = frm.doc.customer_name
        .toLowerCase()
        .replace(/\b\w/g, function (l) {
          return l.toUpperCase();
        });

      frm.set_value("customer_name", formatted);
    }
  },
});
frappe.ui.form.on("Loan Document", {
  document_number: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let val = row.document_number || "";

    if (row.document_type === "Aadhaar Card") {
      // Sirf numbers rakho aur max 12 digits
      let formatted = val.replace(/\D/g, "").slice(0, 12);
      if (val !== formatted) {
        frappe.model.set_value(cdt, cdn, "document_number", formatted);
      }
    } else if (row.document_type === "PAN Card") {
      // Uppercase karo aur max 10 chars
      let formatted = val.toUpperCase().slice(0, 10);
      if (val !== formatted) {
        frappe.model.set_value(cdt, cdn, "document_number", formatted);
      }
    }
  },
});
