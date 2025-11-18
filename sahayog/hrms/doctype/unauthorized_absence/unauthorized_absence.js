// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Unauthorized Absence", {
  refresh(frm) {
    // ✅ Call print button function

    frm.trigger("show_print_button");
  },
  show_print_button: function (frm) {
    // ✅ Only allow for saved documents
    if (!frm.is_new()) {
      // Temporary: Remove role check to ensure button appears
      // const allowed_roles = ["System Manager", "Share Admin", "Administrator"];
      // if (!frappe.user_roles.some((role) => allowed_roles.includes(role))) return;

      frm
        .add_custom_button(__("Print"), function () {
          // Create overlay
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

          // Create hidden iframe for print preview
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = frappe.urllib.get_full_url(
            `/printview?doctype=${encodeURIComponent(
              frm.doc.doctype
            )}&name=${encodeURIComponent(
              frm.doc.name
            )}&format=${encodeURIComponent("Unauthorized Absence")}`
          );
          document.body.appendChild(iframe);

          iframe.onload = () => {
            const doc = iframe.contentWindow.document;

            // Inject CSS with background image for print
            const style = doc.createElement("style");
            style.innerHTML = `
                @page {
                    size: A4;
                    margin: 0 !important;
                }

                html, body {
                    margin:0 !important;
                    padding:0 !important;
                    width:210mm !important;
                    height:297mm !important;
                    overflow:hidden !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                .print-page {
                    position:relative;
                    width:210mm; height:297mm;
                    overflow:hidden;
                }

                .print-body {
                    padding: 145px 30px 40px 30px;
                    height:100%;
                    box-sizing:border-box;
                    page-break-inside: avoid;
                }
          `;
            doc.head.appendChild(style);

            // Wrap body content
            const bodyHTML = doc.body.innerHTML;
            doc.body.innerHTML = `<div class="print-content">${bodyHTML}</div>`;

            // Preload background image
            const bgImg = new Image();
            bgImg.src = "/assets/sahayog/images/letter_head_and_footer_.png";
            bgImg.onload = function () {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            };

            // Fallback
            setTimeout(() => {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }, 3000);

            let done = false;
            const cleanup = () => {
              if (done) return;
              done = true;
              overlay.remove();
              iframe.remove();
            };

            iframe.contentWindow.addEventListener("afterprint", cleanup);
            setTimeout(cleanup, 6000);
          };

          iframe.onerror = () => {
            frappe.msgprint(__("Error loading print preview"));
            overlay.remove();
            iframe.remove();
          };
        })
        .addClass("btn-primary");
    }
  },
});
