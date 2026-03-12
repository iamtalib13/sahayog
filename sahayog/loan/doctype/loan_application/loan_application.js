frappe.ui.form.on("Loan Application", {
  setup: function (frm) {
    // Standard cleanup
  },

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

    // 2. Dynamic Field Restrictions
    if (frm.doc.status !== "Draft" && frm.doc.docstatus === 0) {
      //frm.set_df_property("customer_name", "read_only", 1);
      //frm.set_df_property("mobile_number", "read_only", 1);
      //frm.set_df_property("loan_amount", "read_only", 1);
      //frm.set_df_property("loan_type", "read_only", 1);
    }

    // 3. UI Styling for Status
    if (frm.doc.status === "Approved")
      frm.page.set_indicator("Approved", "green");
    else if (frm.doc.status === "Rejected")
      frm.page.set_indicator("Rejected", "red");
    else if (frm.doc.status === "Under Review")
      frm.page.set_indicator("Under Review", "orange");
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
    // Logic sanity before save
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
      let filtered = val.replace(/\D/g, "").slice(0, 12);
      if (val !== filtered)
        frappe.model.set_value(cdt, cdn, "document_number", filtered);
    } else if (row.document_type === "PAN Card") {
      let filtered = val.toUpperCase().slice(0, 10);
      if (val !== filtered)
        frappe.model.set_value(cdt, cdn, "document_number", filtered);
    }
  },
});
