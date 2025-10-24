// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Suspension Process", {
	refresh(frm) {

	},

    // Auto calculate suspension_to_date based on days_of_suspension and suspension_from_date
     days_of_suspension: function(frm) {
        frm.trigger("calculate_suspension_to_date");
    },
    suspension_from_date: function(frm) {
        frm.trigger("calculate_suspension_to_date");
    },
    calculate_suspension_to_date: function(frm) {
        if (frm.doc.days_of_suspension && frm.doc.suspension_from_date) {
            // Convert date to JS Date object
            let fromDate = frappe.datetime.str_to_obj(frm.doc.suspension_from_date);
            
            // Add days
            let toDate = frappe.datetime.add_days(fromDate, frm.doc.days_of_suspension);

            // Set auto to_date
            frm.set_value("suspension_to_date", frappe.datetime.obj_to_str(toDate));
        }
    }
});
