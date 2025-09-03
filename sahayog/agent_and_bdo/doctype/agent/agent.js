// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent", {
  refresh(frm) {
    frm.clear_custom_buttons(); // remove old buttons

    // --- Unallocated: Show Allocate ---
    if (frm.doc.status === "Unallocated") {
      frm.add_custom_button(__("Allocate"), () => {
        frappe.confirm(
          __("Are you sure you want to request allocation?"),
          () => {
            frm.call({
              method: "allocation_request",
              doc: frm.doc,
              freeze: true,
              freeze_message: __("Requesting Allocation..."),
              callback: function (r) {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
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

    // --- Pending: Show Approve / Reject ---
    if (frm.doc.status === "Pending") {
      frm.add_custom_button(__("Approve"), () => {
        frappe.confirm(
          __("Are you sure you want to approve this allocation?"),
          () => {
            frm.call({
              method: "approve_allocation",
              doc: frm.doc,
              freeze: true,
              freeze_message: __("Approving Allocation..."),
              callback: function (r) {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "green",
                  });
                  frm.reload_doc();
                }
              },
            });
          }
        );
      });

      frm.add_custom_button(__("Reject"), () => {
        frappe.confirm(
          __("Are you sure you want to reject this allocation?"),
          () => {
            frm.call({
              method: "reject_allocation",
              doc: frm.doc,
              freeze: true,
              freeze_message: __("Rejecting Allocation..."),
              callback: function (r) {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "red",
                  });
                  frm.reload_doc();
                }
              },
            });
          }
        );
      });
    }

    // --- Allocated: Show Unallocate ---
    if (frm.doc.status === "Allocated") {
      frm.add_custom_button(__("Unallocate"), () => {
        frappe.confirm(
          __("Are you sure you want to unallocate this agent?"),
          () => {
            frm.call({
              method: "unallocate_agent",
              doc: frm.doc,
              freeze: true,
              freeze_message: __("Unallocating Agent..."),
              callback: function (r) {
                if (r.message?.success) {
                  frappe.show_alert({
                    message: r.message.message,
                    indicator: "red",
                  });
                  frm.reload_doc();
                }
              },
            });
          }
        );
      });
    }
    frm.trigger("hide_sidebar_options");
  },
  hide_sidebar_options(frm) {
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
  },
});
