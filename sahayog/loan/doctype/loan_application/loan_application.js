frappe.ui.form.on("Loan Application", {
  before_workflow_action: function (frm) {
    frappe.dom.unfreeze();
    return new Promise((resolve, reject) => {
      frappe.confirm(
        __("Are you sure you want to proceed with <b>{0}</b>?", [
          frm.selected_workflow_action,
        ]),
        () => resolve(),
        () => {
          frappe.validated = false;
          reject();
        }
      );
    });
  },

  after_workflow_action: function (frm) {
    frm.reload_doc();
  },

  refresh: function (frm) {
    frm.trigger("apply_branch_user_rules");

    if (!frm.custom_home_button_added) {
      frm.add_custom_button(__("Home"), function () {
        frappe.set_route("/app/loan-management");
      });
      frm.custom_home_button_added = true;
    }

    // 1. Workflow Logic (Handled by Frappe Workflow)
    frm.trigger("render_workflow_tracker");
    frm.trigger("set_status_indicator");

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
        },
      );
    }
  },

  onload: function (frm) {
    frm.trigger("apply_branch_user_rules");
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
      <div class="workflow-tracker-wrapper" style="margin-bottom: 25px;">
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
    if (frm.doc.loan_type) {
      frappe.db.get_doc("Loan Type", frm.doc.loan_type).then((policy) => {
        frm.set_value("interest_rate", policy.interest_rate);
        frm.set_value("processing_fee", policy.processing_fee);
        frm.set_value("valuation_charges", policy.valuation_charges);
        frm.trigger("recalculate_all");
      });
    }
  },

  loan_amount: function (frm) {
    frm.trigger("recalculate_all");
  },
  gold_rate_per_gram: function (frm) {
    frm.trigger("recalculate_all");
  },

  date_of_birth: function (frm) {
    if (
      frm.doc.date_of_birth &&
      frappe.datetime.get_today() < frm.doc.date_of_birth
    ) {
      frappe.msgprint(__("Date of Birth cannot be in the future."));
      frm.set_value("date_of_birth", "");
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
    
    let ltv = flt(frm.doc.ltv_percent) || 75;

    // Ornament Logic
    (frm.doc.ornaments_list || []).forEach((d) => {
      let rate = flt(d.valuation_rate_per_gram); 

      d.net_weight = flt(d.gross_weight) - flt(d.deduction);
      d.valuation = d.net_weight * rate;
      d.eligible_amount = d.valuation * (ltv / 100);

      t_gw += flt(d.gross_weight);
      t_ded += flt(d.deduction);
      t_nw += d.net_weight;
      t_val += d.valuation;
    });

    frm.set_value("total_gross_weight", t_gw);
    frm.set_value("total_deduction", t_ded);
    frm.set_value("total_net_weight", t_nw);
    frm.set_value("total_valuation", t_val);

    if (frm.doc.security_type === "Gold") {
      frm.set_value("eligible_loan_amount", t_val * (ltv / 100));
    }

    // ✅ Sanctioned Amount
    let sanctioned_amount = Math.min(
      flt(frm.doc.loan_amount),
      flt(frm.doc.eligible_loan_amount),
    );

    frm.set_value("sanctioned_loan_amount", sanctioned_amount);

    // ✅ Charges on sanctioned amount
    let fee_amt = sanctioned_amount * (flt(frm.doc.processing_fee) / 100);

    let total_deductions =
      fee_amt + flt(frm.doc.valuation_charges) + flt(frm.doc.stamp_duty);

    // ✅ Final Disbursement
    frm.set_value("final_payout", sanctioned_amount - total_deductions);
    frm.refresh_field("ornaments_list");
  },

  validate: function (frm) {
    // Skip validations if in Draft state
    if (frm.doc.status === "Draft") return;

    if (frm.doc.customer_name && /[^a-zA-Z\s]/.test(frm.doc.customer_name)) {
      frappe.throw(
        __("Customer Name should only contain alphabets and spaces."),
      );
    }
    if (frm.doc.mobile_number && !/^\d{10}$/.test(frm.doc.mobile_number)) {
      frappe.throw(__("Mobile Number must be exactly 10 digits."));
    }
    if (flt(frm.doc.loan_amount) > flt(frm.doc.eligible_loan_amount) + 0.01) {
      frappe.msgprint({
        title: __("Over Limit"),
        message: __("Requested amount exceeds eligibility. Please adjust."),
        indicator: "orange",
      });
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
