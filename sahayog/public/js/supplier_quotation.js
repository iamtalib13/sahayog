frappe.ui.form.on("Supplier Quotation", {
    refresh: function (frm) {
        console.log("✅ Supplier Quotation form refreshed.");
    }
});

frappe.ui.form.on("Supplier Quotation Item", {
    form_render(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (!row.item_code) return; // Skip if item_code is empty

        console.log("🔹 Form render triggered for item:", row.item_code);

        // Fetch options dynamically
        frappe.call({
            method: "sahayog.doc_events.supplier_quotation.supplier_quotation_form_render",
            args: { item_code: row.item_code },
            callback: function (r) {
                if (r.message) {
                    console.log("✅ Received options:", r.message);

                    let options = ["", "Custom Proposed Price"].concat(r.message); // First is blank, second is 'Custom Proposed Price'

                    // Update field options dynamically
                    frm.fields_dict["items"].grid.update_docfield_property(
                        "last_purchase_price_supplierwise",
                        "options",
                        options.join("\n")
                    );

                    // Set default value blank for last_purchase_price_supplierwise
                    // frappe.model.set_value(cdt, cdn, "last_purchase_price_supplierwise", "");

                    // Make proposed_price readonly by default
                    let grid_row = frm.fields_dict["items"].grid.grid_rows_by_docname[cdn];
                    if (grid_row) grid_row.toggle_editable("proposed_price", false);

                    frm.refresh_field("items"); // Refresh child table
                }
            }
        });
    },

    last_purchase_price_supplierwise(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        let grid_row = frm.fields_dict["items"].grid.grid_rows_by_docname[cdn];

        if (row.last_purchase_price_supplierwise === "Custom Proposed Price") {
            // Make proposed_price editable
            frappe.model.set_value(cdt, cdn, "proposed_price", ""); // Clear existing value
            if (grid_row) grid_row.toggle_editable("proposed_price", true);
        } 
        else if (row.last_purchase_price_supplierwise) {
            // Extract price from selected option
            let selected_price = row.last_purchase_price_supplierwise.split(" - ")[0].trim();

            // Set extracted price in proposed_price
            frappe.model.set_value(cdt, cdn, "proposed_price", selected_price);

            // Make proposed_price readonly
            if (grid_row) grid_row.toggle_editable("proposed_price", false);
        } 
        else {
            // If blank is selected, clear proposed_price and keep it readonly
            if (grid_row) grid_row.toggle_editable("proposed_price", false);
        }

        if (!row.last_purchase_price_supplierwise) {
                if (grid_row) {
                    grid_row.toggle_editable("show_proposed_price", false);
                    frappe.model.set_value(cdt, cdn, "show_proposed_price", 0); // Uncheck the checkbox
                }
            } else {
                if (grid_row) grid_row.toggle_editable("show_proposed_price", true);
        }

    },
});
