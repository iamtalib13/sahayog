// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Suspension Process", {
	refresh(frm) {
        
	},
     number_of_days_suspension_required: function(frm) {
        frm.trigger("calculate_suspension_to_date");
    },
    suspenstion_from_date: function(frm) {
        frm.trigger("calculate_suspension_to_date");
    },
    calculate_suspension_to_date: function(frm) {
        if (frm.doc.number_of_days_suspension_required && frm.doc.suspenstion_from_date) {
            // Convert date to JS Date object
            let fromDate = frappe.datetime.str_to_obj(frm.doc.suspenstion_from_date);
            
            // Add days
            let toDate = frappe.datetime.add_days(fromDate, frm.doc.number_of_days_suspension_required);

            // Set auto to_date
            frm.set_value("suspenstion_to_date", frappe.datetime.obj_to_str(toDate));
        }
    }
});
