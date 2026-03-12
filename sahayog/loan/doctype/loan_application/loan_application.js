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
    if (frm.doc.date_of_birth && frappe.datetime.get_today() < frm.doc.date_of_birth) {
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
          __("Loan Amount ({0}) cannot exceed the Eligible Loan Amount ({1}).", [
            frm.doc.loan_amount,
            frm.doc.eligible_loan_amount,
          ]),
        );
      }
    }

    // LTV Percent Validation
    if (frm.doc.ltv_percent && frm.doc.ltv_percent > 75) {
      frappe.throw(__("LTV Percent (%) cannot exceed 75%."));
    }
  },
});
