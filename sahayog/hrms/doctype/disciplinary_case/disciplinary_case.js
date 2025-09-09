frappe.ui.form.on("Disciplinary Case", {
  case_type: function (frm) {
    if (frm.doc.case_type == "Complaint") {
      frm.set_df_property(
        "case_type",
        "description",
        "Formal report raised by an employee or HR against another employee for inappropriate behavior or action."
      );
    }
    if (frm.doc.case_type == "Misconduct") {
      frm.set_df_property(
        "case_type",
        "description",
        "Violation of company rules, policies, or code of conduct by an employee requiring disciplinary action."
      );
    }
    if (frm.doc.case_type == "Grievance") {
      frm.set_df_property(
        "case_type",
        "description",
        "Concern or dissatisfaction raised by an employee regarding unfair treatment, policies, or workplace issues."
      );
    }
  },
});
