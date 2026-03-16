frappe.ui.form.on("Loan Application", {
  refresh: function (frm) {
    // 1. Workflow Button Logic
    if (frm.doc.docstatus === 0) {
      if (frm.doc.status === "Draft") {
        frm.add_custom_button(__("Send to Credit Team"), () => {
          frm.set_value("status", "Under Review");
          frm.save();
        });
      }
      if (frm.doc.status === "Under Review") {
        frm.add_custom_button(
          __("Approve Application"),
          () => {
            frm.set_value("status", "Approved");
            frm.save();
          },
          __("Actions"),
        );
        frm.add_custom_button(
          __("Reject Application"),
          () => {
            frm.set_value("status", "Rejected");
            frm.save();
          },
          __("Actions"),
        );
      }
    }

    // 2. Field Restrictions based on Stage
    if (frm.doc.status !== "Draft" && frm.doc.docstatus === 0) {
      // frm.set_df_property("customer_name", "read_only", 1);
      // frm.set_df_property("mobile_number", "read_only", 1);
      // frm.set_df_property("loan_amount", "read_only", 1);
      // frm.set_df_property("loan_type", "read_only", 1);
    }

    // 3. UI Styling for Status
    if (frm.doc.status === "Approved")
      frm.page.set_indicator("Approved", "green");
    else if (frm.doc.status === "Rejected")
      frm.page.set_indicator("Rejected", "red");
    else if (frm.doc.status === "Under Review")
      frm.page.set_indicator("Under Review", "orange");

    // Mobile Number Restriction - Only Numbers (10 digits)
    if (frm.fields_dict.mobile_number && frm.fields_dict.mobile_number.$input) {
      let mobile_input = frm.fields_dict.mobile_number.$input;

      mobile_input.off("keypress paste");

      mobile_input.on("keypress", function (e) {
        // Only allow numbers (48-57 are keycodes for 0-9)
        if (e.which < 48 || e.which > 57) {
          e.preventDefault();
          return false;
        }

        // Limit to 10 digits
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

    // 4. KYC Table Real-time Validation (Stop Infinite Inputting)
    if (frm.fields_dict.kyc_documents && frm.fields_dict.kyc_documents.grid) {
      $(frm.fields_dict.kyc_documents.grid.wrapper).on("keypress", 'input[data-fieldname="document_number"]', function (e) {
        let grid_row = $(this).closest(".grid-row");
        let row_id = grid_row.attr("data-name");
        let row = frappe.get_doc("Loan Document", row_id);
        let val = $(this).val();

        if (row && row.document_type === "Aadhaar Card") {
          // Aadhaar: 12 digits numeric
          if (e.which < 48 || e.which > 57 || val.length >= 12) {
            e.preventDefault();
            return false;
          }
        } else if (row && row.document_type === "PAN Card") {
          // PAN: 10 chars, strict alphanumeric
          if (val.length >= 10) {
            e.preventDefault();
            return false;
          }
          let char = String.fromCharCode(e.which).toUpperCase();
          let i = val.length;
          // Format: LLLLL NNNN L
          if (i < 5 || i === 9) { // 0-4 and 9 are Letters
            if (!/[A-Z]/.test(char)) { e.preventDefault(); return false; }
          } else if (i >= 5 && i <= 8) { // 5-8 are Digits
            if (!/\d/.test(char)) { e.preventDefault(); return false; }
          }
        }
      });

      // Handle Paste for KYC (Auto-trim)
      $(frm.fields_dict.kyc_documents.grid.wrapper).on("paste", 'input[data-fieldname="document_number"]', function () {
        let $input = $(this);
        let grid_row = $input.closest(".grid-row");
        let row_id = grid_row.attr("data-name");
        let row = frappe.get_doc("Loan Document", row_id);

        setTimeout(() => {
          let val = $input.val().toUpperCase();
          if (row && row.document_type === "Aadhaar Card") {
            $input.val(val.replace(/\D/g, "").slice(0, 12));
          } else if (row && row.document_type === "PAN Card") {
            $input.val(val.slice(0, 10));
          }
          $input.trigger("change");
        }, 100);
      });
    }
  },
// customer name auto-capitalization
  customer_name: function (frm) {
    if (frm.doc.customer_name) {
      let capitalized = frm.doc.customer_name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      
      if (frm.doc.customer_name !== capitalized) {
        frm.set_value("customer_name", capitalized);
      }
    }
  },

  loan_type: function (frm) {
    if (frm.doc.loan_type) {
      frappe.db.get_doc("Loan Type", frm.doc.loan_type).then((policy) => {
        frm.set_value("interest_rate", policy.interest_rate);
        frm.set_value("processing_fee", policy.processing_fee);
        frm.set_value("valuation_charges", policy.valuation_charges);
        frm.trigger("recalculate_all");
      });
    }
  },

  loan_amount: function (frm) {
    frm.trigger("recalculate_all");
  },
  gold_rate_per_gram: function (frm) {
    frm.trigger("recalculate_all");
  },
  
  date_of_birth: function(frm) {
    if (frm.doc.date_of_birth && frappe.datetime.get_today() < frm.doc.date_of_birth) {
      frappe.msgprint(__("Date of Birth cannot be in the future."));
      frm.set_value("date_of_birth", "");
    }
  },

  tenure_months: function (frm) {
    frm.trigger("recalculate_all");
  },
  processing_fee: function (frm) {
    frm.trigger("recalculate_all");
  },
  valuation_charges: function (frm) {
    frm.trigger("recalculate_all");
  },
  stamp_duty: function (frm) {
    frm.trigger("recalculate_all");
  },

  recalculate_all: function (frm) {
    let t_gw = 0,
      t_ded = 0,
      t_nw = 0,
      t_val = 0;
    let rate = flt(frm.doc.gold_rate_per_gram);
    let ltv = flt(frm.doc.ltv_percent) || 75;

    // Ornament Logic
    (frm.doc.ornaments_list || []).forEach((d) => {
      d.net_weight = flt(d.gross_weight) - flt(d.deduction);
      d.valuation = d.net_weight * rate;
      d.eligible_amount = d.valuation * (ltv / 100);

      t_gw += flt(d.gross_weight);
      t_ded += flt(d.deduction);
      t_nw += d.net_weight;
      t_val += d.valuation;
    });

    frm.set_value("total_gross_weight", t_gw);
    frm.set_value("total_deduction", t_ded);
    frm.set_value("total_net_weight", t_nw);
    frm.set_value("total_valuation", t_val);

    if (frm.doc.security_type === "Gold") {
      frm.set_value("eligible_loan_amount", t_val * (ltv / 100));
    }

    // Payout Calculation
    let fee_amt =
      flt(frm.doc.loan_amount) * (flt(frm.doc.processing_fee) / 100);
    let total_deductions =
      fee_amt + flt(frm.doc.valuation_charges) + flt(frm.doc.stamp_duty);
    frm.set_value("final_payout", flt(frm.doc.loan_amount) - total_deductions);

    frm.refresh_field("ornaments_list");
  },

  validate: function (frm) {
    // Skip validations if in Draft state
    if (frm.doc.status === "Draft") return;

    if (frm.doc.customer_name && /[^a-zA-Z\s]/.test(frm.doc.customer_name)) {
      frappe.throw(
        __("Customer Name should only contain alphabets and spaces."),
      );
    }
    if (frm.doc.mobile_number && !/^\d{10}$/.test(frm.doc.mobile_number)) {
      frappe.throw(__("Mobile Number must be exactly 10 digits."));
    }
    if (flt(frm.doc.loan_amount) > flt(frm.doc.eligible_loan_amount) + 0.01) {
      frappe.msgprint({
        title: __("Over Limit"),
        message: __("Requested amount exceeds eligibility. Please adjust."),
        indicator: "orange",
      });
    }
  },
});

// Child Table Triggers
frappe.ui.form.on("Loan Ornament", {
  gross_weight: function (frm) {
    frm.trigger("recalculate_all");
  },
  deduction: function (frm) {
    frm.trigger("recalculate_all");
  },
  ornaments_list_remove: function (frm) {
    frm.trigger("recalculate_all");
  },
});

// KYC Standardized Input
frappe.ui.form.on("Loan Document", {
  document_number: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let val = row.document_number || "";

    if (row.document_type === "Aadhaar Card") {
      // Allow only numbers and max 12 digits
      let filtered = val.replace(/\D/g, "").slice(0, 12);
      if (val !== filtered) {
        frappe.model.set_value(cdt, cdn, "document_number", filtered);
      }
    } else if (row.document_type === "PAN Card") {
      // Auto-capitalize and limit to 10 characters
      let filtered = val.toUpperCase().slice(0, 10);
      
      // Basic formatting as user types: 
      // 1-5: Letters, 6-9: Digits, 10: Letter
      let correct = "";
      for (let i = 0; i < filtered.length; i++) {
        let char = filtered[i];
        if (i < 5) { // First 5 should be letters
          if (/[A-Z]/.test(char)) correct += char;
        } else if (i < 9) { // Next 4 should be digits
          if (/\d/.test(char)) correct += char;
        } else { // Last 1 should be letter
          if (/[A-Z]/.test(char)) correct += char;
        }
      }

      if (val !== correct) {
        frappe.model.set_value(cdt, cdn, "document_number", correct);
      }
    }
  },
});
