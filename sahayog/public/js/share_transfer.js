frappe.ui.form.on("Share Transfer", {
  refresh: function (frm) {
    // Only show the button for saved, submitted documents
    if (!frm.is_new() && frm.doc.docstatus === 1) {
      frm
        .add_custom_button(__("Get Certificate"), function () {
          // Freeze the screen with a "Downloading..." message
          frappe.dom.freeze(__("Downloading..."));

          // Call the server-side Python method
          frappe.call({
            method:
              "sahayog.api.generate_share_certificate.generate_share_certificate", // Your app name and method path
            args: {
              transfer_doc_name: frm.doc.name,
            },
            callback: function (r) {
              frappe.dom.unfreeze(); // Unfreeze the screen

              if (r.message) {
                // The server returns the file data; trigger the download
                trigger_download(r.message.file_data, r.message.file_name);

                // Show success message after download is triggered
                frappe.msgprint(
                  __(
                    `Certificate for <strong>${frm.doc.name}</strong> downloaded successfully.<br>Please check your Downloads folder.`
                  )
                );
              } else {
                frappe.msgprint({
                  title: __("Error"),
                  indicator: "red",
                  message: __("Could not generate the certificate."),
                });
              }
            },
          });
        })
        .addClass("btn-primary"); // Optional: Makes the button stand out
    }

    //add multiple roles in allowed role if required
    let allowed_roles = ["Administrator"];
    if (frappe.user_roles.some((role) => allowed_roles.includes(role))) {
      frm.add_custom_button(__("Reset Counter"), function () {
        frappe.confirm(
          __("Are you sure you want to reset the download counter?"),
          function () {
            // Call server method to reset counter
            frappe.call({
              method:
                "sahayog.api.generate_share_certificate.reset_download_counter",
              args: {
                docname: frm.doc.name,
              },
              callback: function (r) {
                if (!r.exc) {
                  frappe.show_alert({
                    message: __("Download counter reset!"),
                    indicator: "green",
                  });
                  frm.reload_doc();
                }
              },
            });
          }
        );
      });
    }
  },
});

// This helper function triggers the browser download
function trigger_download(file_data_base64, file_name) {
  // Create a temporary link element
  const link = document.createElement("a");

  // Set the link's href to the base64 data URL
  link.href = `data:image/png;base64,${file_data_base64}`;

  // Set the download attribute with the desired file name
  link.download = file_name;

  // Append the link to the body (required for Firefox)
  document.body.appendChild(link);

  // Programmatically click the link to trigger the download
  link.click();

  // Clean up by removing the link
  document.body.removeChild(link);
}
