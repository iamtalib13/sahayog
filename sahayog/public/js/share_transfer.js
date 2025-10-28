frappe.ui.form.on("Share Transfer", {
  refresh: function (frm) {
    set_custom_breadcrumbs(frm);
    frm.remove_custom_button("Create Journal Entry");
    // Only show the button for saved, submitted documents
    if (
      !frm.is_new() &&
      frm.doc.docstatus === 1 &&
      frappe.user.has_role("System Manager")
    ) {
      frm
        .add_custom_button(__("Get Certificate"), function () {
          frappe.dom.freeze(__("Generating Certificate..."));

          frappe.call({
            method:
              "sahayog.api.generate_share_certificate.generate_share_certificate",
            args: {
              transfer_doc_name: frm.doc.name,
            },
            callback: function (r) {
              frappe.dom.unfreeze();

              if (r.message) {
                const file_data_base64 = r.message.file_data;
                const file_name = r.message.file_name;

                // Convert base64 to Blob
                const byteCharacters = atob(file_data_base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "application/pdf" });

                // Open PDF in a new tab for preview
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, "_blank");

                // Optional: trigger download as well
                // const link = document.createElement('a');
                // link.href = blobUrl;
                // link.download = file_name;
                // document.body.appendChild(link);
                // link.click();
                // document.body.removeChild(link);
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
        .addClass("btn-primary");
    }

    //add multiple roles in allowed role if required
    let allowed_roles = ["System Manager", "Share Admin"];
    if (frappe.user_roles.some((role) => allowed_roles.includes(role))) {
      frm.add_custom_button(__("Enable Print"), function () {
        // Create a custom dialog with radio buttons
        let d = new frappe.ui.Dialog({
          title: __("Select Print Type"),
          fields: [
            {
              fieldname: "print_type_html",
              fieldtype: "HTML",
              options: `
                        <label><input type="radio" name="print_type" value="Original"> Original</label><br>
                        <label><input type="radio" name="print_type" value="Duplicate"> Duplicate</label>
                    `,
            },
          ],
          primary_action_label: __("Proceed"),
          primary_action() {
            // Get selected radio button value
            let selected = d.$wrapper
              .find('input[name="print_type"]:checked')
              .val();

            frappe.confirm(
              __(
                "Are you sure you want to enable print? This will allow the user to print a <b>" +
                  selected +
                  "</b> certificate."
              ),
              function () {
                frappe.call({
                  method:
                    "sahayog.api.generate_share_certificate.reset_enable_print",
                  args: {
                    docname: frm.doc.name,
                    print_type: selected,
                  },
                  callback: function (r) {
                    if (!r.exc) {
                      frappe.show_alert({
                        message: __("Print Enabled Successfully!"),
                        indicator: "green",
                      });
                      frm.reload_doc();
                    }
                  },
                });
              }
            );

            d.hide();
          },
        });

        d.show();
      });
    }
  },
});

// // This helper function triggers the browser download
// function trigger_download(file_data_base64, file_name) {
//   // Create a temporary link element
//   const link = document.createElement("a");

//   // Set the link's href to the base64 data URL
//   link.href = `data:image/png;base64,${file_data_base64}`;

//   // Set the download attribute with the desired file name
//   link.download = file_name;

//   // Append the link to the body (required for Firefox)
//   document.body.appendChild(link);

//   // Programmatically click the link to trigger the download
//   link.click();

// Clean up by removing the link
//   document.body.removeChild(link);
// }
// Function to replace breadcrumbs
function set_custom_breadcrumbs(frm) {
  const breadcrumbs = document.getElementById("navbar-breadcrumbs");
  if (breadcrumbs) {
    breadcrumbs.innerHTML = ""; // Clear existing

    // Home link
    const homeLi = document.createElement("li");
    const homeA = document.createElement("a");
    homeA.href = "/app/shareholder-management/";
    homeA.innerText = "Home";
    homeLi.appendChild(homeA);

    // Shareholder List link
    const listLi = document.createElement("li");
    const listA = document.createElement("a");
    listA.href = "/app/share-transfer/";
    listA.innerText = "Share Transaction List";
    listLi.appendChild(listA);

    // Append to breadcrumbs
    breadcrumbs.appendChild(homeLi);
    breadcrumbs.appendChild(listLi);
  }
}
frappe.ui.form.on("Share Transfer", {
  refresh: function (frm) {
    if (!frm.is_new()) {
      frm.add_custom_button("🖨️ Print Share Certificate", function () {
        // Create overlay
        let overlay = document.createElement("div");
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

        // Create hidden iframe
        let iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = frappe.urllib.get_full_url(
          `/printview?doctype=${encodeURIComponent(
            frm.doc.doctype
          )}&name=${encodeURIComponent(
            frm.doc.name
          )}&format=${encodeURIComponent(
            "Share Certificate"
          )}&no_letterhead=0&letterhead=${encodeURIComponent(
            "Sahayog Letter Head"
          )}&_lang=en`
        );
        document.body.appendChild(iframe);

        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // Enhanced cleanup with multiple fallbacks
            let cleanupCompleted = false;

            const cleanup = () => {
              if (cleanupCompleted) return;
              cleanupCompleted = true;

              console.log("Cleaning up print overlay...");

              if (overlay && overlay.parentNode) {
                overlay.remove();
              }
              if (iframe && iframe.parentNode) {
                iframe.remove();
              }
            };

            // Method 1: Use afterprint event (most reliable)
            if (iframe.contentWindow) {
              iframe.contentWindow.addEventListener("afterprint", cleanup);
            }

            // Method 2: Check for focus with shorter intervals
            let focusCheckCount = 0;
            const maxFocusChecks = 20; // 5 seconds max (20 * 250ms)

            const checkFocus = () => {
              focusCheckCount++;
              if (document.hasFocus() && focusCheckCount > 2) {
                cleanup();
              } else if (focusCheckCount < maxFocusChecks) {
                setTimeout(checkFocus, 250);
              } else {
                cleanup(); // Final fallback
              }
            };

            // Start focus checking after a brief delay
            setTimeout(() => {
              if (!cleanupCompleted) {
                checkFocus();
              }
            }, 1000);

            // Method 3: Final safety cleanup (8 seconds)
            setTimeout(cleanup, 8000);
          }, 800);
        };

        // Handle iframe errors
        iframe.onerror = () => {
          frappe.msgprint(__("Error loading print preview"));
          if (overlay && overlay.parentNode) {
            overlay.remove();
          }
          if (iframe && iframe.parentNode) {
            iframe.remove();
          }
        };
      });
    }
  },
});
