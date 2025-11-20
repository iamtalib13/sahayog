// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Suspension Process", {
  refresh(frm) {
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    frm.trigger("show_print_button");
  },

  // Auto calculate suspension_to_date when these change
  days_of_suspension(frm) {
    frm.trigger("calculate_suspension_to_date");
  },

  suspension_from_date(frm) {
    // Validate past date
    let today = frappe.datetime.now_date();
    if (frm.doc.suspension_from_date && frm.doc.suspension_from_date < today) {
      frappe.msgprint({
        title: __("Invalid Date"),
        message: __("You cannot select a past date for Suspension From Date."),
        indicator: "red",
      });
      frm.set_value("suspension_from_date", "");
      return;
    }

    // Auto calculate after setting valid date
    frm.trigger("calculate_suspension_to_date");
  },

  calculate_suspension_to_date(frm) {
    if (frm.doc.days_of_suspension && frm.doc.suspension_from_date) {
      let fromDate = frappe.datetime.str_to_obj(frm.doc.suspension_from_date);

      let toDate = frappe.datetime.add_days(
        fromDate,
        frm.doc.days_of_suspension
      );

      frm.set_value("suspension_to_date", frappe.datetime.obj_to_str(toDate));
    }
  },

  show_print_button: function (frm) {
    if (!frm.is_new()) {
      const allowed_roles = ["System Manager", "Share Admin"];

      if (frappe.user_roles.some((role) => allowed_roles.includes(role))) {
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

            // Create hidden iframe
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = frappe.urllib.get_full_url(
              `/printview?doctype=${encodeURIComponent(
                frm.doc.doctype
              )}&name=${encodeURIComponent(
                frm.doc.name
              )}&format=${encodeURIComponent("Suspension Order")}`
            );
            document.body.appendChild(iframe);

            iframe.onload = () => {
              const doc = iframe.contentWindow.document;

              // Inject CSS
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

              // Wrap content
              const bodyHTML = doc.body.innerHTML;
              doc.body.innerHTML = `<div class="print-content">${bodyHTML}</div>`;

              const bgImg = new Image();
              bgImg.src = "/assets/sahayog/images/letter_head_and_footer_.png";
              bgImg.onload = function () {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              };

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
    }
  },
});
