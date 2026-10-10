const DRAFT_SKIP_FIELDS = [
    "name", "owner", "creation", "modified", "modified_by", "docstatus",
    "parent", "parentfield", "parenttype", "idx", "doctype",
    "__unsaved", "__islocal"
];

frappe.ui.form.on("COM Visit Tracker", {
    onload(frm) {
        frm.__pending_doc = null;

        // Primary button text ko hamesha "Submit" rakhega
        if (!frm.__save_btn_observer) {
            const updateButtonText = () => {
                if (frm.page && frm.page.btn_primary) {
                    const btn = frm.page.btn_primary;
                    if (btn.text() !== __("Submit")) {
                        btn.text(__("Submit"));
                    }
                }
            };

            const targetNode = frm.page.wrapper.find(".page-actions")[0];
            if (targetNode) {
                const observer = new MutationObserver(() => updateButtonText());
                observer.observe(targetNode, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                frm.__save_btn_observer = observer;
            }
        }

        // Top indicator observer
        if (!frm.__indicator_observer) {
            const indicator = frm.page.wrapper.find(".indicator-pill")[0];
            const target = indicator ? indicator.parentElement : null;

            if (target) {
                const observer = new MutationObserver(() => {
                    force_pending_indicator(frm);
                });
                observer.observe(target, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                frm.__indicator_observer = observer;
            }
        }
    },

    refresh(frm) {
        // Top-right Submit button -> sirf frm.save() (real submit nahi)
        frm.page.set_primary_action(__("Submit"), () => {
            frm.save();
        });

        if (frm.page.btn_primary) {
            frm.page.btn_primary.text(__("Submit"));
        }

        // Refresh / back ke baad widget-saved draft wapas laao
        restore_draft_if_needed(frm);

        // HTML widget: DB save / Audit sync nahi karta, sirf browser draft rakhta hai
        if (frm.fields_dict.save_widget) {
            const $wrapper = frm.fields_dict.save_widget.$wrapper;

            $wrapper.html(`
                <div style="display:flex; flex-direction:column-reverse; align-items:flex-end; gap:6px;">
                    <button type="button" class="btn btn-primary btn-save-widget">
                        ${__("Save")}
                    </button>
                    <span class="save-widget-status text-muted">
                        ${get_save_widget_status(frm)}
                    </span>
                </div>
            `);

            $wrapper.find(".btn-save-widget").on("click", function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Koi change nahi hua to kuch bhi mat badlo
                if (!frm.is_dirty()) {
                    frappe.show_alert({
                        message: __("No changes in document"),
                        indicator: "blue"
                    }, 5);
                    return;
                }

                // Child table ki rows browser me store (DB / server call nahi)
                save_draft(frm);

                frm.__pending_doc = frm.doc.name;
                update_save_widget_status(frm);
                force_pending_indicator(frm);
            });
        }

        force_pending_indicator(frm);
    },

    onload_post_render(frm) {
        force_pending_indicator(frm);
    },

    com_visit_tracker_add(frm) {
        reset_save_widget_status(frm);
    },

    com_visit_tracker_remove(frm) {
        reset_save_widget_status(frm);
    },

    validate(frm) {
        const rows = frm.doc.com_visit_tracker || [];

        for (const row of rows) {
            const month = (row.month || "").trim();
            if (!month) {
                continue;
            }

            const dates = [
                ["visti_start_date", "Visit Start Date"],
                ["report_publish_date", "Report Publish Date"]
            ];

            for (const [fieldname, label] of dates) {
                const value = row[fieldname];
                if (!value) {
                    continue;
                }

                const actualMonth = moment(value, "YYYY-MM-DD").format("MMMM");

                if (actualMonth.toLowerCase() !== month.toLowerCase()) {
                    frappe.show_alert({
                        message: __(
                            "Row {0}: Month is {1}, but {2} is in {3}. Please correct the date before saving.",
                            [row.idx, month, label, actualMonth]
                        ),
                        indicator: "red"
                    }, 10);

                    frappe.validated = false;
                    return;
                }
            }
        }
    },

    after_save(frm) {
        // Top-right Submit se real save ho gaya -> draft aur pending dono clear
        clear_draft(frm);
        reset_save_widget_status(frm);
    }
});

// Child table me edit ho to status "Not Saved" (draft last widget-save wala hi rahega)
frappe.ui.form.on("COM Visit and Comp Item", {
    month(frm) { reset_save_widget_status(frm); },
    visti_start_date(frm) { reset_save_widget_status(frm); },
    report_publish_date(frm) { reset_save_widget_status(frm); },
    report_closure_date(frm) { reset_save_widget_status(frm); },
    score_obtain(frm) { reset_save_widget_status(frm); }
});

/* ---------------- Draft (browser localStorage) ---------------- */

function draft_key(frm) {
    return `com_visit_tracker_draft::${frappe.session.user}::${frm.doc.name}`;
}

function serialize_rows(frm) {
    return (frm.doc.com_visit_tracker || []).map((row) => {
        const data = {};
        Object.keys(row).forEach((k) => {
            if (!DRAFT_SKIP_FIELDS.includes(k)) {
                data[k] = row[k];
            }
        });
        return data;
    });
}

function save_draft(frm) {
    try {
        localStorage.setItem(
            draft_key(frm),
            JSON.stringify(serialize_rows(frm))
        );
    } catch (e) {
        console.error("Draft save failed", e);
    }
}

function load_draft(frm) {
    try {
        const raw = localStorage.getItem(draft_key(frm));
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function clear_draft(frm) {
    try {
        localStorage.removeItem(draft_key(frm));
    } catch (e) {}
}

function restore_draft_if_needed(frm) {
    if (!frm.doc || frm.doc.__islocal || frm.doc.__unsaved || frm.__restoring) {
        return;
    }

    const draft = load_draft(frm);
    if (!draft) {
        return;
    }

    // Server wali rows draft ke barabar hain to kuch karna nahi
    if (JSON.stringify(serialize_rows(frm)) === JSON.stringify(draft)) {
        frm.__pending_doc = frm.doc.name;
        return;
    }

    frm.__restoring = true;
    try {
        frm.clear_table("com_visit_tracker");
        draft.forEach((data) => {
            const row = frm.add_child("com_visit_tracker");
            Object.keys(data).forEach((k) => {
                row[k] = data[k];
            });
        });
        frm.refresh_field("com_visit_tracker");
        frm.dirty();
    } finally {
        frm.__restoring = false;
    }

    frm.__pending_doc = frm.doc.name;
}

/* ---------------- Status helpers ---------------- */

function is_pending(frm) {
    return !!frm.doc && frm.__pending_doc === frm.doc.name;
}

function force_pending_indicator(frm) {
    if (!is_pending(frm)) {
        return;
    }

    const $pill = frm.page.wrapper.find(".indicator-pill").first();
    if ($pill.text().trim() === __("Final Submission Pending")) {
        return;
    }

    const obs = frm.__indicator_observer;
    if (obs) obs.disconnect();

    frm.page.set_indicator(__("Final Submission Pending"), "orange");

    if (obs) {
        const el = frm.page.wrapper.find(".indicator-pill")[0];
        if (el && el.parentElement) {
            obs.observe(el.parentElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }
}

function get_save_widget_status(frm) {
    if (is_pending(frm)) {
        return __("Final Submission Pending");
    }

    if (frm.is_dirty()) {
        return __("Not saved");
    }

    return (frm.doc.com_visit_tracker || []).length
        ? __("Submitted")
        : __("Action Pending");
}

function update_save_widget_status(frm) {
    if (!frm.fields_dict.save_widget) {
        return;
    }

    frm.fields_dict.save_widget.$wrapper
        .find(".save-widget-status")
        .text(get_save_widget_status(frm));
}

function reset_save_widget_status(frm) {
    if (frm.__restoring) {
        return;
    }

    frm.__pending_doc = null;
    update_save_widget_status(frm);

    if (frm.is_dirty()) {
        frm.page.set_indicator(__("Not Saved"), "orange");
    }
}