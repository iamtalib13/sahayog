frappe.ui.form.on("Reminder Of Unauthorized Absence", {
  onload: function (frm) {
    if (frm.doc.__islocal && frm.doc.case_id) {
      frappe.db
        .get_list("Unauthorized Absence", {
          filters: { case_id: frm.doc.case_id },
          order_by: "creation desc",
          limit_page_length: 1,
          fields: ["date_of_1st_letter"],
        })
        .then((list) => {
          if (list.length) {
            const firstLetterDate = list[0].date_of_1st_letter; // YYYY-MM-DD
            const formattedDate = frappe.datetime.str_to_user(firstLetterDate); // DD-MM-YYYY

            // Show formatted date in field
            frm.set_value("date_of_1st_letter", formattedDate);

            // Convert to JS Date object
            const firstDateObj = frappe.datetime.str_to_obj(firstLetterDate);

            // Restrict date picker (only dates after this)
            setTimeout(() => {
              const picker =
                frm.fields_dict["date_of_reminder_letter"].datepicker;
              if (picker) {
                // Add +1 day to allow only after the first letter date
                const minAllowed = frappe.datetime.add_days(firstLetterDate, 1);
                picker.update({
                  minDate: frappe.datetime.str_to_obj(minAllowed),
                });
              }
            }, 500);

            // Validation backup — ensures user can’t type invalid date manually
            frm.fields_dict.date_of_reminder_letter.df.onchange = function () {
              if (frm.doc.date_of_reminder_letter) {
                const reminderDateObj = frappe.datetime.str_to_obj(
                  frm.doc.date_of_reminder_letter
                );
                if (reminderDateObj <= firstDateObj) {
                  frappe.msgprint({
                    title: __("Invalid Date"),
                    message: __(
                      "Date of Reminder Unauthorized Absence must be **after** the Date of 1st Unauthorized Absence."
                    ),
                    indicator: "red",
                  });
                  frm.set_value("date_of_reminder_letter", null);
                }
              }
            };
          }
        });
    }
    if (frm.doc.case_id) {
      frappe.db
        .get_list("Unauthorized Absence", {
          filters: { case_id: frm.doc.case_id },
          order_by: "creation desc",
          limit_page_length: 1,
          fields: ["amount_of_fraud"],
        })
        .then((list) => {
          if (list.length && list[0].amount_of_fraud) {
            frm.set_value("amount_of_fraud", list[0].amount_of_fraud);
            frm.set_df_property("amount_of_fraud", "hidden", 0);
          } else {
            frm.set_value("amount_of_fraud", "");
            frm.set_df_property("amount_of_fraud", "hidden", 1);
          }
        });
    } else {
      frm.set_df_property("amount_of_fraud", "hidden", 1);
    }
  },
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
            )}&format=${encodeURIComponent("Reminder Unauthorized absence")}`
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
