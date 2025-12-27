// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Data Upload Tool", {
  refresh(frm) {
    if (!frm.is_new()) {
      // Add Start Uploading button
      frm.add_custom_button(__("Start Uploading"), function () {
        // Freeze UI during processing
        frappe.call({
          method:
            "sahayog.sahayog.doctype.data_upload_tool.data_upload_tool.start_data_import",
          args: { upload_doc: frm.doc.name },
          freeze: true,
          freeze_message: __("Starting data import..."),
          callback: function (r) {
            if (r.message) {
              // Display summary
              frappe.msgprint({
                title: __("Upload Completed"),
                message: r.message,
                indicator: "green",
              });
            } else {
              frappe.msgprint({
                title: __("Upload Completed"),
                message: __("No records were processed."),
                indicator: "orange",
              });
            }
            frm.reload_doc(); // Reload form after import
          },
          error: function (err) {
            frappe.msgprint({
              title: __("Upload Failed"),
              message: __(
                "An error occurred during the upload. Check Error Log for details."
              ),
              indicator: "red",
            });
            frm.reload_doc();
          },
        });
      });
    }
  },
});
