frappe.ui.form.on("Case Closure", {
  onload(frm) {
    // --------------------------------------------------------------------------
    // AUTO-DETECTION VIA ROUTE (For Connection Tab Support)
    // --------------------------------------------------------------------------
    if (frm.is_new() && !frm.doc.reference_name) {
      const prev = frappe.get_prev_route();
      if (prev && prev[0] === "Form") {
        const src_dt = prev[1];
        const src_nm = prev[2];

        const ua_workflow = [
          "Unauthorized Absence",
          "Reminder Of Unauthorized Absence",
          "Ex Parte Enquiry",
        ];
        const dc_workflow = [
          "Disciplinary Case",
          "Response to SCN",
          "Domestic Enquiry",
          "Enquiry Reminder",
        ];
        if (ua_workflow.includes(src_dt) || dc_workflow.includes(src_dt)) {
          // ✅ Actual source doctype preserve karo
          frm.set_value("reference_doctype", src_dt);

          if (
            src_dt === "Disciplinary Case" ||
            src_dt === "Unauthorized Absence"
          ) {
            frm.set_value("reference_name", src_nm);
          } else {
            // Child workflow doctypes ka actual document name preserve karo
            frm.set_value("reference_name", src_nm);
          }
        }
      }
    }

    // If case_id is not present, nothing to process
    if (!frm.doc.case_id) return;

    // Trigger details fetch if reference is already set (for existing docs)
    if (frm.doc.reference_doctype && frm.doc.reference_name) {
      frm.trigger("reference_name");
    }

    /* -------------------------------------------------------------------------
    // LEGACY LOGIC (Commented out as per request)
    // -------------------------------------------------------------------------
    // List of workflow-related fields to control visibility
    const workflow_fields = [
      "status_of_response",
      "domestic_enquiry",
      "place_of_enquiry",
      "date_of_enquiry",
      "date_of_2nd_enquiry",
      "enquiry_officer_name",
    ];

    // Hide all workflow fields initially
    workflow_fields.forEach((f) => {
      if (frm.fields_dict[f]) {
        frm.set_df_property(f, "hidden", 1);
      }
    });

    // Fetch the latest linked enquiry for this case
    frappe.call({
      method: "sahayog.hrms.doctype.case_closure.case_closure.get_latest_linked_enquiry",
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
            "enquiry_officer_name",
          ],
        };

        const fields_to_show = visible_fields_by_doctype[linked_enquiry_type] || [];
        
        // Unhide & populate relevant fields
        fields_to_show.forEach((f) => {
          if (frm.fields_dict[f]) {
            frm.set_df_property(f, "hidden", 0);
            frm.set_df_property(f, "read_only", 1);
            if (data && data[f] != null) {
               frm.set_value(f, data[f]);
            }
          }
        });
      },
    });
    ------------------------------------------------------------------------- */
  },

  // --------------------------------------------------------------------------
  // ON SUBMIT: Close linked case stages
  // --------------------------------------------------------------------------

  // old logic (commented out as per request)
  // reference_name(frm) {
  //   if (frm.doc.reference_doctype && frm.doc.reference_name) {
  //     frappe.call({
  //       method:
  //         "sahayog.hrms.doctype.case_closure.case_closure.get_reference_details",
  //       args: {
  //         reference_doctype: frm.doc.reference_doctype,
  //         reference_name: frm.doc.reference_name,
  //       },
  //       callback: function (r) {
  //         if (r.message) {
  //           frm.set_value(r.message);

  //           // Define list of all enquiry-related fields
  //           const all_enquiry_fields = [
  //             "status_of_response",
  //             "domestic_enquiry",
  //             "place_of_enquiry",
  //             "date_of_enquiry",
  //             "enquiry_officer_name",
  //           ];

  //           // Dynamically show fields that are present in the response
  //           all_enquiry_fields.forEach((f) => {
  //             if (r.message[f] !== undefined && r.message[f] !== null) {
  //               frm.set_df_property(f, "hidden", 0);
  //               frm.set_df_property(f, "read_only", 1);
  //             } else {
  //               frm.set_df_property(f, "hidden", 1);
  //             }
  //           });
  //         }
  //       },
  //     });
  //   }
  // },
// -------------------------------------------------------------------------- 
  reference_name(frm) {
  if (frm.doc.reference_doctype && frm.doc.reference_name) {
    frappe.call({
      method:
                  "sahayog.hrms.doctype.case_closure.case_closure.get_reference_details",
      args: {
        reference_doctype: frm.doc.reference_doctype,
        reference_name: frm.doc.reference_name,
      },
      callback: function (r) {
        if (r.message) {
          const updates = {};

          Object.keys(r.message).forEach((key) => {
            const current_value = frm.doc[key];
            const incoming_value = r.message[key];

            const current_normalized =
              current_value === undefined || current_value === null || current_value === ""
                ? null
                : String(current_value).trim();

            const incoming_normalized =
              incoming_value === undefined || incoming_value === null || incoming_value === ""
                ? null
                : String(incoming_value).trim();

            if (current_normalized !== incoming_normalized) {
              updates[key] = incoming_value;
            }
          });

          if (Object.keys(updates).length > 0) {
            frm.set_value(updates);
          }

          const all_enquiry_fields = [
            "status_of_response",
              "domestic_enquiry",
              "place_of_enquiry",
              "date_of_enquiry",
              "enquiry_officer_name",
          ];

          all_enquiry_fields.forEach((f) => {
            if (r.message[f] !== undefined && r.message[f] !== null) {
              frm.set_df_property(f, "hidden", 0);
              frm.set_df_property(f, "read_only", 1);
            } else {
              frm.set_df_property(f, "hidden", 1);
            }
          });
        }
      },
    });
  }
},

  on_submit(frm) {
    if (!frm.doc.case_id) return;
    // Fetch latest linked enquiry
    frappe.call({
      method:
        "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
      args: { case_id: frm.doc.case_id },
    });
  },

  // --------------------------------------------------------------------------
  // AFTER SAVE: Success message after submission
  // --------------------------------------------------------------------------
  after_save(frm) {
    if (frm.doc.docstatus === 1) {
      frappe.msgprint({
        title: __("Success"),
        message: __("The case has been closed successfully."),
        indicator: "green",
      });
    }
  },
  // --------------------------------------------------------------------------
  // REFRESH: Buttons, Timeline, Reviewer actions
  // --------------------------------------------------------------------------
//   refresh(frm) {
//     // Toggle closure fields based on status and reference doctype presence or absence (Only when new)
//     toggle_closure_fields(frm);

//     // Remove duplicate Send Email button
//     // frm.remove_custom_button("Send Email");

//     // ---------------- SEND EMAIL BUTTON (Only when Closed) ----------------
//     if (!frm.is_new() && frm.doc.status === "Closed") {
//       frm.add_custom_button("Send Email", function () {
//         // Step 1: Validate employee email exists
//         frappe.call({
//           method:
//             "sahayog.hrms.doctype.case_closure.case_closure.check_employee_email",
//           args: { employee: frm.doc.employee_id },
//           callback(r) {
//             if (!r.message) {
//               frappe.msgprint({
//                 title: __("Email Not Found"),
//                 indicator: "red",
//                 message: __("No email is stored for this employee."),
//               });
//               return;
//             }

//             // Step 2: Fetch active print formats
//             frappe.call({
//               method: "frappe.client.get_list",
//               args: {
//                 doctype: "Print Format",
//                 filters: {
//                   doc_type: "Case Closure",
//                   disabled: 0,
//                 },
//                 fields: ["name"],
//               },
//               callback(res) {
//                 if (!res.message || !res.message.length) {
//                   frappe.msgprint("No Print Formats found.");
//                   return;
//                 }

//                 // Preferred print format ordering
//                 const preferred_order = [
//                   "Warning Letter",
//                   "Caution Letter",
//                   "Termination due to abandonment",
//                   "Office Order Termination of Services",
//                 ];

//                 let fetched_formats = res.message.map((p) => p.name);

//                 // Arrange formats in preferred order
//                 let ordered_formats = [];

//                 preferred_order.forEach((name) => {
//                   if (fetched_formats.includes(name)) {
//                     ordered_formats.push(name);
//                   }
//                 });

//                 // Add remaining formats (if any)
//                 fetched_formats.forEach((name) => {
//                   if (!ordered_formats.includes(name)) {
//                     ordered_formats.push(name);
//                   }
//                 });

//                 let options = ordered_formats.join("\n");

//                 // Print format selection dialog
//                 let d = new frappe.ui.Dialog({
//                   title: "Send Case Closure Email",
//                   fields: [
//                     {
//                       fieldtype: "Select",
//                       fieldname: "print_format",
//                       label: "Select Print Format",
//                       options: options,
//                       reqd: 1,
//                     },
//                   ],
//                   primary_action_label: "Send Email",
//                   primary_action(values) {
//                     frappe.call({
//                       method:
//                         "sahayog.hrms.doctype.case_closure.case_closure.send_case_closure_email",
//                       args: {
//                         docname: frm.doc.name,
//                         print_format: values.print_format,
//                       },
//                       freeze: true,
//                       freeze_message: __("Sending Email..."),
//                       callback() {
//                         frappe.msgprint(__("Email sent successfully!"));
//                         d.hide();
//                       },
//                     });
//                   },
//                 });

//                 d.show();
//               },
//             });
//           },
//         });
//       });
//     }

//     // ---------------- VIEW CASE HISTORY BUTTON ----------------
//     if (!frm.is_new()) {
//       const btn = frm.add_custom_button("View Case History", function () {
//         frappe.set_route("query-report", "Case History", {
//           case_id: frm.doc.case_id,
//         });
//       });

//       btn.removeClass("btn-default").addClass("btn-primary");
//     }
//     // ---------------- CUSTOM PRINT BUTTON ----------------
//     frappe.after_ajax(() => {
//       frm.trigger("show_print_button");
//     });
//     // Render Timeline
//     if (!frm.is_new()) {
//       load_case_timeline(frm);
//     }

//     // ---------------- CASE REVIEW BUTTON ----------------
//     // if (!frm.is_new()) {
//     //   frm.add_custom_button("Case Review", () => {
//     //     open_approver_dialog(frm);
//     //   });
//     // }

//     // ---------------- CASE REVIEW BUTTON ----------------
//     if (!frm.is_new() && frm.doc.status !== "Verified" && frm.doc.status !== "Closed") {
//         frm.add_custom_button("Case Review", () => open_approver_dialog(frm));
//     }

//     // ---------------- REVIEWER MAIL SYNC ----------------
//     // if (frm.__reviewer_mail_synced || frm.is_new()) return;

//     // frm.__reviewer_mail_synced = true;

//     // frappe.call({
//     //   method:
//     //     "sahayog.hrms.doctype.case_closure.case_closure.sync_reviewer_mail_checkbox",
//     //   args: {
//     //     case_closure_name: frm.doc.name,
//     //   },
//     //   callback() {
//     //     frm.refresh_field("review_details");
//     //   },
//     // });

//     // ---------------- REVIEWER MAIL SYNC ----------------
//     if (!frm.is_new() && !frm.__reviewer_mail_synced) {
//   frm.__reviewer_mail_synced = true;

//   frappe.call({
//     method: "sahayog.hrms.doctype.case_closure.case_closure.sync_reviewer_mail_checkbox",
//     args: {
//       case_closure_name: frm.doc.name,
//     },
//     callback: function (r) {
//       if (r.message && r.message.updated) {
//         frm.reload_doc();
//       }
//     },
//   });
// }

//     // ---------------- SUBMIT FEEDBACK BUTTON ----------------


//     if (!frm.is_new()) {
//     frappe.call({
//         method: "sahayog.hrms.doctype.case_closure.case_closure.can_submit_feedback",
//         args: {
//             case_closure_name: frm.doc.name
//         },
//         callback: function (r) {
//             const data = r.message || {};
//             if (!data.allowed) return;

//             frm.add_custom_button("Submit Feedback", function () {
//                 const d = new frappe.ui.Dialog({
//                     title: "Submit Feedback",
//                     fields: [
//                         {
//                             fieldtype: "Small Text",
//                             fieldname: "feedback",
//                             label: "Feedback",
//                             reqd: 1
//                         }
//                     ],
//                     primary_action_label: "Submit",
//                     primary_action(values) {
//                         frappe.call({
//                             method: "sahayog.hrms.doctype.case_closure.case_closure.submit_feedback",
//                             args: {
//                                 case_closure_name: frm.doc.name,
//                                 feedback: values.feedback
//                             },
//                             freeze: true,
//                             freeze_message: "Submitting feedback...",
//                             callback: function (res) {
//                                 if (res.message && res.message.status === "success") {
//                                     frappe.msgprint("Feedback submitted successfully.");
//                                     d.hide();
//                                     frm.reload_doc();
//                                 }
//                             }
//                         });
//                     }
//                 });
//                 d.show();
//             });
//         }
//     });
// }

// if (!frm.__dirty_debug_installed) {
//   frm.__dirty_debug_installed = true;

//   const original_set_value = frm.set_value.bind(frm);
//   frm.set_value = function (field, value, if_missing, skip_dirty_trigger = false) {
//     console.group("frm.set_value called");
//     console.log("Field:", field);
//     console.log("Value:", value);
//     console.log("Docname:", frm.doc.name);
//     console.log("is_dirty before:", frm.is_dirty());
//     console.trace("set_value trace");
//     console.groupEnd();

//     return original_set_value(field, value, if_missing, skip_dirty_trigger);
//   };

//   const original_dirty = frm.dirty.bind(frm);
//   frm.dirty = function () {
//     console.group("frm.dirty called");
//     console.log("Docname:", frm.doc.name);
//     console.log("Current doc snapshot:", JSON.parse(JSON.stringify(frm.doc)));
//     console.trace("dirty trace");
//     console.groupEnd();

//     return original_dirty();
//   };

//   frm.script_manager.trigger = (function (original_trigger) {
//     return async function (event_name, doctype, name) {
//       console.group("script_manager.trigger");
//       console.log("Event:", event_name);
//       console.log("Doctype:", doctype);
//       console.log("Name:", name);
//       console.trace("trigger trace");
//       console.groupEnd();

//       return original_trigger.apply(this, arguments);
//     };
//   })(frm.script_manager.trigger);
// }

// setTimeout(() => {
//     if (frm.doc.status === "Closed" && frm.page.btn_secondary) {
//         frm.page.btn_secondary.addClass("hide");
//     } else if (frm.page.btn_secondary) {
//         frm.page.btn_secondary.removeClass("hide");
//     }
// }, 100);
//   },

refresh(frm) {
    // Toggle closure fields based on status and reference doctype presence or absence (Only when new)
    toggle_closure_fields(frm);

    const can_manage_case_closure_buttons =
      frappe.user.has_role("Administrator") ||
      frappe.user.has_role("HR Manager") ||
      frappe.user.has_role("HR Support Executive");

    // Remove duplicate Send Email button
    // frm.remove_custom_button("Send Email");

    // ---------------- SEND EMAIL BUTTON (Only when Closed) ----------------
    if (!frm.is_new() && frm.doc.status === "Closed" && can_manage_case_closure_buttons) {
      frm.add_custom_button("Send Email", function () {
        // Step 1: Validate employee email exists
        frappe.call({
          method:
            "sahayog.hrms.doctype.case_closure.case_closure.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            if (!r.message) {
              frappe.msgprint({
                title: __("Email Not Found"),
                indicator: "red",
                message: __("No email is stored for this employee."),
              });
              return;
            }

            // USE SHARED DAMS EMAIL UTILITY
            sahayog.dams.open_email_composer(frm);
          },
        });
      });
    }

    /* 
    // ---------------- CUSTOM SEND EMAIL IMPLEMENTATION (COMMENTED OUT) ----------------
    // if (!frm.is_new() && frm.doc.status === "Closed" && can_manage_case_closure_buttons) {
    //   frm.add_custom_button("Send Email", function () {
    //     frappe.call({
    //       method:
    //         "sahayog.hrms.doctype.case_closure.case_closure.check_employee_email",
    //       args: { employee: frm.doc.employee_id },
    //       callback(r) {
    //         if (!r.message) {
    //           frappe.msgprint({
    //             title: __("Email Not Found"),
    //             indicator: "red",
    //             message: __("No email is stored for this employee."),
    //           });
    //           return;
    //         }
    //
    //         // Step 2: Fetch active print formats
    //         frappe.call({
    //           method: "frappe.client.get_list",
    //           args: {
    //             doctype: "Print Format",
    //             filters: {
    //               doc_type: "Case Closure",
    //               disabled: 0,
    //             },
    //             fields: ["name"],
    //           },
    //           callback(res) {
    //             if (!res.message || !res.message.length) {
    //               frappe.msgprint("No Print Formats found.");
    //               return;
    //             }
    //
    //             // Preferred print format ordering
    //             const preferred_order = [
    //               "Warning Letter",
    //               "Caution Letter",
    //               "Termination due to abandonment",
    //               "Office Order Termination of Services",
    //             ];
    //
    //             let fetched_formats = res.message.map((p) => p.name);
    //
    //             // Arrange formats in preferred order
    //             let ordered_formats = [];
    //
    //             preferred_order.forEach((name) => {
    //               if (fetched_formats.includes(name)) {
    //                 ordered_formats.push(name);
    //               }
    //             });
    //
    //             // Add remaining formats (if any)
    //             fetched_formats.forEach((name) => {
    //               if (!ordered_formats.includes(name)) {
    //                 ordered_formats.push(name);
    //               }
    //             });
    //
    //             let options = ordered_formats.join("\n");
    //
    //             // Print format selection dialog
    //             let d = new frappe.ui.Dialog({
    //               title: "Send Case Closure Email",
    //               fields: [
    //                 {
    //                   fieldtype: "Select",
    //                   fieldname: "print_format",
    //                   label: "Select Print Format",
    //                   options: options,
    //                   reqd: 1,
    //                 },
    //               ],
    //               primary_action_label: "Send Email",
    //               primary_action(values) {
    //                 frappe.call({
    //                   method:
    //                     "sahayog.hrms.doctype.case_closure.case_closure.send_case_closure_email",
    //                   args: {
    //                     docname: frm.doc.name,
    //                     print_format: values.print_format,
    //                   },
    //                   freeze: true,
    //                   freeze_message: __("Sending Email..."),
    //                   callback() {
    //                     frappe.msgprint(__("Email sent successfully!"));
    //                     d.hide();
    //                   },
    //                 });
    //               },
    //             });
    //
    //             d.show();
    //           },
    //         });
    //       },
    //     });
    //   });
    // }
    */

    // ---------------- VIEW CASE HISTORY BUTTON ----------------
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    // ---------------- CUSTOM PRINT BUTTON ----------------
    frappe.after_ajax(() => {
      frm.trigger("show_print_button");
    });

    // Render Timeline
    if (!frm.is_new()) {
      setTimeout(() => load_case_timeline(frm), 0);
    }

    // ---------------- CASE REVIEW BUTTON ----------------
    // if (!frm.is_new()) {
    //   frm.add_custom_button("Case Review", () => {
    //     open_approver_dialog(frm);
    //   });
    // }

    // ---------------- CASE REVIEW BUTTON ----------------
    if (
      !frm.is_new() &&
      frm.doc.status !== "Verified" &&
      frm.doc.status !== "Closed" &&
      can_manage_case_closure_buttons
    ) {
      frm.add_custom_button("Case Review", () => open_approver_dialog(frm));
    }

    // ---------------- REVIEWER MAIL SYNC ----------------
    // if (frm.__reviewer_mail_synced || frm.is_new()) return;

    // frm.__reviewer_mail_synced = true;

    // frappe.call({
    //   method:
    //     "sahayog.hrms.doctype.case_closure.case_closure.sync_reviewer_mail_checkbox",
    //   args: {
    //     case_closure_name: frm.doc.name,
    //   },
    //   callback() {
    //     frm.refresh_field("review_details");
    //   },
    // });

    // ---------------- REVIEWER MAIL SYNC ----------------
    if (!frm.is_new() && !frm.__reviewer_mail_synced) {
      frm.__reviewer_mail_synced = true;

      frappe.call({
        method: "sahayog.hrms.doctype.case_closure.case_closure.sync_reviewer_mail_checkbox",
        args: {
          case_closure_name: frm.doc.name,
        },
        callback: function (r) {
          if (r.message && r.message.updated) {
            frm.reload_doc();
          }
        },
      });
    }

    // ---------------- SUBMIT FEEDBACK BUTTON ----------------
    if (!frm.is_new()) {
      frappe.call({
        method: "sahayog.hrms.doctype.case_closure.case_closure.can_submit_feedback",
        args: {
          case_closure_name: frm.doc.name
        },
        callback: function (r) {
          const data = r.message || {};
          if (!data.allowed) return;

          frm.add_custom_button("Submit Feedback", function () {
            const d = new frappe.ui.Dialog({
              title: "Submit Feedback",
              fields: [
                {
                  fieldtype: "Small Text",
                  fieldname: "feedback",
                  label: "Feedback",
                  reqd: 1
                }
              ],
              primary_action_label: "Submit",
              primary_action(values) {
                frappe.call({
                  method: "sahayog.hrms.doctype.case_closure.case_closure.submit_feedback",
                  args: {
                    case_closure_name: frm.doc.name,
                    feedback: values.feedback
                  },
                  freeze: true,
                  freeze_message: "Submitting feedback...",
                  callback: function (res) {
                    if (res.message && res.message.status === "success") {
                      frappe.msgprint("Feedback submitted successfully.");
                      d.hide();
                      frm.reload_doc();
                    }
                  }
                });
              }
            });
            d.show();
          });
        }
      });
    }

    if (!frm.__dirty_debug_installed) {
      frm.__dirty_debug_installed = true;

      const original_set_value = frm.set_value.bind(frm);
      frm.set_value = function (field, value, if_missing, skip_dirty_trigger = false) {
        console.group("frm.set_value called");
        console.log("Field:", field);
        console.log("Value:", value);
        console.log("Docname:", frm.doc.name);
        console.log("is_dirty before:", frm.is_dirty());
        console.trace("set_value trace");
        console.groupEnd();

        return original_set_value(field, value, if_missing, skip_dirty_trigger);
      };

      const original_dirty = frm.dirty.bind(frm);
      frm.dirty = function () {
        console.group("frm.dirty called");
        console.log("Docname:", frm.doc.name);
        console.log("Current doc snapshot:", JSON.parse(JSON.stringify(frm.doc)));
        console.trace("dirty trace");
        console.groupEnd();

        return original_dirty();
      };

      frm.script_manager.trigger = (function (original_trigger) {
        return async function (event_name, doctype, name) {
          console.group("script_manager.trigger");
          console.log("Event:", event_name);
          console.log("Doctype:", doctype);
          console.log("Name:", name);
          console.trace("trigger trace");
          console.groupEnd();

          return original_trigger.apply(this, arguments);
        };
      })(frm.script_manager.trigger);
    }

    setTimeout(() => {
      if (frm.doc.status === "Closed" && frm.page.btn_secondary) {
        frm.page.btn_secondary.addClass("hide");
      } else if (frm.page.btn_secondary) {
        frm.page.btn_secondary.removeClass("hide");
      }
    }, 100);
},

  show_print_button: function (frm) {
    // Do not show print options for new (unsaved) documents
    if (frm.is_new()) return;
    // Prevent duplicate print buttons if already rendered
    if ($(frm.page.wrapper).find(".print-format-highlight").length) return;
    // Only allowed HR/System roles can see print options
    const allowed_roles = [
      "System Manager",
      "HR Support Executive",
      "HR Support Manager",
    ];
    // Exit if current user does not have any allowed role
    if (!frappe.user_roles.some((r) => allowed_roles.includes(r))) return;
    // --------------------------------------------------
    // Cleanup existing default Print buttons (Frappe default)
    // --------------------------------------------------
    try {
      frm.page.remove_custom_button("Print");
    } catch (e) {}
    try {
      frm.page.remove_menu_item("Print");
    } catch (e) {}

    // Create a dropdown-style primary button
    const $btn = $(
      frm.page.add_button("Select Print Format", null, "btn-primary"),
    );
    $btn
      .removeClass("btn-default")
      .addClass("btn-primary print-format-highlight");

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
    $wrapper.off("click.print").on("click.print", ".print-opt", function (e) {
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
          frm.doc.doctype,
        )}&name=${encodeURIComponent(frm.doc.name)}&format=${encodeURIComponent(
          format,
        )}&no_letterhead=1`,
      );

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;
          // Disable Frappe's internal auto-print
          if (win.print) {
            win.print = function () {};
          }
          if (win.frappe && win.frappe.utils && win.frappe.utils.print) {
            win.frappe.utils.print = function () {};
          }

          // --------------------------------------------------
          // Trigger manual print after preview loads
          // --------------------------------------------------
          setTimeout(() => {
            win.focus();

            // Restore manual print
            win.print = window.print.bind(win);
            win.print();
          }, 700);
          // Cleanup after printing
          win.addEventListener("afterprint", () => {
            overlay.remove();
            iframe.remove();
          });
          // Fallback cleanup in case afterprint doesn't fire
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
// ===============================
// CASE TIMELINE RENDERING

function render_timeline(frm, data) {
  // debug: show incoming timeline payload in console
  console.debug(
    "render_timeline payload:",
    data && data.timeline ? data.timeline : data,
  );
  // Remove existing timeline if any
  const wrap = $(frm.wrapper).find(".case-timeline-box");
  if (wrap.length) wrap.remove();
  // Insertion point before dashboard
  const insertion_point = $(".form-dashboard");

  let html = `
    <div class="case-timeline-box" style="
        background:#ffffff;
        border:1px solid #e0e0e0;
        padding:10px;
        margin-bottom:10px;
        border-radius:8px;
        box-shadow:0 1px 2px rgba(0,0,0,0.05);
        font-size:13px;
    ">
        <h4 style="margin-top:0; color:#1a73e8; font-weight:600; font-size:14px;">
            Case Progress Timeline
        </h4>

        <!-- TIMELINE BADGES -->
        <div style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-top:6px;">
  `;

  // guard: if no timeline array, do nothing
  const timeline_arr =
    data && data.timeline ? data.timeline : Array.isArray(data) ? data : [];
  if (!timeline_arr.length) {
    html += `<div style="color:#777; font-size:14px;">No timeline data available.</div>`;
  } else {
    timeline_arr.forEach((stage_obj, index) => {
      html += timeline_badge(stage_obj);
      if (index < timeline_arr.length - 1) {
        html += `<div style="font-size:20px; color:#9e9e9e; margin-top:15px;">→</div>`;
      }
    });
  }

  html += `
        </div>

        <!-- LEGEND OUTSIDE / BELOW -->
        <div style="
            margin-top:10px;
            padding-top:6px;
            border-top:1px solid #e0e0e0;
            font-size:11px;
            color:#777;
            display:flex;
            gap:14px;
            justify-content:right;
        ">
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">🟢</span><span>Completed</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">🟠</span><span>In Progress</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">⚪</span><span>Not Created</span>
            </div>
        </div>

    </div>
  `;

  insertion_point.before(html);
}
// ===============================
// TIMELINE BADGE HTML GENERATOR
function timeline_badge(stage_obj) {
  let bg = "#eeeeee",
    color = "#555",
    icon = "⚪";

  switch ((stage_obj.status || "").toLowerCase()) {
    case "submitted":
      bg = "#e8f5e9";
      color = "#1b5e20";
      icon = "🟢";
      break;
    case "saved":
      bg = "#fff4e5";
      color = "#e65100";
      icon = "🟠";
      break;
    case "cancelled":
      bg = "#f0f0f0"; // light gray
      color = "#999";
      icon = "⚪";
      break;
    default:
      bg = "#eeeeee";
      color = "#555";
      icon = "⚪";
  }

  // Get modified timestamp
  let ts =
    stage_obj.modified ||
    stage_obj.modified_on ||
    stage_obj.modified_at ||
    stage_obj.modified_date ||
    stage_obj.timestamp ||
    null;

  // Format timestamp in hh:mm AM/PM, dd MMM yyyy
  let formatted = "-";
  if (ts) {
    try {
      let d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const optsTime = { hour: "2-digit", minute: "2-digit", hour12: true };
        const optsDate = { day: "2-digit", month: "short", year: "numeric" };
        formatted = `${d.toLocaleTimeString(
          [],
          optsTime,
        )}, ${d.toLocaleDateString([], optsDate)}`;
      }
    } catch (e) {
      console.warn("Failed to format timestamp", e);
      formatted = String(ts);
    }
  }
  // Stage label fallbacks
  const stage_label =
    stage_obj.stage || stage_obj.doctype || stage_obj.title || "";

  return `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
      <!-- TIMESTAMP (small, above badge) -->
      <div style="font-size:10px; color:#777; margin-bottom:3px;">
        ${formatted}
      </div>

      <!-- EXISTING BADGE -->
      <div style="
          padding:3px 6px;
          background:${bg};
          color:${color};
          border-radius:14px;
          font-weight:600;
          display:flex;
          align-items:center;
          gap:4px;
          font-size:11px;
      ">
        ${icon} ${stage_label}
      </div>
    </div>
  `;
}
// ===============================
// DAMS Timeline Hover Tooltip
// ===============================
(function () {
  let tooltip = null;

  function show_tooltip(target, html) {
    hide_tooltip();

    tooltip = $(`
      <div style="
        position:absolute;
        background:#2e2e2e;
        color:#fff;
        padding:6px 8px;
        border-radius:6px;
        font-size:11px;
        z-index:99999;
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
        max-width:220px;
      ">
        ${html}
      </div>
    `);

    $("body").append(tooltip);

    const offset = $(target).offset();
    tooltip.css({
      top: offset.top - tooltip.outerHeight() - 6,
      left: offset.left + $(target).outerWidth() / 2 - tooltip.outerWidth() / 2,
    });
  }

  function hide_tooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  $(document).on(
    "mouseenter",
    ".case-timeline-box div[style*='border-radius:14px']",
    function () {
      const frm = cur_frm;
      if (!frm || !frm._timeline_counts) return;

      const label = $(this)
        .text()
        .replace(/^[^\w]+/, "")
        .trim();

      const info = frm._timeline_counts[label];

      let html = `<b>${label}</b>`;

      if (!info || info.count === 0) {
        html += `<br>No records created yet`;
      } else {
        html += `<br>Records created: ${info.count}`;
        html += `<br><span style="opacity:.8;">${info.names.join(
          "<br>",
        )}</span>`;
      }

      show_tooltip(this, html);
    },
  );

  $(document).on(
    "mouseleave",
    ".case-timeline-box div[style*='border-radius:14px']",
    hide_tooltip,
  );
})();

// FUNCTION TO OPEN REVIEWER SELECTION DIALOG BOX
function open_approver_dialog(frm) {
  let case_employee_id = frm.doc.employee_id;

  if (!case_employee_id) {
    frappe.msgprint("No employee found for this case.");
    return;
  }

  frappe.db.get_doc("Employee", case_employee_id).then((emp) => {
    let default_zone = emp.custom_zone;

    if (!default_zone) {
      frappe.msgprint("Employee does not have a zone assigned.");
      return;
    }

    let d = new frappe.ui.Dialog({
      title: "Select Reviewers",
      size: "extra-large",

      fields: [
        // ---------------- EXISTING REVIEWERS (READ-ONLY SECTION) ----------------
        {
          fieldname: "already_selected_section",
          fieldtype: "Section Break",
          label: "Already Selected Reviewers",
          collapsible: 1,
        },
        {
          fieldname: "existing_reviewers_html",
          fieldtype: "HTML",
        },

        // ---------------- NEW REVIEWERS (ADD NEW) ----------------
        {
          fieldname: "section_new",
          fieldtype: "Section Break",
          label: "Add New Reviewers",
        },

        {
          fieldtype: "Link",
          fieldname: "selected_zone",
          label: "Zone",
          options: "Zone",
          default: default_zone,
          reqd: 1,

          onchange() {
            d.fields_dict.approver_table.grid.refresh();
          },
        },

        {
          fieldname: "approver_table",
          fieldtype: "Table",
          label: "Reviewer List",
          cannot_add_rows: false,
          in_place_edit: true,

          fields: [
            {
              fieldtype: "Link",
              fieldname: "employee_id",
              label: "Employee ID",
              options: "Employee",
              in_list_view: true,
              reqd: 1,

              // get_query() {
              //   let zone = d.get_value("selected_zone");
              //   if (!zone) return {};
              //   return { filters: { custom_zone: zone } };
              // },
              // UPDATED get_query to exclude case employee
              get_query() {
                let zone = d.get_value("selected_zone");
                let case_employee = frm.doc.employee_id;

                if (!zone) return {};

                return {
                  filters: {
                    custom_zone: zone,
                    name: ["!=", case_employee], //exclude case employee
                  },
                };
              },

              onchange() {
                let row = this.grid_row.doc;
                if (!row.employee_id) return;

                let case_employee = frm.doc.employee_id;
                //BLOCK: Case employee cannot be reviewer
                if (row.employee_id === case_employee) {
                  frappe.msgprint({
                    title: __("Invalid Reviewer"),
                    message: __(
                      "The employee involved in the case cannot act as a reviewer.",
                    ),
                    indicator: "red",
                  });

                  row.employee_id = "";
                  row.employee_name = "";
                  row.company_email = "";
                  d.fields_dict.approver_table.grid.refresh();
                  return;
                }
                //BLOCK: Duplicate reviewer in dialog or parent table
                let dialog_rows = d.fields_dict.approver_table.grid.get_data();
                let duplicate_in_dialog = dialog_rows.some(
                  (r) => r.employee_id === row.employee_id && r !== row,
                );
                // BLOCK: Duplicate reviewer in dialog
                if (duplicate_in_dialog) {
                  frappe.msgprint(
                    "This reviewer is already selected in the dialog.",
                  );
                  row.employee_id = "";
                  row.employee_name = "";
                  row.company_email = "";
                  d.fields_dict.approver_table.grid.refresh();
                  return;
                }

                let duplicate_in_parent = (frm.doc.review_details || []).some(
                  (r) => r.employee_id === row.employee_id,
                );

                if (duplicate_in_parent) {
                  frappe.msgprint(
                    "This reviewer is already selected in the list.",
                  );
                  row.employee_id = "";
                  row.employee_name = "";
                  row.company_email = "";
                  d.fields_dict.approver_table.grid.refresh();
                  return;
                }

                frappe.db
                  .get_doc("Employee", row.employee_id)
                  .then((emp_data) => {
                    row.employee_name = emp_data.employee_name;
                    row.company_email =
                      emp_data.company_email || emp_data.prefered_email;
                    d.fields_dict.approver_table.grid.refresh();
                  });
              },
            },
            {
              fieldtype: "Data",
              fieldname: "employee_name",
              label: "Employee Name",
              in_list_view: true,
              read_only: 1,
            },
            {
              fieldtype: "Data",
              fieldname: "company_email",
              label: "Company Email",
              in_list_view: true,
              reqd: 1,
            },
          ],
        },
      ],

      primary_action_label: "Submit",

      primary_action(values) {
        for (let row of values.approver_table || []) {
          if (!row.company_email) {
            frappe.msgprint("Please fill Company Email for all reviewers.");
            return;
          }
        }

        frappe.confirm(
          "Please confirm that the reviewer selection is accurate before submitting.",
          () => submit_approvers(frm, values, d),
          () => {},
        );
      },
    });

    // ---------- SHOW EXISTING REVIEWERS IN READ-ONLY HTML ----------
    let existing = frm.doc.review_details || [];

    if (existing.length > 0) {
      let html = `
          <table class="table table-bordered" style="margin-top:10px">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Remarks</th>
                <th>Status</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
        `;

      existing.forEach((r) => {
        html += `
            <tr>
              <td>${r.employee_id}</td>
              <td>${r.remarks || ""}</td>
              <td>${r.status || ""}</td>
              <td>${r.date_and_time || ""}</td>
            </tr>
        `;
      });

      html += `</tbody></table>`;
      d.fields_dict.existing_reviewers_html.$wrapper.html(html);
    } else {
      d.fields_dict.existing_reviewers_html.$wrapper.html(
        "<p style='color:#888'>No reviewers selected yet.</p>",
      );
    }

    d.show();
  });
}

// function submit_approvers(frm, values, dialog) {
//   // A. Validate new reviewers
//   const new_reviewers = values.approver_table || [];
//   // B. Add new reviewers to parent document
//   if (new_reviewers.length === 0) {
//     frappe.msgprint(__("No new reviewers selected."));
//     dialog.hide();
//     return;
//   }

//   // add each new reviewer to parent doc's review_details child table
//   new_reviewers.forEach((row) => {
//     let child = frm.add_child("review_details");

//     // ensure employee details are copied from dialog to child table
//     child.employee_id = row.employee_id;
//     child.employee_name = row.employee_name; // Add employee name
//     child.company_email = row.company_email; // Add company email

//     // other fields with default values
//     child.remarks = "";
//     child.status = "Pending";
//     child.date_and_time = frappe.datetime.now_datetime();
//   });

//   frm.refresh_field("review_details");

//   // C. Update status to "Under Review" if new reviewers are added 
//   if (new_reviewers.length > 0) {
//     frm.set_value("status", "Under Review");
//   }

//   //  D. Save parent document
//   frm.save().then(() => {
//     // -----------------------------------------------------
//     // FIRST CALL → VERIFICATION PROCESS EMAILS
//     // -----------------------------------------------------
//     frappe.call({
//       method:
//         "sahayog.hrms.doctype.case_closure.case_closure.start_verification_process",
//       args: {
//         // Pass only the new reviewers, as existing ones might already be processed
//         approvers: new_reviewers,
//         case_id: frm.doc.name,
//       },
//       freeze: true,
//       freeze_message: __("Sending verification emails..."),
//       callback(r) {
//         console.log("START VERIFICATION RESPONSE:", r);

//         if (r.message?.status !== "ok") {
//           frappe.msgprint({
//             title: __("Verification Failed"),
//             message: r.message?.msg,
//             indicator: "red",
//           });
//           return;
//         }

//         frappe.msgprint({
//           title: __("Verification Started"),
//           message: __("Case Review process started successfully."),
//           indicator: "green",
//         });
//       },
//     });

//     // -----------------------------------------------------
//     // SECOND CALL → TEMPLATE-BASED EMAIL
//     // -----------------------------------------------------
//     frappe.call({
//       method:
//         "sahayog.hrms.doctype.case_closure.case_closure.send_email_for_review",
//       args: {
//         case_id: frm.doc.name,
//         // Pass only the new approvers' details for the email content
//         approvers: JSON.stringify(new_reviewers),
//       },
//       freeze: true,
//       freeze_message: __("Sending review notification email..."),
//       callback(r) {
//         console.log("TEMPLATE EMAIL RESPONSE:", r);
//         // (Callback logic remains the same)
//         if (r.message?.status === "disabled") {
//           frappe.msgprint({
//             title: __("Email Disabled"),
//             message: __("Email notifications are disabled."),
//             indicator: "orange",
//           });
//           return;
//         }

//         if (r.message?.status === "ok") {
//           frappe.msgprint({
//             title: __("Success"),
//             message: __("Review notification email has been sent."),
//             indicator: "green",
//           });
//           return;
//         }

//         frappe.msgprint({
//           title: __("Email Failed"),
//           message:
//             r.message?.msg || __("Could not send review notification email."),
//           indicator: "red",
//         });
//       },
//     });

//     dialog.hide();
//   });
// }

// function to display review details with employee info


function submit_approvers(frm, values, dialog) {
  const new_reviewers = values.approver_table || [];

  if (!new_reviewers.length) {
    frappe.msgprint("No new reviewers selected.");
    dialog.hide();
    return;
  }

  new_reviewers.forEach((row) => {
    const child = frm.add_child("review_details");
    child.employee_id = row.employee_id;
    child.employee_name = row.employee_name;
    child.company_email = row.company_email;
    child.remarks = "";
    child.status = "Pending";
    child.date_time = frappe.datetime.now_datetime();
  });

  frm.set_value("status", "Under Review");
  frm.refresh_field("review_details");

  frm.save().then(() => {
    frappe.call({
      method: "sahayog.hrms.doctype.case_closure.case_closure.start_verification_process",
      args: {
        approvers: new_reviewers,
        case_id: frm.doc.name,
      },
      freeze: true,
      freeze_message: "Sending verification emails...",
    });

    frappe.call({
      method: "sahayog.hrms.doctype.case_closure.case_closure.send_email_for_review",
      args: {
        case_id: frm.doc.name,
        approvers: JSON.stringify(new_reviewers),
      },
      freeze: true,
      freeze_message: "Sending review notification email...",
    });

    frappe.msgprint({
      title: "Success",
      message: "Review process started and status changed to Under Review.",
      indicator: "green",
    });

    dialog.hide();
    frm.reload_doc();
  });
}



function display_review_details_with_employee_info(frm) {
  let wrapper = frm.fields_dict.review_details_html.$wrapper;
  wrapper.html(`<div>Loading review details...</div>`);

  if (!frm.doc.review_details || frm.doc.review_details.length === 0) {
    wrapper.html(`<div style="color:#888;">No review details available.</div>`);
    return;
  }

  let rows = frm.doc.review_details;
  let employee_ids = rows.map((r) => r.employee_id);

  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee",
      filters: { name: ["in", employee_ids] },
      fields: [
        "name",
        "employee_name",
        "designation",
        "sol_id",
        "branch",
        "custom_zone",
        "custom_region",
      ],
    },
    callback(r) {
      let employees = {};
      (r.message || []).forEach((emp) => {
        employees[emp.name] = emp;
      });
      let html = `
  <table class="table table-bordered"
         style="font-size:12px; width:100%; table-layout:fixed;">

      <thead>
          <tr>
              <th style="word-wrap:break-word;">Employee ID</th>
              <th style="word-wrap:break-word;">Name</th>
              <th style="word-wrap:break-word;">Designation</th>
              <th style="word-wrap:break-word;">Branch ID</th>
              <th style="word-wrap:break-word;">Branch Name</th>
              <th style="word-wrap:break-word;">Zone</th>
              <th style="word-wrap:break-word;">Region</th>
              <th style="word-wrap:break-word;">Status</th>
              <th style="word-wrap:break-word;">Remarks</th>
              <th style="word-wrap:break-word;">Date & Time</th>
          </tr>
      </thead>
      <tbody>
`;

      rows.forEach((row) => {
        let emp = employees[row.employee_id] || {};

        // ✅ Convert date to DD-MM-YYYY hh:mm A
        // Correct date formatting using moment.js
        let formatted_date = "-";
        if (row.date_and_time) {
          let dt = frappe.datetime.str_to_obj(row.date_and_time);
          formatted_date = moment(dt).format("DD-MM-YYYY hh:mm A");
        }

        html += `
                <tr>
                    <td>${row.employee_id}</td>
                    <td>${emp.employee_name || "-"}</td>
                    <td>${emp.designation || "-"}</td>
                    <td>${emp.sol_id || "-"}</td>
                    <td>${emp.branch || "-"}</td>
                    <td>${emp.custom_zone || "-"}</td>
                    <td>${emp.custom_region || "-"}</td>
                    <td>${row.status || "-"}</td>
                    <td>${row.remarks || "-"}</td>
                    <td>${formatted_date}</td>
                </tr>
            `;
      });

      html += `</tbody></table>`;
      wrapper.html(html);
    },
  });
}

// function load_case_timeline(frm) {
//   const case_id = frm.doc.case_id || frm.doc.name;
//   if (!case_id) return;

//   const standard_stages = [
//     { doctype: "Disciplinary Case", label: "Disciplinary Case", can_create: false },
//     { doctype: "Suspension Process", label: "Suspension Process" },
//     { doctype: "Response to SCN", label: "Response to SCN" },
//     { doctype: "Domestic Enquiry", label: "Domestic Enquiry" },
//     { doctype: "Enquiry Reminder", label: "Enquiry Reminder" },
//     { doctype: "Case Closure", label: "Case Closure" },
//   ];

//   const ua_stages = [
//     { doctype: "Unauthorized Absence", label: "Unauthorized Absence" },
//     { doctype: "Reminder Of Unauthorized Absence", label: "Reminder Of Unauthorized Absence" },
//     { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry" },
//     { doctype: "Case Closure", label: "Case Closure" },
//   ];

//   const is_ua =
//     String(case_id).startsWith("UA") ||
//     (frm.doc.case_type || "").toLowerCase() === "unauthorized absence" ||
//     frm.doctype === "Unauthorized Absence" ||
//     frm.doctype === "Reminder Of Unauthorized Absence" ||
//     frm.doctype === "Ex Parte Enquiry";

//   const stage_defs = (is_ua ? ua_stages : standard_stages).map((stage, index) => ({
//     ...stage,
//     key: `${stage.doctype}-${index}`,
//     status: "current",
//     modified: null,
//     record_count: 0,
//     names: [],
//     can_create: stage.can_create !== false,
//     allow_multiple: false,
//     quick_entry: true,
//     defaults: {
//       case_id,
//       ...(frm.doc.employee_id ? { employee_id: frm.doc.employee_id } : {}),
//     },
//   }));

//   // const build_config = (stages) => ({
//   //   title: __("Case Progress Timeline"),
//   //   case_id,
//   //   stages,
//   //   get_defaults(stage) {
//   //     return stage.defaults || { case_id };
//   //   },
//   //   before_open() {
//   //     if (frm.is_dirty()) {
//   //       frappe.msgprint({
//   //         title: __("Please Save First"),
//   //         message: __("Save the form before creating a linked record."),
//   //         indicator: "orange",
//   //       });
//   //       return false;
//   //     }
//   //   },
//   //   after_insert() {
//   //     frm.reload_doc();
//   //   },
//   // });


//   const build_config = (stages) => ({
//   title: "Case Progress Timeline",
//   case_id,
//   stages,
//   get_defaults(stage) {
//     return stage.defaults || { case_id };
//   },
//   before_open(stage) {
//     if (stage.doctype === "Case Closure") {
//       open_approver_dialog(frm);
//       return false;
//     }

//     if (frm.is_dirty()) {
//       frappe.msgprint({
//         title: "Please Save First",
//         message: "Save the form before creating a linked record.",
//         indicator: "orange",
//       });
//       return false;
//     }
//   },
//   after_insert() {
//     frm.reload_doc();
//   },
// });

//   const merge_stage_meta = (timeline, record_summaries) => {
//     return stage_defs.map((stage) => {
//       const status_match = timeline.find(
//         (item) => item.doctype === stage.doctype || item.stage === stage.doctype,
//       );
//       const summary_match = record_summaries.find((item) => item.doctype === stage.doctype) || {};
//       return {
//         ...stage,
//         status: status_match?.status || stage.status,
//         modified: status_match?.modified || stage.modified,
//         record_count: summary_match.count || 0,
//         names: summary_match.names || [],
//       };
//     });
//   };

//   const render_with_data = (timeline, summaries) => {
//     const merged = merge_stage_meta(timeline || [], summaries || []);
//     window.sahayogCaseTimeline.render(frm, build_config(merged));
//   };

//   const load_record_summaries = () => {
//     return Promise.all(
//       stage_defs.map((stage) =>
//         frappe.db
//           .get_list(stage.doctype, {
//             filters: { case_id },
//             fields: ["name"],
//             order_by: "creation asc",
//             limit_page_length: 500,
//           })
//           .then((records) => ({
//             doctype: stage.doctype,
//             count: (records || []).length,
//             names: (records || []).map((row) => row.name),
//           }))
//           .catch(() => ({ doctype: stage.doctype, count: 0, names: [] })),
//       ),
//     );
//   };

//   const load_timeline = () =>
//     frappe.xcall(
//       "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
//       { case_id },
//     );

//   const init = () => {
//     if (!window.sahayogCaseTimeline) return;

//     Promise.all([load_record_summaries(), load_timeline()])
//       .then(([summaries, timeline_res]) => {
//         const timeline = timeline_res && timeline_res.timeline ? timeline_res.timeline : [];
//         render_with_data(timeline, summaries || []);
//       })
//       .catch((error) => {
//         console.warn("Timeline load failed", error);
//         render_with_data([], []);
//       });
//   };

//   if (window.sahayogCaseTimeline) {
//     init();
//     return;
//   }

//   frappe.require("/assets/sahayog/js/case_timeline.js", init);
// }



// exisiting working
// function load_case_timeline(frm) {
//   const case_id = frm.doc.case_id || frm.doc.name;
//   if (!case_id) return;

//   const standard_stages = [
//     { doctype: "Disciplinary Case", label: "Disciplinary Case", can_create: false },
//     { doctype: "Suspension Process", label: "Suspension Process" },
//     { doctype: "Response to SCN", label: "Response to SCN" },
//     { doctype: "Domestic Enquiry", label: "Domestic Enquiry" },
//     { doctype: "Enquiry Reminder", label: "Enquiry Reminder" },
//     { doctype: "Case Closure", label: "Case Closure" },
//   ];

//   const ua_stages = [
//     { doctype: "Unauthorized Absence", label: "Unauthorized Absence" },
//     { doctype: "Reminder Of Unauthorized Absence", label: "Reminder Of Unauthorized Absence" },
//     { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry" },
//     { doctype: "Case Closure", label: "Case Closure" },
//   ];

//   const is_ua =
//     String(case_id).startsWith("UA") ||
//     (frm.doc.case_type || "").toLowerCase() === "unauthorized absence" ||
//     frm.doctype === "Unauthorized Absence" ||
//     frm.doctype === "Reminder Of Unauthorized Absence" ||
//     frm.doctype === "Ex Parte Enquiry";

//   const stage_defs = (is_ua ? ua_stages : standard_stages).map((stage, index) => ({
//     ...stage,
//     key: `${stage.doctype}-${index}`,
//     status: "current",
//     modified: null,
//     record_count: 0,
//     names: [],
//     can_create: stage.can_create !== false,
//     allow_multiple: false,
//     quick_entry: true,
//     defaults: {
//       case_id,
//       ...(frm.doc.employee_id ? { employee_id: frm.doc.employee_id } : {}),
//     },
//   }));

//   const build_config = (stages) => ({
//     title: "Case Progress Timeline",
//     case_id,
//     stages,

//     get_defaults(stage) {
//       return stage.defaults || { case_id };
//     },

//     before_open(stage) {
//       if (frm.is_dirty()) {
//         frappe.msgprint({
//           title: "Please Save First",
//           message: "Save the form before creating a linked record.",
//           indicator: "orange",
//         });
//         return false;
//       }

//       if (stage.doctype === "Case Closure") {
//         open_approver_dialog(frm);
//         return false;
//       }

//       return true;
//     },

//     after_insert() {
//       frm.reload_doc();
//     },
//   });

//   const merge_stage_meta = (timeline, record_summaries) => {
//     return stage_defs.map((stage) => {
//       const status_match = (timeline || []).find(
//         (item) => item.doctype === stage.doctype || item.stage === stage.doctype,
//       );

//       const summary_match =
//         (record_summaries || []).find((item) => item.doctype === stage.doctype) || {};

//       return {
//         ...stage,
//         status: status_match?.status || stage.status,
//         modified: status_match?.modified || stage.modified,
//         record_count: summary_match.count || 0,
//         names: summary_match.names || [],
//       };
//     });
//   };

//   const render_with_data = (timeline, summaries) => {
//     const merged = merge_stage_meta(timeline || [], summaries || []);
//     window.sahayogCaseTimeline.render(frm, build_config(merged));
//   };

//   const load_record_summaries = () => {
//     return Promise.all(
//       stage_defs.map((stage) =>
//         frappe.db
//           .get_list(stage.doctype, {
//             filters: { case_id },
//             fields: ["name"],
//             order_by: "creation asc",
//             limit_page_length: 500,
//           })
//           .then((records) => ({
//             doctype: stage.doctype,
//             count: (records || []).length,
//             names: (records || []).map((row) => row.name),
//           }))
//           .catch(() => ({
//             doctype: stage.doctype,
//             count: 0,
//             names: [],
//           })),
//       ),
//     );
//   };

//   const load_timeline = () =>
//     frappe.xcall(
//       "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
//       { case_id },
//     );

//   const init = () => {
//     if (!window.sahayogCaseTimeline) return;

//     Promise.all([load_record_summaries(), load_timeline()])
//       .then(([summaries, timeline_res]) => {
//         const timeline =
//           timeline_res && Array.isArray(timeline_res.timeline)
//             ? timeline_res.timeline
//             : Array.isArray(timeline_res)
//             ? timeline_res
//             : [];

//         render_with_data(timeline, summaries || []);
//       })
//       .catch((error) => {
//         console.warn("Timeline load failed", error);
//         render_with_data([], []);
//       });
//   };

//   if (window.sahayogCaseTimeline) {
//     init();
//     return;
//   }

//   frappe.require("/assets/sahayog/js/case_timeline.js", init);
// }


// new 
function load_case_timeline(frm) {
  const case_id = frm.doc.case_id || frm.doc.name;
  if (!case_id) return;

  const standard_stages = [
    { doctype: "Disciplinary Case", label: "Disciplinary Case", can_create: false },
    { doctype: "Suspension Process", label: "Suspension Process" },
    { doctype: "Response to SCN", label: "Response to SCN" },
    { doctype: "Domestic Enquiry", label: "Domestic Enquiry" },
    { doctype: "Enquiry Reminder", label: "Enquiry Reminder" },
    { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry" },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const ua_stages = [
    { doctype: "Unauthorized Absence", label: "Unauthorized Absence" },
    { doctype: "Reminder Of Unauthorized Absence", label: "Reminder Of Unauthorized Absence" },
    { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry" },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const is_ua =
    String(case_id).startsWith("UA") ||
    (frm.doc.case_type || "").toLowerCase() === "unauthorized absence" ||
    frm.doctype === "Unauthorized Absence" ||
    frm.doctype === "Reminder Of Unauthorized Absence";

  const stage_defs = (is_ua ? ua_stages : standard_stages).map((stage, index) => ({
    ...stage,
    key: `${stage.doctype}-${index}`,
    status: "current",
    modified: null,
    record_count: 0,
    names: [],
    can_create: stage.can_create !== false,
    allow_multiple: false,
    quick_entry: true,
    defaults: {
      case_id,
      ...(frm.doc.employee_id ? { employee_id: frm.doc.employee_id } : {}),
    },
  }));

  const build_config = (stages) => ({
    title: "Case Progress Timeline",
    case_id,
    stages,

    get_defaults(stage) {
      return stage.defaults || { case_id };
    },

    before_open(stage) {
      if (frm.is_dirty()) {
        frappe.msgprint({
          title: "Please Save First",
          message: "Save the form before creating a linked record.",
          indicator: "orange",
        });
        return false;
      }

      if (stage.doctype === "Case Closure") {
        open_approver_dialog(frm);
        return false;
      }

      return true;
    },

    after_insert() {
      frm.reload_doc();
    },
  });

  const merge_stage_meta = (timeline, record_summaries) => {
    return stage_defs.map((stage) => {
      const status_match = (timeline || []).find(
        (item) => item.doctype === stage.doctype || item.stage === stage.doctype,
      );

      const summary_match =
        (record_summaries || []).find((item) => item.doctype === stage.doctype) || {};

      return {
        ...stage,
        status: status_match?.status || stage.status,
        modified: status_match?.modified || stage.modified,
        record_count: summary_match.count || 0,
        names: summary_match.names || [],
      };
    });
  };

  const render_with_data = (timeline, summaries) => {
    const merged = merge_stage_meta(timeline || [], summaries || []);
    window.sahayogCaseTimeline.render(frm, build_config(merged));
  };

  const load_record_summaries = () => {
    return frappe.xcall(
      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stage_counts",
      { case_id }
    ).then((counts) => stage_defs.map((stage) => ({
      doctype: stage.doctype,
      count: (counts[stage.doctype] || {}).count || 0,
      names: (counts[stage.doctype] || {}).names || [],
    }))).catch(() => stage_defs.map((stage) => ({
      doctype: stage.doctype,
      count: 0,
      names: [],
    })));
  };

  const load_timeline = () =>
    frappe.xcall(
      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
      { case_id },
    );

  const init = () => {
    if (!window.sahayogCaseTimeline) return;

    Promise.all([load_record_summaries(), load_timeline()])
      .then(([summaries, timeline_res]) => {
        const timeline =
          timeline_res && Array.isArray(timeline_res.timeline)
            ? timeline_res.timeline
            : Array.isArray(timeline_res)
            ? timeline_res
            : [];

        render_with_data(timeline, summaries || []);
      })
      .catch((error) => {
        console.warn("Timeline load failed", error);
        render_with_data([], []);
      });
  };

  if (window.sahayogCaseTimeline) {
    init();
    return;
  }

  frappe.require("/assets/sahayog/js/case_timeline.js", init);
}

function toggle_closure_fields(frm) {
    const controlled_fields = [
        "remarks",
        "enquiry_status",
        "enquiry_report_upload",
        "case_close_with"
    ];

    const allowed_roles = ["Administrator", "HR Manager", "HR Support Executive"];
    const has_allowed_role =
        frappe.user.has_role("Administrator") ||
        allowed_roles.some(role => frappe.user.has_role(role));

    const all_reviews_submitted =
        Array.isArray(frm.doc.review_details) &&
        frm.doc.review_details.length > 0 &&
        frm.doc.review_details.every(row =>
            row.employee_id &&
            row.remarks &&
            String(row.remarks).trim() &&
            String(row.status || "").toLowerCase() === "submitted"
        );

    const can_edit = has_allowed_role && all_reviews_submitted;

    controlled_fields.forEach(fieldname => {
        if (frm.fields_dict[fieldname]) {
            frm.set_df_property(fieldname, "read_only", can_edit ? 0 : 1);

            if (!has_allowed_role) {
                frm.set_df_property(fieldname, "hidden", 1);
            } else {
                frm.set_df_property(fieldname, "hidden", 0);
            }
        }
    });
     if (frm.fields_dict.section_break_webc) {
    frm.set_df_property("section_break_webc", "hidden", can_edit ? 0 : 1);
  }
}