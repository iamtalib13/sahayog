frappe.ui.form.on("Travel Request", {
    setup(frm) {
        frm.set_query("reporting_manager", () => {
            return {
                filters: {
                    status: "Active",
                    name: ["!=", frm.doc.employee || ""],
                },
            };
        });
    },

    onload(frm) {
        if (frm.is_new() && !frm.doc.employee) {
            frappe.db
                .get_value("Employee", { user_id: frappe.session.user }, "name")
                .then((r) => {
                    // frappe.db.get_value returns { name: "..." }, not the raw value.
                    const employee = r.message && r.message.name;
                    if (employee) {
                        frm.set_value("employee", employee);
                    }
                });
        }
    },

    employee(frm) {
        if (!frm.doc.employee || frm.doc.reporting_manager) {
            return;
        }
        frappe.db.get_value("Employee", frm.doc.employee, "reports_to").then((r) => {
            const manager = r.message && r.message.reports_to;
            if (manager) {
                frm.set_value("reporting_manager", manager);
            }
        });
    },

    mode_of_travel(frm) {
        if (frm.doc.mode_of_travel === "Air") {
            frappe.show_alert({
                message: __(
                    "Air travel: Economy class + lowest fare only. Any exception needs COO approval."
                ),
                indicator: "orange",
            });
        }
    },
});
