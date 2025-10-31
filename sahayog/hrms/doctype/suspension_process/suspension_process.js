// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Suspension Process", {
  refresh(frm) {
    frm.trigger("show_print_button");
  },

  // Auto calculate suspension_to_date based on days_of_suspension and suspension_from_date
  days_of_suspension: function (frm) {
    frm.trigger("calculate_suspension_to_date");
  },
  suspension_from_date: function (frm) {
    frm.trigger("calculate_suspension_to_date");
  },
  calculate_suspension_to_date: function (frm) {
    if (frm.doc.days_of_suspension && frm.doc.suspension_from_date) {
      // Convert date to JS Date object
      let fromDate = frappe.datetime.str_to_obj(frm.doc.suspension_from_date);

      // Add days
      let toDate = frappe.datetime.add_days(
        fromDate,
        frm.doc.days_of_suspension
      );

      // Set auto to_date
      frm.set_value("suspension_to_date", frappe.datetime.obj_to_str(toDate));
    }
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
                "Suspension Order"
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
