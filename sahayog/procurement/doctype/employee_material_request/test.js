function openManageApprovalsDialog(frm) {
    const d = new frappe.ui.Dialog({
        title: __("Manage Approvers"),
        size: "large",
        fields: [
            // ===== CARD 1: Reporting Person =====
            {
                fieldtype: "HTML",
                fieldname: "rp_card",
                label: __("Reporting Person")
            },
            {
                fieldtype: "Check",
                fieldname: "rp_skip",
                label: __("Skip Reporting Person")
            },
            {
                fieldtype: "Small Text",
                fieldname: "rp_remark",
                label: __("Reporting Person Remark"),
                depends_on: "eval:doc.rp_skip==1",
                mandatory_depends_on: "eval:doc.rp_skip==1"
            },

            // spacer
            { fieldtype: "Section Break" },

            // ===== CARD 2: HO Officer =====
            {
                fieldtype: "HTML",
                fieldname: "ho_card",
                label: __("HO Officer")
            },
            {
                fieldtype: "Check",
                fieldname: "ho_skip",
                label: __("Skip HO Officer")
            },
            {
                fieldtype: "Small Text",
                fieldname: "ho_remark",
                label: __("HO Officer Remark"),
                depends_on: "eval:doc.ho_skip==1",
                mandatory_depends_on: "eval:doc.ho_skip==1"
            },

            { fieldtype: "Section Break" },

            // ===== Change Reporting Person =====
            {
                fieldtype: "Link",
                fieldname: "new_reporting_person",
                label: __("Change Reporting Person"),
                options: "User",
                default: frm.doc.reporting_person || "",
                description: __("Current: {0}", [frm.doc.reporting_person || __("Not Set")])
            },
            {
                fieldtype: "HTML",
                fieldname: "new_rp_preview"
            }
        ],
        primary_action_label: __("Submit"),
        primary_action(values) {
            // Basic front-end validation for Skip allowed statuses
            const rp_allowed = ["Not Received", "Pending", "", null];
            const ho_allowed = ["Not Received", "Pending", "", null];

            if (values.rp_skip && !rp_allowed.includes(frm.doc.reporting_person_status)) {
                frappe.msgprint(__("Reporting Person already decided. Cannot skip now."));
                return;
            }
            if (values.ho_skip && !ho_allowed.includes(frm.doc.ho_officer_status)) {
                frappe.msgprint(__("HO Officer already decided. Cannot skip now."));
                return;
            }

            if (!values.rp_skip && !values.ho_skip &&
                (!values.new_reporting_person ||
                 values.new_reporting_person === frm.doc.reporting_person)) {
                frappe.msgprint(__("Select at least one action: Skip or Change Reporting Person."));
                return;
            }

            d.hide();

            frappe.call({
                method: "sahayog.procurement.doctype.employee_material_request.employee_material_request.admin_manage_approvers",
                args: {
                    docname: frm.doc.name,
                    rp_skip: values.rp_skip ? 1 : 0,
                    ho_skip: values.ho_skip ? 1 : 0,
                    rp_remark: values.rp_remark || "",
                    ho_remark: values.ho_remark || "",
                    new_reporting_person: values.new_reporting_person || ""
                },
                freeze: true,
                freeze_message: __("Updating approvers..."),
                callback: (r) => {
                    if (r.message && r.message.success) {
                        frappe.show_alert({ message: r.message.message, indicator: "green" });
                        frm.reload_doc();
                    }
                }
            });
        }
    });

    // Render cards with current data
    const rp_badge = get_status_badge(frm.doc.reporting_person_status);
    const ho_badge = get_status_badge(frm.doc.ho_officer_status);

    const rp_html = `
        <div style="border:1px solid #d1d8dd;border-radius:6px;padding:10px;margin-bottom:6px;">
            <div style="font-weight:600;">${__("Reporting Person")}</div>
            <div style="margin-top:4px;">
                ${frappe.utils.escape_html(frm.doc.reporting_person || __("Not Set"))}
                <span class="indicator ${rp_badge.class}" style="margin-left:8px;padding:2px 8px;border-radius:12px;font-size:11px;">
                    ${rp_badge.label}
                </span>
            </div>
        </div>
    `;

    const ho_html = `
        <div style="border:1px solid #d1d8dd;border-radius:6px;padding:10px;margin-bottom:6px;">
            <div style="font-weight:600;">${__("HO Officer")}</div>
            <div style="margin-top:4px;">
                ${frappe.utils.escape_html(frm.doc.head_office_officer || __("Not Set"))}
                <span class="indicator ${ho_badge.class}" style="margin-left:8px;padding:2px 8px;border-radius:12px;font-size:11px;">
                    ${ho_badge.label}
                </span>
            </div>
        </div>
    `;

    d.get_field("rp_card").$wrapper.html(rp_html);
    d.get_field("ho_card").$wrapper.html(ho_html);

    // Preview selected new Reporting Person (optional UX sugar)
    d.fields_dict.new_reporting_person.df.onchange = function () {
        const val = d.get_value("new_reporting_person");
        if (!val) {
            d.get_field("new_rp_preview").$wrapper.empty();
            return;
        }
        frappe.db.get_value("User", val, "full_name").then(r => {
            const name = r.message && r.message.full_name ? r.message.full_name : val;
            d.get_field("new_rp_preview").$wrapper.html(
                `<div style="margin-top:4px;font-size:11px;color:#6c757d;">
                    ${__("New Reporting Person")}: ${frappe.utils.escape_html(name)} (${frappe.utils.escape_html(val)})
                 </div>`
            );
        });
    };

    d.show();
}

function get_status_badge(status) {
    const s = status || "Not Received";
    const map = {
        "Pending": { label: "Pending", class: "yellow" },
        "Approved": { label: "Approved", class: "green" },
        "Rejected": { label: "Rejected", class: "red" },
        "Skip": { label: "Skip", class: "blue" },
        "Not Received": { label: "Not Received", class: "grey" }
    };
    return map[s] || map["Not Received"];
}