frappe.ui.form.on("Loan Disbursement", {
  loan_application: function(frm) {
    if (frm.doc.loan_application) {
      frappe.db.get_value("Loan Application", frm.doc.loan_application, ["customer_name", "final_payout", "branch_code"], (r) => {
        if (r) {
            frm.set_value("customer_name", r.customer_name);
            frm.set_value("disbursement_amount", r.final_payout);
            frm.set_value("branch_code", r.branch_code);
        }
      });
    }
  }
});
