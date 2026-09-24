frappe.ui.form.on("Branch Score Card", {
    onload_post_render(frm) {
        if (frm.is_new()) {
            const current_month = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ][new Date().getMonth()];

            const current_year = new Date().getFullYear();

            frm.doc.month = current_month;
            frm.doc.year = current_year;
            frm.refresh_field("month");
            frm.refresh_field("year");
        }
    },

    refresh(frm) {
        frm.disable_save();

        frm.trigger("ensure_empty_grids_visible");
        frm.trigger("render_month_selector");

        if (frm.fields_dict["branch"] && frm.fields_dict["branch"].$wrapper) {
            frm.fields_dict["branch"].$wrapper.find("a").on("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        }

        if (!frm.is_new()) {
            frm.trigger("render_widget");
        } else {
            frm.trigger("fetch_and_render_all");
        }
    },

    render_month_selector(frm) {
        let field = frm.get_field("month_selector_html");
        if (!field || !field.$wrapper) return;

        field.$wrapper.removeClass("hide hidden").show();

        const fy_months = [
            "April", "May", "June", "July", "August", "September",
            "October", "November", "December", "January", "February", "March"
        ];

        const jan_mar = ["January", "February", "March"];
        const current_selected = frm.doc.month || "";

        const capsule_items = fy_months.map(m => {
            const isActive = m.toLowerCase() === current_selected.toLowerCase();

            return `
                <button type="button"
                    class="btn btn-default month-selector-btn ${isActive ? "active" : ""}"
                    data-value="${m}">
                    ${m}
                </button>
            `;
        }).join("");

        const html_content = `
            <div class="month-selector-container">
                ${capsule_items}
            </div>
        `;

        field.$wrapper.html(html_content);

        field.$wrapper.find(".month-selector-btn").on("click", function(e) {
            e.preventDefault();

            const selected_month = $(this).data("value");

            if (!selected_month || selected_month === frm.doc.month) {
                return;
            }

            const {
                branch,
                year,
                month: doc_month,
                name: doc_name,
                branch_name
            } = frm.doc;

            const form_year = parseInt(year);

            if (!branch || !form_year) {
                frappe.msgprint(__("Please select Branch and Year first."));
                return;
            }

            const base_fy_year = jan_mar.includes(doc_month)
                ? form_year - 1
                : form_year;

            const target_year = jan_mar.includes(selected_month)
                ? base_fy_year + 1
                : base_fy_year;

            frappe.db.get_value(
                "Branch Score Card",
                {
                    branch: branch,
                    month: selected_month,
                    year: target_year
                },
                "name",
                (r) => {
                    if (r && r.name) {
                        if (r.name !== doc_name) {
                            frappe.set_route(
                                "Form",
                                "Branch Score Card",
                                r.name
                            );
                        }
                    } else {
                        frappe.msgprint({
                            title: __("Record Not Found"),
                            indicator: "orange",
                            message: __(
                                "Scorecard record is not available for <b>{0}</b> branch for <b>{1} {2}</b>.",
                                [
                                    branch_name || branch,
                                    selected_month,
                                    target_year
                                ]
                            )
                        });
                    }
                }
            );
        });
    },

    month(frm) {
        frm.trigger("fetch_and_render_all");
    },

    year(frm) {
        frm.trigger("fetch_and_render_all");
    },

    ensure_empty_grids_visible(frm) {
        const table_configs = [
            {
                fieldname: "table_cxyy",
                label: "Scorecard Items",
                cols: [
                    "Function",
                    "Parameter",
                    "Weightage",
                    "Scoring Methodology",
                    "Data Source",
                    "Score Obtained"
                ]
            }
        ];

        table_configs.forEach(config => {
            let field = frm.get_field(config.fieldname);

            if (!field || !field.$wrapper) return;

            field.$wrapper.removeClass("hide hidden").show();

            if (field.parent) {
                $(field.parent).removeClass("hide hidden").show();
            }

            let rows = frm.doc[config.fieldname] || [];

            field.$wrapper.find(".custom-read-only-grid").remove();

            if (field.grid) {
                field.grid.cannot_add_rows = true;
                field.grid.only_sortable = false;

                if (rows.length === 0) {
                    field.$wrapper.find(".form-grid").hide();

                    let headers_html = config.cols.map(col => {
                        return `<th>${col}</th>`;
                    }).join("");

                    let custom_empty_table = `
                        <div class="custom-read-only-grid">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>${headers_html}</tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colspan="${config.cols.length}">
                                            No Data
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    `;

                    field.$wrapper.append(custom_empty_table);
                } else {
                    field.$wrapper.find(".form-grid").show();
                }
            }
        });
    },

    fetch_and_render_all(frm) {
        if (!frm.doc.branch || !frm.doc.month || !frm.doc.year) {
            frm.trigger("render_widget");
            frm.trigger("ensure_empty_grids_visible");
            return;
        }

        frappe.call({
            method: "sahayog.branch_score_card.doctype.branch_score_card.branch_score_card.fetch_score_card_data",
            args: {
                branch: frm.doc.branch,
                month: frm.doc.month,
                year: frm.doc.year
            },

            callback: function(r) {
                if (r.message) {
                    let temp_doc = r.message;

                    frm.doc.branch_name = temp_doc.branch_name;
                    frm.refresh_field("branch_name");

                    frm.clear_table("table_cxyy");

                    (temp_doc.table_cxyy || []).forEach(row => {
                        if (row.function && row.parameter) {
                            let child = frm.add_child("table_cxyy");

                            child.function = row.function;
                            child.parameter = row.parameter;
                            child.weightage = row.weightage;
                            child.data_source = row.data_source;
                            child.scoring_rule = row.scoring_rule;
                            child.scoring_methodology = row.scoring_methodology;
                            child.score_obtain = row.score_obtain;
                        }
                    });

                    frm.refresh_field("table_cxyy");

                    if (!frm.is_new()) {
                        frm.dirty(false);
                    }

                    frm.trigger("render_widget");
                    frm.trigger("ensure_empty_grids_visible");
                }
            },

            error: function() {
                frm.doc.table_cxyy = [];
                frm.refresh_field("table_cxyy");

                if (!frm.is_new()) {
                    frm.dirty(false);
                }

                frm.trigger("render_widget");
                frm.trigger("ensure_empty_grids_visible");
            }
        });
    },

    render_widget(frm) {
        let field = frm.get_field("branch_score_widget");

        if (!field || !field.$wrapper) return;

        let items = frm.doc.table_cxyy || [];

        if (!items.length) {
            field.$wrapper.empty();
            return;
        }

        let rows_html = items.map(row => {
            return `
                <tr>
                    <td>${frappe.utils.escape_html(row.function || "")}</td>
                    <td>${frappe.utils.escape_html(row.parameter || "")}</td>
                    <td>${frappe.utils.escape_html(String(row.weightage ?? ""))}</td>
                    <td>${frappe.utils.escape_html(row.scoring_methodology || row.scoring_rule || "")}</td>
                    <td>${frappe.utils.escape_html(row.data_source || "")}</td>
                    <td>${frappe.utils.escape_html(String(row.score_obtain ?? ""))}</td>
                </tr>
            `;
        }).join("");

        field.$wrapper.html(`
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Function</th>
                        <th>Parameter</th>
                        <th>Weightage</th>
                        <th>Scoring Methodology</th>
                        <th>Data Source</th>
                        <th>Score Obtained</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows_html}
                </tbody>
            </table>
        `);
    }
});