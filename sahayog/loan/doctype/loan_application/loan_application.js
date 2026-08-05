frappe.ui.form.on("Loan Application", {
  // before_workflow_action: function (frm) {
  //   frappe.dom.unfreeze();
  //   return new Promise((resolve, reject) => {
  //     frappe.confirm(
  //       __("Are you sure you want to proceed with <b>{0}</b>?", [
  //         frm.selected_workflow_action,
  //       ]),
  //       () => resolve(),
  //       () => {
  //         frappe.validated = false;
  //         reject();
  //       }
  //     );
  //   });
  // },
  // lead_generator_code handles fetch_from automatically via Employee link
  father_husband_name: function(frm) {
        if (frm.doc.father_husband_name) {
            let formatted = frm.doc.father_husband_name.toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
            frm.set_value("father_husband_name", formatted);
        }
    },

 before_workflow_action: function (frm) {
        frappe.dom.unfreeze();
        return new Promise((resolve, reject) => {
            
            // ==========================================
            // 1. CREDIT CHECK VALIDATION
            // ==========================================
            if (frm.doc.status === "Credit Check" && frm.selected_workflow_action === "Accept") {
                let missing_fields = [];
                
                if (!frm.doc.cibil_score) missing_fields.push("CIBIL Score");
                if (!frm.doc.dedup) missing_fields.push("Dedup");
                if (!frm.doc.credit_appraisal) missing_fields.push("Credit Remarks");

                if (missing_fields.length > 0) {
                    frappe.msgprint({
                        title: __('Missing Mandatory Fields'),
                        indicator: 'red',
                        message: __('Please enter values for the following fields before accepting:<br><br><ul><li><b>' + missing_fields.join('</b></li><li><b>') + '</b></li></ul>')
                    });
                    
                    frappe.validated = false;
                    reject(); 
                    return;
                }
            }

            // ==========================================
            // 2. CPC PROCESSING VERIFICATION
            // ==========================================
            // if (frm.doc.status === "CPC Processing" && frm.selected_workflow_action === "Approve") {
            //     let required_docs = ["Loan Agreement", "Sanction Letter"];
            //     let errors = [];

            //     required_docs.forEach(doc_type => {
            //         let row = (frm.doc.kyc_documents || []).find(d => d.document_type === doc_type);

            //         if (!row) {
            //             errors.push(`<b>${doc_type}</b> row is missing from KYC Documents.`);
            //         } else {
            //             // Assuming your attachment field is named "document_url" or "file". Update as needed!
            //             let file_field = row.document_file || row.file || row.document; 
                        
            //             if (!file_field) { 
            //                 errors.push(`Please attach the document file for <b>${doc_type}</b>.`);
            //             }
                        
            //             // Check if status is explicitly Verified
            //             if (row.status !== "Verified") {
            //                 errors.push(`Status for <b>${doc_type}</b> must be "Verified".`);
            //             }
            //         }
            //     });

            //     if (errors.length > 0) {
            //         frappe.msgprint({
            //             title: __('CPC Verification Pending'),
            //             indicator: 'red',
            //             message: __('Cannot approve the application yet. Please resolve the following:<br><br><ul><li>' + errors.join('</li><li>') + '</li></ul>')
            //         });
                    
            //         frappe.validated = false;
            //         reject();
            //         return;
            //     }
            // }

            // ==========================================
            // 2. CPC PROCESSING VERIFICATION (STRICT MANUAL CHECK)
            // ==========================================
            if (frm.doc.status === "CPC Processing" && frm.selected_workflow_action === "Approve") {
                let errors = [];

                if (!frm.doc.kyc_documents || frm.doc.kyc_documents.length === 0) {
                    frappe.msgprint({
                        title: __('Missing Documents'),
                        indicator: 'red',
                        message: __('No documents found in the KYC table.')
                    });
                    frappe.validated = false;
                    reject();
                    return;
                } 

                // Loop through EVERY row and perform strict validations
                $.each(frm.doc.kyc_documents, function(index, row) {
                    let doc_name = row.document_type || `Row ${index + 1}`;
                    
                    // 1. Check for Document Attachment (Mandatory for ALL rows)
                    if (!row.document_file) {
                        errors.push(`<b>${doc_name}</b>: Missing document attachment.`);
                    }

                    // 2. Check for Document Number (Mandatory ONLY for Aadhaar & PAN)
                    if (row.document_type === "Aadhaar Card" || row.document_type === "PAN Card") {
                        if (!row.document_number) {
                            errors.push(`<b>${doc_name}</b>: Missing Document Number.`);
                        }
                    }

                    // 3. Check Manual Verification Status (Mandatory for ALL rows)
                    if (row.status !== "Verified") {
                        errors.push(`<b>${doc_name}</b>: Status has not been marked as 'Verified'.`);
                    }
                });

                // If ANY validation failed on ANY row, block the approval
                if (errors.length > 0) {
                    frappe.msgprint({
                        title: __('Cannot Approve: Pending Validations'),
                        indicator: 'red',
                        message: __('Please resolve the following issues before approving:<br><br><ul style="margin-bottom: 0;"><li>' + errors.join('</li><li>') + '</li></ul>')
                    });
                    
                    frappe.validated = false;
                    reject(); 
                    return;
                }
            }




            // ==========================================
            // 2. CPC PROCESSING VERIFICATION (AUTO-VERIFY)
            // ==========================================
            // if (frm.doc.status === "CPC Processing" && frm.selected_workflow_action === "Approve") {
            //     let missing_errors = [];
            //     let changes_made = false;

            //     if (!frm.doc.kyc_documents || frm.doc.kyc_documents.length === 0) {
            //         missing_errors.push("No documents found in the KYC table.");
            //     } else {
            //         // Loop through EVERY row
            //         $.each(frm.doc.kyc_documents, function(index, row) {
            //             let doc_name = row.document_type || `Row ${index + 1}`;
            //             let row_is_valid = true;
                        
            //             // Condition A: Aadhaar Card & PAN Card
            //             if (row.document_type === "Aadhaar Card" || row.document_type === "PAN Card") {
            //                 if (!row.document_file) {
            //                     missing_errors.push(`Missing attachment for <b>${doc_name}</b>.`);
            //                     row_is_valid = false;
            //                 }
            //                 if (!row.document_number) {
            //                     missing_errors.push(`Missing Document Number for <b>${doc_name}</b>.`);
            //                     row_is_valid = false;
            //                 }
            //             } 
            //             // Condition B: All other document types
            //             else {
            //                 if (!row.document_file) {
            //                     missing_errors.push(`Missing attachment for <b>${doc_name}</b>.`);
            //                     row_is_valid = false;
            //                 }
            //             }

            //             // Auto-Verify if valid!
            //             if (row_is_valid) {
            //                 if (row.status !== "Verified") {
            //                     frappe.model.set_value(row.doctype, row.name, "status", "Verified");
            //                     changes_made = true;
            //                 }
            //             }
            //         });
            //     }

            //     if (missing_errors.length > 0) {
            //         frappe.msgprint({
            //             title: __('Cannot Approve: Missing Details'),
            //             indicator: 'red',
            //             message: __('Please attach files and enter missing numbers before approving:<br><br><ul><li>' + missing_errors.join('</li><li>') + '</li></ul>')
            //         });
                    
            //         if (changes_made) {
            //             frm.refresh_field("kyc_documents");
            //         }
                    
            //         frappe.validated = false;
            //         reject(); 
            //         return;
            //     }

            //     // FIX: If we made changes and there are no errors, forcefully save the document 
            //     // BEFORE the workflow action completes, ensuring the Verified statuses are permanently captured.
            //     if (changes_made) {
            //         frm.save('Save', () => {
            //             frappe.confirm(`Are you sure you want to proceed with ${frm.selected_workflow_action}?`,
            //                 () => { resolve(); },
            //                 () => { frappe.validated = false; reject(); }
            //             );
            //         });
            //         return; // Prevent the default confirmation below from running twice
            //     }
            // }

            // // ==========================================
            // // 0. DRAFT TO CREDIT CHECK VALIDATION
            // // ==========================================
            // // Assuming your workflow action to move from Draft to Credit Check is "Submit Case"
            // if (frm.doc.status === "Draft" && frm.selected_workflow_action === "Submit Case") {
            //     let doc_errors = [];
            //     let has_aadhaar = false;
            //     let has_pan = false;
            //     let has_app_form = false;

            //     // Ensure table has rows
            //     if (!frm.doc.kyc_documents || frm.doc.kyc_documents.length === 0) {
            //         frappe.msgprint({
            //             title: __('Missing Mandatory Documents'),
            //             indicator: 'red',
            //             message: __('You must add Aadhaar Card, PAN Card, and Application Form to the KYC table.')
            //         });
            //         frappe.validated = false;
            //         reject();
            //         return;
            //     }

            //     // Loop through the table to find and validate the required documents
            //     // $.each(frm.doc.kyc_documents, function(index, row) {
            //     //     if (row.document_type === "Aadhaar Card") {
            //     //         has_aadhaar = true;
            //     //         if (!row.document_file || !row.document_number) {
            //     //             doc_errors.push(`<b>Aadhaar Card</b>: Must have both a Document Number and an Attachment.`);
            //     //         }
            //     //     } 
            //     //     else if (row.document_type === "PAN Card") {
            //     //         has_pan = true;
            //     //         if (!row.document_file || !row.document_number) {
            //     //             doc_errors.push(`<b>PAN Card</b>: Must have both a Document Number and an Attachment.`);
            //     //         } else {
            //     //             // Strict 10-character alphanumeric check for PAN (5 Letters, 4 Digits, 1 Letter)
            //     //             let pan_regex = /^[A-Z]{5}\d{4}[A-Z]{1}$/i;
            //     //             if (!pan_regex.test(row.document_number)) {
            //     //                 doc_errors.push(`<b>PAN Card</b>: Document Number is incomplete or invalid. Please enter a full valid PAN (e.g., ABCDE1234F).`);
            //     //             }
            //     //         }
            //     //     } 
            //     //     else if (row.document_type === "Application Form") {
            //     //         has_app_form = true;
            //     //         if (!row.document_file) {
            //     //             doc_errors.push(`<b>Application Form</b>: Must have an Attachment.`);
            //     //         }
            //     //     }
            //     // });

            //                     // Loop through the table to find and validate the required documents
            //     $.each(frm.doc.kyc_documents, function(index, row) {
            //         if (row.document_type === "Aadhaar Card") {
            //             has_aadhaar = true;
            //             if (!row.document_file || !row.document_number) {
            //                 doc_errors.push(`<b>Aadhaar Card</b>: Must have both a Document Number and an Attachment.`);
            //             } else {
            //                 // Strict 12-digit numeric check for Aadhaar
            //                 let aadhaar_regex = /^\d{12}$/;
            //                 if (!aadhaar_regex.test(row.document_number)) {
            //                     doc_errors.push(`<b>Aadhaar Card</b>: Document Number is incomplete. It must be exactly 12 digits.`);
            //                 }
            //             }
            //         } 
            //         else if (row.document_type === "PAN Card") {
            //             has_pan = true;
            //             if (!row.document_file || !row.document_number) {
            //                 doc_errors.push(`<b>PAN Card</b>: Must have both a Document Number and an Attachment.`);
            //             } else {
            //                 // Strict 10-character alphanumeric check for PAN (5 Letters, 4 Digits, 1 Letter)
            //                 let pan_regex = /^[A-Z]{5}\d{4}[A-Z]{1}$/i;
            //                 if (!pan_regex.test(row.document_number)) {
            //                     doc_errors.push(`<b>PAN Card</b>: Document Number is incomplete or invalid. Please enter a full valid PAN (e.g., ABCDE1234F).`);
            //                 }
            //             }
            //         } 
            //         else if (row.document_type === "Application Form") {
            //             has_app_form = true;
            //             if (!row.document_file) {
            //                 doc_errors.push(`<b>Application Form</b>: Must have an Attachment.`);
            //             }
            //         }
            //     });


            //     // Check if any of the required document rows are completely missing from the table
            //     if (!has_aadhaar) doc_errors.push(`<b>Aadhaar Card</b> row is missing from the table.`);
            //     if (!has_pan) doc_errors.push(`<b>PAN Card</b> row is missing from the table.`);
            //     if (!has_app_form) doc_errors.push(`<b>Application Form</b> row is missing from the table.`);

            //     // If any errors exist, block the submission
            //     if (doc_errors.length > 0) {
            //         frappe.msgprint({
            //             title: __('Cannot Submit Case'),
            //             indicator: 'red',
            //             message: __('Please resolve the following issues before submitting:<br><br><ul style="margin-bottom: 0;"><li>' + doc_errors.join('</li><li>') + '</li></ul>')
            //         });
                    
            //         frappe.validated = false;
            //         reject(); 
            //         return;
            //     }
            // }


                        // ==========================================
            // 0. DRAFT TO CREDIT CHECK VALIDATION
            // ==========================================
            if (frm.doc.status === "Draft" && frm.selected_workflow_action === "Submit Case") {
                let doc_errors = [];
                let has_aadhaar = false;
                let has_pan = false;
                let has_app_form = false;
                let has_signature = false;

                // Ensure table has rows
                if (!frm.doc.kyc_documents || frm.doc.kyc_documents.length === 0) {
                    frappe.msgprint({
                        title: __('Missing Mandatory Documents'),
                        indicator: 'red',
                        message: __('You must add Aadhaar Card, PAN Card, Application Form, and Customer Signature to the KYC table.')
                    });
                    frappe.validated = false;
                    reject();
                    return;
                }

                // Loop through the table to find and validate the required documents
                $.each(frm.doc.kyc_documents, function(index, row) {
                    if (row.document_type === "Aadhaar Card") {
                        has_aadhaar = true;
                        if (!row.document_file || !row.document_number) {
                            doc_errors.push(`<b>Aadhaar Card</b>: Must have both a Document Number and an Attachment.`);
                        } else {
                            // Strict 12-digit numeric check for Aadhaar
                            let aadhaar_regex = /^\d{12}$/;
                            if (!aadhaar_regex.test(row.document_number)) {
                                doc_errors.push(`<b>Aadhaar Card</b>: Document Number is incomplete. It must be exactly 12 digits.`);
                            }
                        }
                    } 
                    else if (row.document_type === "PAN Card") {
                        has_pan = true;
                        if (!row.document_file || !row.document_number) {
                            doc_errors.push(`<b>PAN Card</b>: Must have both a Document Number and an Attachment.`);
                        } else {
                            // Strict 10-character alphanumeric check for PAN
                            let pan_regex = /^[A-Z]{5}\d{4}[A-Z]{1}$/i;
                            if (!pan_regex.test(row.document_number)) {
                                doc_errors.push(`<b>PAN Card</b>: Document Number is incomplete or invalid. Please enter a full valid PAN (e.g., ABCDE1234F).`);
                            }
                        }
                    } 
                    else if (row.document_type === "Application Form") {
                        has_app_form = true;
                        if (!row.document_file) {
                            doc_errors.push(`<b>Application Form</b>: Must have an Attachment.`);
                        }
                    }
                    else if (row.document_type === "Customer Signature") {
                        has_signature = true;
                        if (!row.document_file) {
                            doc_errors.push(`<b>Customer Signature</b>: Must have an Attachment.`);
                        }
                    }
                });

                // Check if any of the required document rows are completely missing from the table
                if (!has_aadhaar) doc_errors.push(`<b>Aadhaar Card</b> row is missing from the table.`);
                if (!has_pan) doc_errors.push(`<b>PAN Card</b> row is missing from the table.`);
                if (!has_app_form) doc_errors.push(`<b>Application Form</b> row is missing from the table.`);
                if (!has_signature) doc_errors.push(`<b>Customer Signature</b> row is missing from the table.`);

                // If any errors exist, block the submission
                if (doc_errors.length > 0) {
                    frappe.msgprint({
                        title: __('Cannot Submit Case'),
                        indicator: 'red',
                        message: __('Please resolve the following issues before submitting:<br><br><ul style="margin-bottom: 0;"><li>' + doc_errors.join('</li><li>') + '</li></ul>')
                    });
                    
                    frappe.validated = false;
                    reject(); 
                    return;
                }
            }


            // // ==========================================
            // // 1.5 VALUATION PENDING TO CREDIT DECISION VALIDATION
            // // ==========================================
            // // Assuming your workflow action to move from Valuation Pending to Credit Decision is "Submit Post Valuation"
            // if (frm.doc.status === "Valuation Pending" && frm.selected_workflow_action === "Submit Post Valuation") {
                
            //     // Find the specific row for Account Open Form
            //     let acc_open_row = (frm.doc.kyc_documents || []).find(d => d.document_type === "Account Open Form");

            //     if (!acc_open_row) {
            //         frappe.msgprint({
            //             title: __('Missing Document Row'),
            //             indicator: 'red',
            //             message: __('The <b>Account Open Form</b> row is completely missing from the KYC table.')
            //         });
            //         frappe.validated = false;
            //         reject();
            //         return;
            //     }

            //     // Check if the attachment actually exists
            //     if (!acc_open_row.document_file) {
            //         frappe.msgprint({
            //             title: __('Missing Attachment'),
            //             indicator: 'red',
            //             message: __('You must upload the file attachment for the <b>Account Open Form</b> before proceeding.')
            //         });
            //         frappe.validated = false;
            //         reject();
            //         return;
            //     }
            // }

            // ==========================================
            // VALUATION PENDING TO CREDIT DECISION VALIDATION
            // ==========================================
            // Replace "Submit Post Valuation" with the EXACT name of your workflow action button
            // if (frm.doc.status === "Valuation Pending" && frm.selected_workflow_action === "Submit Post Valuation") {
                
            //     let acc_open_row = (frm.doc.kyc_documents || []).find(d => d.document_type === "Account Open Form");

            //     if (!acc_open_row) {
            //         frappe.msgprint({
            //             title: __('Missing Document Row'),
            //             indicator: 'red',
            //             message: __('The <b>Account Open Form</b> row is missing from the KYC table.')
            //         });
            //         frappe.validated = false;
            //         reject();
            //         return;
            //     }

            //     if (!acc_open_row.document_file) {
            //         frappe.msgprint({
            //             title: __('Missing Attachment'),
            //             indicator: 'red',
            //             message: __('You must upload the file attachment for the <b>Account Open Form</b> before submitting.')
            //         });
            //         frappe.validated = false;
            //         reject();
            //         return;
            //     }
            // }

            if (frm.doc.status === "Valuation Pending" && frm.selected_workflow_action === "Submit Post Valuation") {
                
                let required_docs = ["Account Open Form", "Valuation Report Image", "Ornament Image"];
                let val_errors = [];

                // Loop through the required documents list
                required_docs.forEach(doc_type => {
                    let row = (frm.doc.kyc_documents || []).find(d => d.document_type === doc_type);

                    if (!row) {
                        val_errors.push(`<b>${doc_type}</b> row is missing from the KYC table.`);
                    } else if (!row.document_file) {
                        val_errors.push(`Missing file attachment for <b>${doc_type}</b>.`);
                    }
                });

                // If any of the 3 documents are missing or lack attachments, block the action
                if (val_errors.length > 0) {
                    frappe.msgprint({
                        title: __('Missing Required Documents'),
                        indicator: 'red',
                        message: __('Please resolve the following before submitting:<br><br><ul style="margin-bottom: 0;"><li>' + val_errors.join('</li><li>') + '</li></ul>')
                    });
                    
                    frappe.validated = false;
                    reject();
                    return;
                }
            }







            // // Existing Workflow Confirmation
            // frappe.confirm(`Are you sure you want to proceed with ${frm.selected_workflow_action}?`,
            //     () => { resolve(); },
            //     () => { frappe.validated = false; reject(); }
            // );


    //     });
    // },

                         // ==========================================
            // FINAL WORKFLOW CONFIRMATION & DB AUTO-STAMPING
            // ==========================================
            frappe.confirm(`Are you sure you want to proceed with ${frm.selected_workflow_action}?`,
                () => { 
                    // If we are Approving in either of these states, trigger the DB stamp
                    if (frm.selected_workflow_action === "Approve" && 
                       (frm.doc.status === "Credit Decision" || frm.doc.status === "CPC Processing")) {
                        
                        frappe.call({
                            doc: frm.doc,
                            method: "stamp_sanctioned_user",
                            args: {
                                status: frm.doc.status
                            },
                            callback: function(r) {
                                // Once the DB successfully saves the user ID, allow the workflow to finish
                                resolve();
                            }
                        });
                    } else {
                        // If it's not an Approval step, just proceed normally
                        resolve();
                    }
                },
                () => { 
                    frappe.validated = false; 
                    reject(); 
                }
            );
        });
    },



    after_workflow_action: function (frm) {
        // ==========================================
        // 3. AUTO-ADD CPC DOCUMENTS
        // ==========================================
        if (frm.doc.status === "CPC Processing") {
            let documents_to_add = ["Loan Agreement", "Sanction Letter"];
            let rows_added = false;

            documents_to_add.forEach(doc_type => {
                let exists = (frm.doc.kyc_documents || []).some(row => row.document_type === doc_type);
                
                if (!exists) {
                    let row = frm.add_child("kyc_documents");
                    row.document_type = doc_type;
                    row.status = "Pending"; // Sets initial status
                    rows_added = true;
                }
            });

            if (rows_added) {
                frm.refresh_field("kyc_documents");
                
                // Save automatically so the new rows hit the database
                frm.save().then(() => {
                    frappe.msgprint({
                        title: __('CPC Documents Added'),
                        indicator: 'green',
                        message: __('Loan Agreement and Sanction Letter rows have been automatically added to the documents table.')
                    });
                });
            } else {
                frm.reload_doc();
            }
        } else {
            frm.reload_doc();
        }
      },


    //     after_workflow_action: function (frm) {
    //     let rows_added = false;

    //     // ==========================================
    //     // 3a. AUTO-ADD: VALUATION PENDING
    //     // ==========================================
    //     if (frm.doc.status === "Valuation Pending") {
    //         let doc_type = "Account Open Form";
    //         let exists = (frm.doc.kyc_documents || []).some(row => row.document_type === doc_type);
            
    //         if (!exists) {
    //             let row = frm.add_child("kyc_documents");
    //             row.document_type = doc_type;
    //             row.status = "Pending";
    //             rows_added = true;
                
    //             frappe.msgprint({
    //                 title: __('Document Added'),
    //                 indicator: 'green',
    //                 message: __('<b>Account Open Form</b> row has been automatically added.')
    //             });
    //         }
    //     }

    //     // ==========================================
    //     // 3b. AUTO-ADD: CPC PROCESSING
    //     // ==========================================
    //     if (frm.doc.status === "CPC Processing") {
    //         let documents_to_add = ["Loan Agreement", "Sanction Letter"];

    //         documents_to_add.forEach(doc_type => {
    //             let exists = (frm.doc.kyc_documents || []).some(row => row.document_type === doc_type);
                
    //             if (!exists) {
    //                 let row = frm.add_child("kyc_documents");
    //                 row.document_type = doc_type;
    //                 row.status = "Pending"; 
    //                 rows_added = true;
    //             }
    //         });

    //         if (rows_added) {
    //             frappe.msgprint({
    //                 title: __('CPC Documents Added'),
    //                 indicator: 'green',
    //                 message: __('Loan Agreement and Sanction Letter rows have been automatically added.')
    //             });
    //         }
    //     }

    //     // If we added any rows in either state, refresh and save immediately
    //     if (rows_added) {
    //         frm.refresh_field("kyc_documents");
    //         frm.save();
    //     } else {
    //         frm.reload_doc();
    //     }
    // },



  refresh: function (frm) {
    frm.trigger("apply_branch_user_rules");

    if (!frm.custom_home_button_added) {
      frm.add_custom_button(__("Home"), function () {
        frappe.set_route("/app/loan-management");
      });
      frm.custom_home_button_added = true;
    }

    // Lock form read-only if current user is previous generator/owner and case is re-assigned to someone else
    if (!frm.is_new() && frm.doc.lead_converter) {
      frappe.db.get_value("Employee", { user_id: frappe.session.user }, "name", (r) => {
        if (r && r.name && frm.doc.lead_converter !== r.name) {
          const admin_roles = ["Administrator", "Credit Loan User", "System Manager"];
          if (!frappe.user_roles.some(role => admin_roles.includes(role))) {
            frm.disable_form();
            frm.page.clear_actions();
          }
        }
      });
    }

    // ==========================================
    // CUSTOM BUTTONS: UPDATE BRANCH & ASSIGN CASE (For Admin & Credit Loan User)
    // ==========================================
    const allowed_roles = ["Administrator", "Credit Loan User", "System Manager"];
    if (!frm.is_new() && frappe.user_roles.some(role => allowed_roles.includes(role))) {

      // 1. UPDATE BRANCH BUTTON
      frm.add_custom_button(__("Update Branch"), function () {
        let d = new frappe.ui.Dialog({
          title: __('Update Branch'),
          fields: [
            {
              label: __('Select Branch'),
              fieldname: 'branch_code',
              fieldtype: 'Link',
              options: 'Sahayog Branch',
              default: frm.doc.branch_code,
              reqd: 1
            }
          ],
          primary_action_label: __('Update'),
          primary_action(values) {
            if (values.branch_code === frm.doc.branch_code) {
              frappe.msgprint(__('Selected branch is already assigned.'));
              d.hide();
              return;
            }
            frappe.call({
              method: 'frappe.client.set_value',
              args: {
                doctype: frm.doc.doctype,
                name: frm.doc.name,
                fieldname: 'branch_code',
                value: values.branch_code
              },
              freeze: true,
              freeze_message: __('Updating Branch...'),
              callback: function (r) {
                if (!r.exc) {
                  frappe.show_alert({ message: __('Branch updated successfully'), indicator: 'green' });
                  d.hide();
                  frm.reload_doc();
                }
              }
            });
          }
        });
        d.show();
      }, __("Update Loan Case"));

      // 2. ASSIGN CASE BUTTON (Re-assign User, Update Branch & LC)
      frm.add_custom_button(__("Assign Case"), function () {
        let d = new frappe.ui.Dialog({
          title: __('Assign Case to User'),
          fields: [
            {
              label: __('Select Employee (New Assignee)'),
              fieldname: 'assigned_employee',
              fieldtype: 'Link',
              options: 'Employee',
              reqd: 1,
              onchange() {
                let emp = d.get_value('assigned_employee');
                if (emp) {
                  frappe.db.get_value('Employee', emp, 'sol_id', (r) => {
                    if (r && r.sol_id) {
                      d.set_value('branch_code', r.sol_id);
                    }
                  });
                }
              }
            },
            {
              label: __('Branch Code'),
              fieldname: 'branch_code',
              fieldtype: 'Link',
              options: 'Sahayog Branch',
              default: frm.doc.branch_code,
              reqd: 1
            }
          ],
          primary_action_label: __('Assign'),
          primary_action(values) {
            frappe.call({
              method: 'frappe.client.set_value',
              args: {
                doctype: frm.doc.doctype,
                name: frm.doc.name,
                fieldname: {
                  'lead_converter': values.assigned_employee,
                  'branch_code': values.branch_code
                }
              },
              freeze: true,
              freeze_message: __('Assigning Case & Granting Access...'),
              callback: function (r) {
                if (!r.exc) {
                  // Fetch user_id for the assigned employee and grant DocShare access
                  frappe.db.get_value('Employee', values.assigned_employee, 'user_id', (res) => {
                    if (res && res.user_id) {
                      // First grant access to the new assigned user
                      frappe.call({
                        method: 'frappe.share.add',
                        args: {
                          doctype: frm.doc.doctype,
                          name: frm.doc.name,
                          user: res.user_id,
                          read: 1,
                          write: 1,
                          submit: 1,
                          share: 1
                        },
                        callback: function() {
                          // Next, revoke access from original owner/generator if different from new assignee
                          if (frm.doc.owner && frm.doc.owner !== res.user_id) {
                            frappe.call({
                              method: 'frappe.share.remove',
                              args: {
                                doctype: frm.doc.doctype,
                                name: frm.doc.name,
                                user: frm.doc.owner
                              }
                            });
                          }
                          frappe.show_alert({ message: __('Case assigned and shared successfully!'), indicator: 'green' });
                          d.hide();
                          frm.reload_doc();
                        }
                      });
                    } else {
                      frappe.show_alert({ message: __('Case assigned successfully!'), indicator: 'green' });
                      d.hide();
                      frm.reload_doc();
                    }
                  });
                }
              }
            });
          }
        });
        d.show();
      }, __("Update Loan Case"));
    }


    // ==========================================
    // AUTO-ADD: ACCOUNT OPEN FORM
    // ==========================================
    // If we are in Valuation Pending, ensure the Account Open Form exists
    if (frm.doc.status === "Valuation Pending") {
      let doc_type = "Account Open Form";
      let exists = (frm.doc.kyc_documents || []).some(row => row.document_type === doc_type);
      
      if (!exists) {
          let row = frm.add_child("kyc_documents");
          row.document_type = doc_type;
          row.status = "Pending";
          
          frm.refresh_field("kyc_documents");
          
          frappe.msgprint({
              title: __('Document Required'),
              indicator: 'blue',
              message: __('An <b>Account Open Form</b> row has been added. Please attach the document before proceeding.')
          });
          
          // Optionally auto-save so it persists even if they leave the page
          frm.save(); 
      }
    }

    // 1. Workflow Logic (Handled by Frappe Workflow)
    frm.trigger("render_workflow_tracker");
    frm.trigger("set_status_indicator");
    frm.trigger("render_kyc_footer");

    // Mobile Number Restriction - Only Numbers (10 digits)
    if (frm.fields_dict.mobile_number && frm.fields_dict.mobile_number.$input) {
      let mobile_input = frm.fields_dict.mobile_number.$input;

      mobile_input.off("keypress paste");

      mobile_input.on("keypress", function (e) {
        // Only allow numbers (48-57 are keycodes for 0-9)
        if (e.which < 48 || e.which > 57) {
          e.preventDefault();
          return false;
        }

        // Limit to 10 digits
        if ($(this).val().length >= 10) {
          e.preventDefault();
          return false;
        }
      });

      mobile_input.on("paste", function () {
        setTimeout(() => {
          let value = $(this).val().replace(/\D/g, "").slice(0, 10);
          $(this).val(value);
          frm.set_value("mobile_number", value);
        }, 100);
      });
    }

    // 4. KYC Table Real-time Validation (Stop Infinite Inputting)
    if (frm.fields_dict.kyc_documents && frm.fields_dict.kyc_documents.grid) {
      $(frm.fields_dict.kyc_documents.grid.wrapper).on(
        "keypress",
        'input[data-fieldname="document_number"]',
        function (e) {
          let grid_row = $(this).closest(".grid-row");
          let row_id = grid_row.attr("data-name");
          let row = frappe.get_doc("Loan Document", row_id);
          let val = $(this).val();

          if (row && row.document_type === "Aadhaar Card") {
            // Aadhaar: 12 digits numeric
            if (e.which < 48 || e.which > 57 || val.length >= 12) {
              e.preventDefault();
              return false;
            }
          } else if (row && row.document_type === "PAN Card") {
            // PAN: 10 chars, strict alphanumeric
            if (val.length >= 10) {
              e.preventDefault();
              return false;
            }
            let char = String.fromCharCode(e.which).toUpperCase();
            let i = val.length;
            // Format: LLLLL NNNN L
            if (i < 5 || i === 9) {
              // 0-4 and 9 are Letters
              if (!/[A-Z]/.test(char)) {
                e.preventDefault();
                return false;
              }
            } else if (i >= 5 && i <= 8) {
              // 5-8 are Digits
              if (!/\d/.test(char)) {
                e.preventDefault();
                return false;
              }
            }
          }
        },
      );

      // Handle Paste for KYC (Auto-trim)
      $(frm.fields_dict.kyc_documents.grid.wrapper).on(
        "paste",
        'input[data-fieldname="document_number"]',
        function () {
          let $input = $(this);
          let grid_row = $input.closest(".grid-row");
          let row_id = grid_row.attr("data-name");
          let row = frappe.get_doc("Loan Document", row_id);

          setTimeout(() => {
            let val = $input.val().toUpperCase();
            if (row && row.document_type === "Aadhaar Card") {
              $input.val(val.replace(/\D/g, "").slice(0, 12));
            } else if (row && row.document_type === "PAN Card") {
              $input.val(val.slice(0, 10));
            }
            $input.trigger("change");
          }, 100);
        }
      );
    }
    // 5. Restrict Date of Birth to a range (e.g., 18 to 100 years ago)
    let today = frappe.datetime.get_today();
    let max_dob = frappe.datetime.add_months(today, -18 * 12);
    let min_dob = frappe.datetime.add_months(today, -100 * 12);
    
    frm.set_df_property("date_of_birth", "options", {
      max_date: max_dob,
      min_date: min_dob,
    });

        // --- NEW: Status Field Permissions ---
    // Only 'Administrator' OR 'CPC Loan User' can edit the 'status' field
    let is_admin = frappe.session.user === 'Administrator';
    let is_cpc_user = frappe.user.has_role('CPC Loan User');
    let is_credit_user = frappe.user.has_role('Credit Loan User');
    
    if (!is_admin && !is_cpc_user && !is_credit_user) {
        frm.set_df_property('kyc_documents', 'reqd', 0); 
        
        // Lock the field on the form for unauthorized users
        $.each(frm.doc.kyc_documents || [], function(i, d) {
            frm.fields_dict.kyc_documents.grid.update_docfield_property('status', 'read_only', 1);
        });
    } else {
         // Ensure it remains editable for authorized users
        $.each(frm.doc.kyc_documents || [], function(i, d) {
            frm.fields_dict.kyc_documents.grid.update_docfield_property('status', 'read_only', 0);
        });
    }
    // --- END NEW STATUS PERMISSIONS ---

  },

  onload: function (frm) {
    frm.trigger("apply_branch_user_rules");
// ==========================================
    // FORCE PUBLIC FILES & HIDE VUE UPLOADER UI
    // ==========================================
    if (!frappe.ui.OriginalFileUploader) {
        frappe.ui.OriginalFileUploader = frappe.ui.FileUploader;
    }

    frappe.ui.FileUploader = class CustomFileUploader extends frappe.ui.OriginalFileUploader {
        constructor(opts) {
            // Only apply these strict rules if we are on the Loan Application form
            let is_loan_app = frappe.get_route()[0] === 'Form' && frappe.get_route()[1] === 'Loan Application';

            // 1. Force the backend to save as Public
            if (is_loan_app && opts) {
                opts.make_attachments_public = true;
                opts.is_private = 0;
            }
            
            super(opts);
            
            // 2. Aggressively hide the Private UI elements using an interval to beat Vue's re-rendering
            if (is_loan_app) {
                let hide_ui_interval = setInterval(() => {
                    if (this.dialog && this.dialog.$wrapper) {
                        let $wrapper = this.dialog.$wrapper;

                        // A. Hide the "Set all private" footer button
                        $wrapper.find('.btn-modal-secondary').each(function() {
                            if ($(this).text().toLowerCase().includes('private')) {
                                $(this).hide();
                            }
                        });

                        // B. Hide the "Private" checkbox and ensure it stays unchecked
                        $wrapper.find('label.frappe-checkbox').each(function() {
                            if ($(this).text().trim().toLowerCase() === 'private') {
                                let $input = $(this).find('input');
                                if ($input.length && $input.is(':checked')) {
                                    $input.prop('checked', false);
                                    // Trigger Vue's native event to register the uncheck
                                    $input[0].dispatchEvent(new Event('change'));
                                }
                                $(this).hide(); // Hide the label completely
                            }
                        });

                        // C. Hide the yellow warning alert ("This file is public...")
                        $wrapper.find('.alert-warning').each(function() {
                            if ($(this).text().toLowerCase().includes('public')) {
                                $(this).hide();
                            }
                        });
                    }
                }, 100); // Scans every 100ms while the modal is open

                // 3. Clean up the interval when the modal is closed so we don't leak memory
                if (this.dialog) {
                    let original_onhide = this.dialog.onhide;
                    this.dialog.onhide = () => {
                        clearInterval(hide_ui_interval);
                        if (original_onhide) original_onhide();
                    };
                }
            }
        }
    };
    // ==========================================

    // Pre-populate KYC Documents for new applications
    if (frm.is_new() && (!frm.doc.kyc_documents || frm.doc.kyc_documents.length === 0)) {
      const default_docs = ["Aadhaar Card", "PAN Card", "Application Form", "Customer Signature"];
      default_docs.forEach((doc_type) => {
        let row = frm.add_child("kyc_documents");
        row.document_type = doc_type;
        row.status = "Pending";
      });
      frm.refresh_field("kyc_documents");
    }
  },

  apply_branch_user_rules: function (frm) {
    const is_branch_loan_user = frappe.user.has_role("Branch Loan User");

    frm.set_df_property("branch_code", "read_only", is_branch_loan_user ? 1 : 0);

    if (!is_branch_loan_user || !frm.is_new() || frm.doc.branch_code) {
      return;
    }

    frappe.call({
      method: "sahayog.loan.doctype.loan_application.loan_application.get_current_user_branch_code",
      callback: function (r) {
        if (r.message && !frm.doc.branch_code) {
          frm.set_value("branch_code", r.message);
        }
      },
    });
  },

  render_workflow_tracker: function (frm) {
    frm.set_intro(null); // Clear previous tracker to prevent duplicates
    const states = [
      { label: "Branch", sub: "Draft", status: "Draft", role: "Branch User" },
      { label: "Credit", sub: "Check", status: "Credit Check", role: "Credit User" },
      { label: "Branch", sub: "Valuation", status: "Valuation Pending", role: "Branch User" },
      { label: "Credit", sub: "Decision", status: "Credit Decision", role: "Credit User" },
      { label: "CPC", sub: "Processing", status: "CPC Processing", role: "CPC User" },
      { label: "Final", sub: "Outcome", status: ["Approved", "Rejected"], role: "" },
    ];

    let current_status = frm.doc.status;
    let current_index = states.findIndex((s) =>
      Array.isArray(s.status)
        ? s.status.includes(current_status)
        : s.status === current_status,
    );

    // Get current pending role
    let pending_role = states[current_index]?.role || "";
    let is_final = ["Approved", "Rejected"].includes(current_status);

    let tracker_html = `
      <div class="workflow-tracker-wrapper" style="margin-bottom: 15px;">
        <div class="workflow-tracker-container" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 10px; background: #fff; border-radius: 12px; border: 1px solid #d1d8dd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          ${states
            .map((state, index) => {
              let is_completed = index < current_index;
              let is_active = index === current_index;
              
              let color = "#6c757d"; // Default Gray
              let circle_bg = "#fff";
              let circle_border = "#d1d8dd";
              let text_weight = is_active ? "bold" : "normal";

              if (is_completed) {
                color = "#28a745"; // Green for completed
                circle_bg = "#28a745";
                circle_border = "#28a745";
              } else if (is_active) {
                color = "var(--blue-500)"; // Blue for active
                circle_bg = "var(--blue-500)";
                circle_border = "var(--blue-500)";
              }

              // Special handling for Rejected state
              if (current_status === "Rejected" && index === states.length - 1) {
                color = circle_bg = circle_border = "#dc3545";
              }

              return `
              <div class="tracker-step" style="flex: 1; text-align: center; position: relative; min-width: 80px;">
                <div class="step-circle" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${circle_border}; background: ${circle_bg}; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; color: ${is_active || is_completed ? "#fff" : "#adb5bd"}; font-size: 13px; font-weight: bold; z-index: 2; position: relative; transition: all 0.3s ease;">
                  ${is_completed ? "✓" : index + 1}
                </div>
                <div class="step-labels" style="line-height: 1.2;">
                  <div class="main-label" style="font-size: 12px; font-weight: ${text_weight}; color: ${is_active || is_completed ? "#212529" : "#868e96"};">${state.label}</div>
                  <div class="sub-label" style="font-size: 10px; color: ${is_active ? color : "#adb5bd"}; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">${state.sub}</div>
                </div>
                ${
                  index < states.length - 1
                    ? `<div class="step-line" style="position: absolute; top: 14px; left: 50%; width: 100%; height: 2px; background: ${is_completed ? "#28a745" : "#e9ecef"}; z-index: 1;"></div>`
                    : ""
                }
              </div>
            `;
            })
            .join("")}
        </div>
        
        ${!is_final ? `
          <div class="pending-status-bar" style="margin-top: 10px; padding: 8px 15px; background: ${current_status.includes('Reject') ? '#fff5f5' : '#e7f5ff'}; border-radius: 6px; display: flex; align-items: center; border-left: 4px solid ${current_status.includes('Reject') ? '#ff6b6b' : '#339af0'};">
            <span style="font-size: 12px; color: #495057;">
              <i class="fa fa-clock-o" style="margin-right: 5px;"></i> 
              Current Status: <b>${current_status}</b> 
              ${pending_role ? ` | <i class="fa fa-user" style="margin-left: 10px; margin-right: 5px;"></i> Pending Action By: <span class="label label-primary" style="background: ${current_status.includes('Reject') ? '#ff6b6b' : '#339af0'}; padding: 2px 8px; border-radius: 4px; color: #fff; font-size: 10px;">${pending_role}</span>` : ''}
            </span>
          </div>
        ` : `
          <div class="final-status-bar" style="margin-top: 10px; padding: 10px 15px; background: ${current_status === 'Approved' ? '#ebfbee' : '#fff5f5'}; border-radius: 6px; text-align: center; border: 1px dashed ${current_status === 'Approved' ? '#40c057' : '#ff6b6b'};">
            <span style="font-size: 13px; font-weight: bold; color: ${current_status === 'Approved' ? '#2f9e44' : '#e03131'};">
              <i class="fa ${current_status === 'Approved' ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
              Application ${current_status}
            </span>
          </div>
        `}

        ${(() => {
            const attached_docs = (frm.doc.kyc_documents || []).filter(d => d.document_file);
            if (attached_docs.length === 0) return "";
            
            return `
              <div class="kyc-preview-intro" style="margin-top: 10px; padding: 10px; background: #fff; border: 1px solid #d1d8dd; border-radius: 8px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 8px; color: #525252; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fa fa-paperclip" style="color: var(--blue-500);"></i> Attachments Preview
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${attached_docs.map(d => `
                        <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 4px 10px; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 11px; font-weight: 600; color: #333;">
                                ${d.document_type} 
                                <span style="color: ${d.status === 'Verified' ? '#28a745' : d.status === 'Rejected' ? '#dc3545' : '#f39c12'};">
                                    (${d.status || 'Pending'})
                                </span>
                            </span>
                            <a href="${d.document_file}" target="_blank" class="btn btn-xs btn-default" style="padding: 1px 6px; font-size: 10px; height: 18px; line-height: 14px; color: var(--blue-500); border-color: #d1d8dd; background: #fff;">
                                <i class="fa fa-eye"></i> View
                            </a>
                        </div>
                    `).join('')}
                </div>
              </div>
            `;
        })()}
      </div>
    `;

    frm.set_intro(tracker_html);
  },

  set_status_indicator: function (frm) {
    const status_colors = {
      Draft: "gray",
      "Credit Check": "orange",
      "Valuation Pending": "blue",
      "Credit Decision": "cyan",
      "CPC Processing": "yellow",
      Approved: "green",
      Rejected: "red",
    };
    if (status_colors[frm.doc.status]) {
      frm.page.set_indicator(frm.doc.status, status_colors[frm.doc.status]);
    }
  },

  render_kyc_footer: function (frm) {
    if (!frm.doc.kyc_documents || frm.doc.kyc_documents.length === 0) {
      $(frm.wrapper).find(".kyc-footer-summary").remove();
      return;
    }

    const attached_docs = frm.doc.kyc_documents.filter((d) => d.document_file);
    if (attached_docs.length === 0) {
      $(frm.wrapper).find(".kyc-footer-summary").remove();
      return;
    }

    let html = `
      <div class="kyc-footer-summary" style="padding: 20px; border-top: 1px solid #d1d8dd; margin-top: 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
        <div style="font-weight: bold; margin-bottom: 15px; color: #525252; font-size: 14px; display: flex; align-items: center;">
          <i class="fa fa-file-text-o" style="margin-right: 8px; color: var(--blue-500);"></i> KYC Document Preview
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          ${attached_docs
            .map(
              (d) => `
              <div style="flex: 0 0 calc(25% - 12px); min-width: 180px; background: #fff; border: 1px solid #d1d8dd; border-radius: 6px; padding: 10px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: transform 0.2s;">
                <div style="overflow: hidden; margin-right: 8px;">
                  <div style="font-size: 11px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.document_type}">${d.document_type}</div>
                  <div style="font-size: 10px; color: #888;">${d.document_number || "-"}</div>
                </div>
                <a href="${d.document_file}" target="_blank" class="btn btn-xs btn-default" style="padding: 2px 6px; font-size: 10px; color: var(--blue-500); border-color: #d1d8dd;">
                  <i class="fa fa-eye"></i> View
                </a>
              </div>
            `,
            )
            .join("")}
        </div>
      </div>
    `;

    // Target the absolute bottom of the form
    $(frm.wrapper).find(".kyc-footer-summary").remove();
    const $form_body = $(frm.wrapper).find(".form-body");
    $form_body.append(html);
  },

  // customer name auto-capitalization
  customer_name: function (frm) {
    if (frm.doc.customer_name) {
      let capitalized = frm.doc.customer_name
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");

      if (frm.doc.customer_name !== capitalized) {
        frm.set_value("customer_name", capitalized);
      }
    }
  },

  loan_type: function (frm) {
    frm.trigger("recalculate_all");
  },


  cibil_score: function(frm) {
    if (frm.doc.cibil_score) {
        // A valid CIBIL score must be between 300 and 900
        // Exception: Allow exactly 0 or -1 as these are sometimes used by bureaus to indicate "No Credit History"
        if (frm.doc.cibil_score !== 0 && frm.doc.cibil_score !== -1 && (frm.doc.cibil_score < 300 || frm.doc.cibil_score > 900)) {
            frappe.msgprint({
                title: __('Invalid CIBIL Score'),
                indicator: 'orange',
                message: __('CIBIL Score must be between <b>300 and 900</b>.')
            });
            // Automatically clear the invalid value
            frm.set_value('cibil_score', '');
        } else {
            // If it's valid, trigger the recalculate function to update the risk score immediately
            frm.trigger('recalculate_all'); 
        }
    }
},


  loan_amount: function (frm) {
    frm.trigger("recalculate_all");
  },
  gold_rate_per_gram: function (frm) {
    frm.trigger("recalculate_all");
  },

  date_of_birth: function (frm) {
    if (frm.doc.date_of_birth) {
      let today = frappe.datetime.get_today();
      let dob = frm.doc.date_of_birth;

      if (dob > today) {
        frappe.msgprint(__("Date of Birth cannot be in the future."));
        frm.set_value("date_of_birth", "");
        return;
      }

      let age = frappe.datetime.get_diff(today, dob) / 365.25;
      if (age < 18) {
        frappe.msgprint({
          title: __("Invalid Age"),
          indicator: "red",
          message: __("Applicant must be at least 18 years old. Selection cleared."),
        });
        frm.set_value("date_of_birth", "");
        return;
      }

      if (frm.doc.loan_type) {
        frappe.db.get_value("Loan Type", frm.doc.loan_type, "max_age_at_maturity", (r) => {
          let max_age = r.max_age_at_maturity || 60;
          let tenure_years = (flt(frm.doc.tenure_months) || 0) / 12;
          if (age + tenure_years > max_age) {
            frappe.msgprint({
              title: __("Age Limit Warning"),
              indicator: "orange",
              message: __("Applicant age ({0}) + Tenure ({1} yrs) exceeds Max Age at Maturity ({2}) for this product.", [
                Math.floor(age),
                tenure_years.toFixed(1),
                max_age
              ]),
            });
          }
        });
      }
    }
  },

  tenure_months: function (frm) {
    frm.trigger("recalculate_all");
  },
  processing_fee: function (frm) {
    frm.trigger("recalculate_all");
  },
  valuation_charges: function (frm) {
    frm.trigger("recalculate_all");
  },
  stamp_duty: function (frm) {
    frm.trigger("recalculate_all");
  },

  recalculate_all: function (frm) {
    let t_gw = 0,
      t_ded = 0,
      t_nw = 0,
      t_val = 0;

    // Ornament Logic
    (frm.doc.ornaments_list || []).forEach((d) => {
      let rate = flt(d.valuation_rate_per_gram); 

      d.net_weight = flt(d.gross_weight) - flt(d.deduction);
      d.valuation = d.net_weight * rate;

      t_gw += flt(d.gross_weight);
      t_ded += flt(d.deduction);
      t_nw += d.net_weight;
      t_val += d.valuation;
    });

    frm.set_value("total_gross_weight", t_gw);
    frm.set_value("total_deduction", t_ded);
    frm.set_value("total_net_weight", t_nw);
    frm.set_value("total_valuation", t_val);
    frm.refresh_field("ornaments_list");
  },

  validate: function (frm) {
    // Skip validations if in Draft state
    if (frm.doc.status === "Draft") return;

    // Credit Decision specific logic
    if (frm.doc.status === "Credit Decision" && frm.doc.security_type === "Gold") {
      // 1. Ensure Ornaments List is not empty
      if (!frm.doc.ornaments_list || frm.doc.ornaments_list.length === 0) {
        frappe.throw(__("Ornaments List is mandatory when status is Credit Decision."));
      }

      // 3. Ensure Disclaimer is checked
      if (!frm.doc.disclaimer) {
        frappe.throw(__("The Member Declaration checkbox is mandatory when status is Credit Decision."));
      }

      // 3. Ensure Ornament Image exists in KYC Documents
      let has_ornament_image = (frm.doc.kyc_documents || []).some(
        (d) => d.document_type === "Ornament Image"
      );
      if (!has_ornament_image) {
        let row = frm.add_child("kyc_documents");
        row.document_type = "Ornament Image";
        row.status = "Pending";
        frm.refresh_field("kyc_documents");
        frappe.msgprint(__("Added 'Ornament Image' row to KYC Documents."));
      }
    }

    if (frm.doc.customer_name && /[^a-zA-Z\s]/.test(frm.doc.customer_name)) {
      frappe.throw(
        __("Customer Name should only contain alphabets and spaces."),
      );
    }
    if (frm.doc.mobile_number && !/^\d{10}$/.test(frm.doc.mobile_number)) {
      frappe.throw(__("Mobile Number must be exactly 10 digits."));
    }
  },
});

// Child Table Triggers
frappe.ui.form.on("Loan Ornament", {
  gross_weight: function (frm) {
    frm.trigger("recalculate_all");
  },
  deduction: function (frm) {
    frm.trigger("recalculate_all");
  },
  valuation_rate_per_gram: function (frm) {
    frm.trigger("recalculate_all");
  },
  ornaments_list_remove: function (frm) {
    frm.trigger("recalculate_all");
  },
});

// KYC Standardized Input
frappe.ui.form.on("Loan Document", {
  // --- NEW: Auto-stamp user when status changes ---
  status: function(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    
    if (row.status === "Verified" || row.status === "Rejected") {
        // Set the logged-in user's email/ID
        frappe.model.set_value(cdt, cdn, "verified_by", frappe.session.user);
        
        // Optional: Also set the verification date to today (if you want to automate your 'verification_date' column)
        frappe.model.set_value(cdt, cdn, "verification_date", frappe.datetime.get_today());
    } else {
        // If they change it back to Pending or Rejected, clear the user stamp
        frappe.model.set_value(cdt, cdn, "verified_by", "");
        frappe.model.set_value(cdt, cdn, "verification_date", "");
    }
  },


  document_number: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let val = row.document_number || "";

    if (row.document_type === "Aadhaar Card") {
      // Allow only numbers and max 12 digits
      let filtered = val.replace(/\D/g, "").slice(0, 12);
      if (val !== filtered) {
        frappe.model.set_value(cdt, cdn, "document_number", filtered);
      }
    } else if (row.document_type === "PAN Card") {
      // Auto-capitalize and limit to 10 characters
      let filtered = val.toUpperCase().slice(0, 10);

      // Basic formatting as user types:
      // 1-5: Letters, 6-9: Digits, 10: Letter
      let correct = "";
      for (let i = 0; i < filtered.length; i++) {
        let char = filtered[i];
        if (i < 5) {
          // First 5 should be letters
          if (/[A-Z]/.test(char)) correct += char;
        } else if (i < 9) {
          // Next 4 should be digits
          if (/\d/.test(char)) correct += char;
        } else {
          // Last 1 should be letter
          if (/[A-Z]/.test(char)) correct += char;
        }
      }

      if (val !== correct) {
        frappe.model.set_value(cdt, cdn, "document_number", correct);
      }
    }
  },
});

frappe.ui.form.on("Loan Ornament", {
  purity: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (!row.purity) return;

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Gold Rate",
        filters: {
          gold_karat: row.purity,
          is_active: 1,
        },
        fields: ["rate_per_gram"],
        order_by: "date desc",
        limit_page_length: 1,
      },
      callback: function (r) {
        if (r.message && r.message.length) {
          frappe.model.set_value(
            cdt,
            cdn,
            "valuation_rate_per_gram",
            r.message[0].rate_per_gram,
          );

          frm.trigger("recalculate_all");
        } else {
          frappe.msgprint(__("No active gold rate found for selected purity"));
        }
      },
    });
  },
});
