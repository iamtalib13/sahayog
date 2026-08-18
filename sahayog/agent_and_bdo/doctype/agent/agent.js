// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Agent", {
  refresh(frm) {
    frm.clear_custom_buttons();
    frm.trigger("employee_details");
    frm.trigger("read_only_fields");

    // --- Feature: Get Commission ---
    if (!frm.is_new()) {
      frm.add_custom_button(__("Get Commission"), () => {
        frm.trigger("get_commission");
      });
    }

    // --- Feature: Update From Finacle ---
    if (!frm.is_new() && (frappe.user.has_role("System Manager") || frappe.user.has_role("Employee"))) {
      frm.add_custom_button(__("Update From Finacle"), () => {
        frappe.call({
          method: "sahayog.api.auto_agent_creation.update_agent_from_finacle",
          args: {
            agent_code: frm.doc.name,
          },
          freeze: true,
          freeze_message: __("Fetching latest details from Finacle..."),
          callback: (r) => {
            if (r.message && r.message.status === "success") {
              frappe.show_alert({
                message: r.message.message,
                indicator: "green",
              });
              frm.reload_doc();
            } else {
              frappe.msgprint({
                title: __("Update Failed"),
                message: r.message ? r.message.message : __("Unknown error occurred"),
                indicator: "red",
              });
            }
          },
        });
      });
    }

    frm.trigger("hide_sidebar_options");
  },

  employee(frm) {
    frm.trigger("employee_details");
  },

  get_commission(frm) {
    if (frm.is_new()) {
      frappe.msgprint(__("Please save the document first."));
      return;
    }
    const agent_code = frm.doc.agent_code || frm.doc.name;
    frappe.call({
      method: "sahayog.agent_and_bdo.doctype.agent.agent.fetch_agent_commission",
      args: {
        agent_code: agent_code,
      },
      freeze: true,
      freeze_message: __("Scanning SS & VS Report for commission data..."),
      callback: (r) => {
        if (r.message && r.message.status === "success") {
          frm.set_value("commission_json", r.message.commission_json);
          frm.refresh_field("commission_json");
          frappe.show_alert({
            message: r.message.message,
            indicator: "green",
          });
        } else {
          frappe.msgprint({
            title: __("Scan Failed"),
            message: r.message ? r.message.message : __("Could not fetch commission data"),
            indicator: "red",
          });
        }
      },
    });
  },

  hide_sidebar_options(frm) {
    $(".layout-side-section").hide();
    $(".sidebar-toggle-btn").hide();
  },

  async employee_details(frm) {
    const employee = frm.doc.employee;

    if (!employee) {
      frm.set_intro("");
      return;
    }

    try {
      const emp = await frappe.xcall(
        "sahayog.agent_and_bdo.doctype.agent.agent.get_employee_info",
        { employee: employee }
      );

      if (!emp || !emp.name) {
        frm.set_intro(
          __("Employee details not found for ID: {0}", [employee]),
          "red"
        );
        return;
      }

      frm.set_intro(render_allocated_employee_html(emp));
    } catch (err) {
      frm.set_intro(
        __("Failed to load employee details. Please try again."),
        "red"
      );
    }
  },

  read_only_fields(frm) {
    const hasRequiredRole =
      frappe.user.has_role("System Manager") ||
      frappe.user.has_role("MIS Admin");

    if (!hasRequiredRole) {
      frm.disable_save();
      frm.set_read_only();
    }
  },
});

// --- Helper UI Components for Employee Introduction ---

function render_allocated_employee_html(emp) {
  const empId = frappe.utils.escape_html(emp.name || "-");
  const empName = frappe.utils.escape_html(emp.employee_name || "-");
  const designation = frappe.utils.escape_html(emp.designation || "-");
  const branch = frappe.utils.escape_html(emp.branch || "-");
  const mobile = frappe.utils.escape_html(emp.cell_number || "-");

  return `
    <div class="allocated-emp-intro-card" style="
      padding: 4px 0 10px 0;
      margin-bottom: 15px;
    ">
      <!-- Header row -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dashed var(--border-color, #e2e8f0); padding-bottom: 8px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: var(--green-600, #059669); text-transform: uppercase; letter-spacing: 0.5px;">
          <i class="fa fa-id-card-o" style="font-size: 15px;"></i>
          <span>${__("Allocated Employee Information")}</span>
        </div>
        <span class="indicator-pill green" style="font-size: 11px; font-weight: 600; text-transform: none;">
          ${empId}
        </span>
      </div>

      <!-- Data Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px 20px; align-items: start;">
        <!-- Employee ID -->
        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.4px; margin-bottom: 3px;">
            <i class="fa fa-hashtag" style="margin-right: 4px; opacity: 0.7;"></i>${__("Employee ID")}
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-color, #0f172a);">
            ${empId}
          </div>
        </div>

        <!-- Employee Name -->
        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.4px; margin-bottom: 3px;">
            <i class="fa fa-user" style="margin-right: 4px; opacity: 0.7;"></i>${__("Employee Name")}
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-color, #0f172a);">
            ${empName}
          </div>
        </div>

        <!-- Designation -->
        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.4px; margin-bottom: 3px;">
            <i class="fa fa-briefcase" style="margin-right: 4px; opacity: 0.7;"></i>${__("Designation")}
          </div>
          <div style="font-size: 13px; font-weight: 500; color: var(--text-color, #334155);">
            ${designation}
          </div>
        </div>

        <!-- Branch -->
        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.4px; margin-bottom: 3px;">
            <i class="fa fa-building-o" style="margin-right: 4px; opacity: 0.7;"></i>${__("Branch")}
          </div>
          <div style="font-size: 13px; font-weight: 500; color: var(--text-color, #334155);">
            ${branch}
          </div>
        </div>

        <!-- Mobile Number -->
        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted, #64748b); letter-spacing: 0.4px; margin-bottom: 3px;">
            <i class="fa fa-phone" style="margin-right: 4px; opacity: 0.7;"></i>${__("Mobile Number")}
          </div>
          <div style="font-size: 13px; font-weight: 500; color: var(--text-color, #334155);">
            ${mobile}
          </div>
        </div>
      </div>
    </div>
  `;
}
