frappe.ui.form.on("Case Closure", {
  onload(frm) {
    if (!frm.doc.case_id) return;

    const workflow_fields = [
      "status_of_response",
      "domestic_enquiry",
      "place_of_enquiry",
      "date_of_enquiry",
      "date_of_2nd_enquiry",
      "enquiry_officer_name",
      "enquiry_status",
    ];

    // Hide all workflow fields initially
    workflow_fields.forEach((f) => frm.set_df_property(f, "hidden", 1));

    // Fetch the latest linked enquiry for this case
    frappe.call({
      method:
        "sahayog.hrms.doctype.case_closure.case_closure.get_latest_linked_enquiry",
      args: { case_id: frm.doc.case_id },
      callback: function (r) {
        if (!r.message) return;

        const { linked_enquiry_type, linked_enquiry, data } = r.message;
        if (!linked_enquiry_type || !linked_enquiry) return;

        // Store reference silently
        frm.set_value("linked_enquiry_type", linked_enquiry_type);
        frm.set_value("linked_enquiry", linked_enquiry);

        // Define visible fields by linked doctype
        const visible_fields_by_doctype = {
          "Response to SCN": ["status_of_response", "domestic_enquiry"],
          "Domestic Enquiry": [
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "enquiry_officer_name",
          ],
          "Enquiry Reminder": [
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "date_of_2nd_enquiry",
            "enquiry_officer_name",
            "enquiry_status",
          ],
        };

        // Initialize fields_to_show before logging
        const fields_to_show =
          visible_fields_by_doctype[linked_enquiry_type] || [];

        console.group("Case Closure Fetch Debug");
        console.log("Linked Doctype:", linked_enquiry_type);
        console.log("Linked Record:", linked_enquiry);
        console.log("Fields requested:", fields_to_show);
        console.log("Fetched data:", data);
        console.groupEnd();

        // Unhide & populate relevant fields
        fields_to_show.forEach((f) => {
          frm.set_df_property(f, "hidden", 0);

          // Make fields read-only, except enquiry_status if source is Enquiry Reminder
          if (
            !(
              linked_enquiry_type === "Enquiry Reminder" &&
              f === "enquiry_status"
            )
          ) {
            frm.set_df_property(f, "read_only", 1);
          }

          // Populate value from fetched data
          if (data && data[f] !== undefined && data[f] !== null) {
            frm.set_value(f, data[f]);
          }
        });

        frappe.show_alert({
          message: `Fetched details from <b>${linked_enquiry_type}</b> (${linked_enquiry})`,
          indicator: "green",
        });
      },
    });
  },

  before_save(frm) {
    if (frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
        args: { case_id: frm.doc.case_id },
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
    if (frm.is_new()) return;

    const allowed_roles = ["System Manager", "Share Admin"];
    if (!frappe.user_roles.some((r) => allowed_roles.includes(r))) return;

    // Remove old versions if exist
    try {
      frm.page.remove_custom_button("Print");
    } catch (e) {}
    try {
      frm.page.remove_menu_item("Print");
    } catch (e) {}

    // Create a dropdown-style primary button
    let $btn = frm.page.add_button("Select Print Format", null, "btn-primary");

    // Convert button to dropdown
    $btn.addClass("dropdown-toggle");
    $btn.attr("data-toggle", "dropdown");

    // Dropdown container
    let $wrapper = $btn.parent();
    $wrapper.addClass("dropdown");

    // Add dropdown menu
    let $menu = $(`
    <ul class="dropdown-menu">
      <li><a class="print-opt" data-format="Warning Letter" href="#">Warning Letter</a></li>
      <li><a class="print-opt" data-format="Caution Letter" href="#">Caution Letter</a></li>
      <li><a class="print-opt" data-format="Termination due to abandonment" href="#">Termination due to abandonment</a></li>
     <li><a class="print-opt" data-format="Office Order Termination of Services" href="#">Office Order Termination of Services</a></li>
    </ul>
  `);

    $wrapper.append($menu);

    // Handle click on dropdown option
    $wrapper.on("click", ".print-opt", function (e) {
      e.preventDefault();
      let format = $(this).data("format");

      open_print_for_format(format);
    });

    // PRINT LOGIC
    function open_print_for_format(format) {
      console.log("Selected print format:", format);

      const overlay = document.createElement("div");
      overlay.id = "print-overlay";
      overlay.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(255,255,255,0.6);
      z-index: 9999; display: flex;
      align-items: center; justify-content: center;
      font-size: 18px; color: #333;
    `;
      overlay.innerHTML = "Preparing print preview...";
      document.body.appendChild(overlay);

      const url = frappe.urllib.get_full_url(
        `/printview?doctype=${encodeURIComponent(
          frm.doc.doctype
        )}&name=${encodeURIComponent(frm.doc.name)}&format=${encodeURIComponent(
          format
        )}&no_letterhead=1`
      );

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;

          setTimeout(() => {
            win.focus();
            win.print();
          }, 700);

          win.addEventListener("afterprint", () => {
            overlay.remove();
            iframe.remove();
          });

          setTimeout(() => {
            overlay.remove();
            iframe.remove();
          }, 5000);
        } catch (err) {
          console.error(err);
          frappe.msgprint("Printing Error. Check console.");
          overlay.remove();
          iframe.remove();
        }
      };

      iframe.onerror = () => {
        frappe.msgprint("Failed to load print preview");
        overlay.remove();
        iframe.remove();
      };
    }
  },
});
