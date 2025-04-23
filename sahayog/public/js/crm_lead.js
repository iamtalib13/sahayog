frappe.ui.form.on("CRM Lead", {
  onload: function (frm) {
    console.log("CRM Lead form loaded");
    // // Check if lead_owner_branch is empty, then set it
    // if (!frm.doc.lead_owner_branch) {
    //   // Fetch the branch from the Employee doctype based on the lead_owner
    //   frappe.call({
    //     method: "frappe.client.get",
    //     args: {
    //       doctype: "Employee",
    //       filters: {
    //         user_id: frm.doc.lead_owner,
    //       },
    //     },
    //     callback: function (r) {
    //       console.log();
    //       if (r.message && r.message.branch) {
    //         frm.set_value("lead_owner_branch", r.message.branch);
    //       }
    //     },
    //   });
    // }
  },
});
