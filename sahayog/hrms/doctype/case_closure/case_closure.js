// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Case Closure", {
  onload(frm) {
    if (!frm.doc.case_id) return;

    // 1️⃣ Try fetching from Domestic Enquiry
    frappe.db
      .get_value("Domestic Enquiry", { case_id: frm.doc.case_id }, [
        "domestic_enquiry",
        "place_of_enquiry",
        "status_of_response",
        "date_of_enquiry",
        "enquiry_officer_name",
      ])
      .then((de_res) => {
        console.log("🟡 Domestic Enquiry fetched data:", de_res.message);
        if (de_res.message && Object.keys(de_res.message).length > 0) {
          const de = de_res.message;
          frm.set_value("domestic_enquiry", de.domestic_enquiry);
          frm.set_value("place_of_enquiry", de.place_of_enquiry);
          frm.set_value("status_of_response", de.status_of_response);
          frm.set_value("date_of_enquiry", de.date_of_enquiry);
          frm.set_value("enquiry_officer_name", de.enquiry_officer_name);
        } else {
          // 2️⃣ If no Domestic Enquiry found, fetch from Enquiry Reminder
          frappe.db
            .get_value("Enquiry Reminder", { case_id: frm.doc.case_id }, [
              "domestic_enquiry",
              "place_of_enquiry",
              "status_of_response",
              "date_of_enquiry",
              "enquiry_officer_name",
              "enquiry_status",
            ])
            .then((r) => {
              console.log("🔍 Enquiry Reminder fetched data:", r.message);
              if (r.message) {
                const data = r.message;
                frm.set_value("domestic_enquiry", data.domestic_enquiry);
                frm.set_value("place_of_enquiry", data.place_of_enquiry);
                frm.set_value("status_of_response", data.status_of_response);
                frm.set_value("date_of_enquiry", data.date_of_enquiry);
                frm.set_value(
                  "enquiry_officer_name",
                  data.enquiry_officer_name
                );
                frm.set_value("enquiry_status", data.enquiry_status);
              }
            });
        }
      });
  },

  before_save(frm) {
    if (frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
        args: { case_id: frm.doc.case_id },
        async: false,
      });
    }
  },

  after_save(frm) {
    frappe.msgprint({
      title: __("Success"),
      message: __("The case has been closed successfully."),
      indicator: "green",
    });
  },
  refresh(frm) {
    frm.trigger("show_print_button");
  },
  show_print_button: function (frm) {
    if (!frm.is_new()) {
      // Allow specific roles
      const allowed_roles = ["System Manager", "Share Admin"];

      if (frappe.user_roles.some((role) => allowed_roles.includes(role))) {
        frm
          .add_custom_button(__("Print"), function () {
            // --- Create overlay ---
            const overlay = document.createElement("div");
            overlay.id = "print-overlay";
            overlay.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(255,255,255,0.6);
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              color: #333;
            `;
            overlay.innerHTML = "Preparing print preview...";
            document.body.appendChild(overlay);

            // --- Create hidden iframe ---
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = frappe.urllib.get_full_url(
              `/printview?doctype=${encodeURIComponent(
                frm.doc.doctype
              )}&name=${encodeURIComponent(
                frm.doc.name
              )}&format=${encodeURIComponent(
                "Case Closure Report"
              )}&no_letterhead=0&letterhead=${encodeURIComponent("")}`
            );
            document.body.appendChild(iframe);

            iframe.onload = () => {
              setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();

                // --- Cleanup logic ---
                let cleanupCompleted = false;

                const cleanup = () => {
                  if (cleanupCompleted) return;
                  cleanupCompleted = true;

                  console.log("Cleaning up print overlay...");
                  if (overlay?.parentNode) overlay.remove();
                  if (iframe?.parentNode) iframe.remove();
                };

                // Method 1: afterprint event
                iframe.contentWindow.addEventListener("afterprint", cleanup);

                // Method 2: Focus check
                let focusCheckCount = 0;
                const maxFocusChecks = 20; // 5 sec max
                const checkFocus = () => {
                  focusCheckCount++;
                  if (document.hasFocus() && focusCheckCount > 2) {
                    cleanup();
                  } else if (focusCheckCount < maxFocusChecks) {
                    setTimeout(checkFocus, 250);
                  } else {
                    cleanup();
                  }
                };

                setTimeout(() => {
                  if (!cleanupCompleted) checkFocus();
                }, 1000);

                // Method 3: Final fallback
                setTimeout(cleanup, 8000);
              }, 800);
            };

            // --- Handle iframe errors ---
            iframe.onerror = () => {
              frappe.msgprint(__("Error loading print preview"));
              if (overlay?.parentNode) overlay.remove();
              if (iframe?.parentNode) iframe.remove();
            };
          })
          .addClass("btn-primary");
      }
    }
  },
});
