frappe.ui.form.on("Loan Repayment", {
  loan_application: function(frm) {
    if (frm.doc.loan_application) {
      frappe.db.get_value("Loan Application", frm.doc.loan_application, ["customer_name", "remaining_balance"], (r) => {
        if (r) {
            frm.set_value("customer_name", r.customer_name);
            frm.set_value("before_balance", r.remaining_balance);
        }
      });
    }
  },
  payment_amount: function(frm) {
    if (frm.doc.before_balance) {
        frm.set_value("remaining_balance", flt(frm.doc.before_balance) - flt(frm.doc.payment_amount));
    }
  }
});
