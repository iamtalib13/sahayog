frappe.listview_settings["Shareholder"] = {
  refresh(listview) {
    set_custom_breadcrumbs();
    const btn = listview.page.btn_primary;
    if (btn) {
      btn.hide(); // completely hides the Add Shareholder button
    }
  },
  onload(listview) {
    set_custom_breadcrumbs();
    // Hide sidebar elements
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();

    if (
      frappe.user.has_role("System Manager") ||
      frappe.user.has_role("Share User")
    ) {
      listview.page.add_inner_button(__("Create Shareholder"), function () {
        // Create dialog for Account Number input
        let d = new frappe.ui.Dialog({
          title: __("Create Shareholder Record"),
          size: "small",
          fields: [
            {
              label: "Account Number",
              fieldname: "account_number",
              fieldtype: "Data",
              reqd: 1,
              description: __("Enter numeric account number only"),
            },
          ],
          primary_action_label: __("Create"),
          primary_action: function (values) {
            // Validate if account number is numeric only
            const account_number = values.account_number.trim();

            // Validation for scheme code '9001'
            if (!account_number.includes("9001")) {
              frappe.msgprint(
                __("Only 9001 scheme code account number is allowed")
              );
              return;
            }

            // Check if input is empty
            if (!account_number) {
              frappe.msgprint(__("Account Number is required"));
              return;
            }

            // Check if input contains only numbers
            const numericRegex = /^\d+$/;
            if (!numericRegex.test(account_number)) {
              frappe.msgprint(
                __("Account Number must contain only numeric values")
              );
              return;
            }

            // Additional validation for minimum length
            if (account_number.length < 4) {
              frappe.msgprint(
                __("Account Number must be at least 4 digits long")
              );
              return;
            }

            // If all validations pass
            frappe.msgprint(__("Account Number accepted: " + account_number));

            // If validation passes, make the frappe.call
            frappe.call({
              method:
                "sahayog.doc_events.shareholder.create_shareholder_record",
              args: {
                account_number: account_number,
              },
              freeze: true,
              freeze_message: __("Fetching and Creating Shareholder Record..."),
              callback: function (r) {
                if (r.message && r.message.success) {
                  frappe.msgprint(
                    __("Shareholder record created successfully: {0}", [
                      r.message.shareholder_name,
                    ])
                  );

                  // Hide dialog after success
                  d.hide();

                  // Refresh list view to show new record
                  listview.refresh();

                  // Redirect to the newly created shareholder record after a brief delay
                  setTimeout(() => {
                    frappe.set_route(
                      "Form",
                      "Shareholder",
                      r.message.shareholder_name
                    );
                  }, 1000);
                } else if (r.message && r.message.error) {
                  frappe.msgprint(__(r.message.error));
                } else {
                  frappe.msgprint(
                    __("No shareholder data found for this account number.")
                  );
                }
              },
              error: function (r) {
                frappe.msgprint(
                  __(
                    "Error occurred while creating shareholder record. Please try again."
                  )
                );
                console.error("API Error:", r);
              },
            });
          },
          secondary_action_label: __("Cancel"),
          secondary_action: function () {
            d.hide();
          },
        });

        d.show();
        d.get_field("account_number").focus();
      });
    }
  },
};

// Function to replace breadcrumbs
function set_custom_breadcrumbs() {
  const breadcrumbs = document.getElementById("navbar-breadcrumbs");
  if (breadcrumbs) {
    breadcrumbs.innerHTML = ""; // Clear existing

    // Home link
    const homeLi = document.createElement("li");
    const homeA = document.createElement("a");
    homeA.href = "/app/shareholder-management/";
    homeA.innerText = "Home";
    homeLi.appendChild(homeA);

    // Append to breadcrumbs
    breadcrumbs.appendChild(homeLi);
  }
}
