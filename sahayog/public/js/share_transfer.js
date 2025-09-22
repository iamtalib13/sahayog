frappe.ui.form.on("Share Transfer", {
  refresh: function (frm) {
    // Only show the button for saved, submitted documents
    if (!frm.is_new() && frm.doc.docstatus === 1) {
      frm
        .add_custom_button(__("Get Certificate"), function () {
          // Show a message to the user that the process has started
          frappe.msgprint(__("Generating your certificate..."));

          // Call the server-side Python method
          frappe.call({
            method:
              "sahayog.api.generate_share_certificate.generate_share_certificate", // Your app name and method path
            args: {
              transfer_doc_name: frm.doc.name,
            },
            callback: function (r) {
              if (r.message) {
                // The server returns the file data; trigger the download
                trigger_download(r.message.file_data, r.message.file_name);
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
