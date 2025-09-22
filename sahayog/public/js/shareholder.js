frappe.ui.form.on("Shareholder", {
  refresh: function (frm) {
    // Hide unwanted fields in the form to improve UI/UX
    frm.set_df_property("naming_series", "hidden", 1);
    frm.set_df_property("title", "hidden", 1);
    frm.set_df_property("address_contacts", "hidden", 1);
    frm.set_df_property("section_break_2", "hidden", 1);

    // Remove required validation from title field since it's hidden
    frm.set_df_property("title", "reqd", 0);
  },

  get_data: function (frm) {
    // Get account number from the current document
    let account_number = frm.doc.account_no;

    // Validate if account number is provided before making API call
    if (!account_number) {
      frappe.msgprint(__("Please enter Account Number first."));
      return;
    }

    // Make server-side call to fetch and create shareholder record
    frappe.call({
      method: "sahayog.doc_events.shareholder.create_shareholder_record",
      args: {
        account_number: account_number,
      },
      freeze: true, // Show loading indicator to prevent user interaction
      freeze_message: __("Fetching and Creating Shareholder Record..."),
      callback: function (r) {
        // Handle successful response
        if (r.message && r.message.success) {
          frappe.msgprint(
            __("Shareholder record created successfully: {0}", [
              r.message.shareholder_name,
            ])
          );

          // Redirect to the newly created shareholder record
          frappe.set_route("Form", "Shareholder", r.message.shareholder_name);
        } else if (r.message && r.message.error) {
          frappe.msgprint(__(r.message.error));
        } else {
          frappe.msgprint(
            __("No shareholder data found for this account number.")
          );
        }
      },
      error: function (r) {
        // Handle API errors gracefully
        frappe.msgprint(
          __(
            "Error occurred while creating shareholder record. Please try again."
          )
        );
        console.error("API Error:", r);
      },
    });
  },
});
