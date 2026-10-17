let rows_set = null;

function has_widget_draft(name) {
    try {
        return !!localStorage.getItem(
            `com_visit_tracker_draft::${frappe.session.user}::${name}`
        );
    } catch (e) {
        return false;
    }
}

function show_no_access_after_back() {
    // no_access_v3: popup pehle, cross dabane par pichle page (Sahayog Home) par wapas
    if (window.__com_no_access_busy) return;
    window.__com_no_access_busy = true;

    // Pichla route (COM Visit Tracker ke alawa) nikalo
    let prev = null;
    const hist = frappe.route_history || [];
    for (let i = hist.length - 1; i >= 0; i--) {
        const key = (hist[i] || []).join("/").toLowerCase().replace(/-/g, " ");
        if (key.indexOf("com visit tracker") === -1) {
            prev = hist[i];
            break;
        }
    }

    const go_prev = () => {
        // no_access_v4: cross dabane par hamesha Sahayog Home
        window.__com_no_access_busy = false;
        frappe.set_route("sahayog-home");
    };

    const d = new frappe.ui.Dialog({
        title: __("No Access"),
        fields: [{
            fieldtype: "HTML",
            fieldname: "msg",
            options: `<p>${__("You do not have access to COM Visit Tracker.")}<br>${__("Contact your manager.")}</p>`
        }]
    });
    d.onhide = go_prev;
    d.show();
}

function reload_list_after_create(listview) {
    // Records ab bane hain: thoda ruk ke list ko page 1 se dobara load karo
    setTimeout(() => {
        listview.start = 0;
        listview.refresh();
    }, 300);
}

function sync_missing_trackers(listview) {
    // Har refresh / re-open par missing records banao (5 sec throttle, loop se bachne ke liye)
    const now = Date.now();
    if (window.__com_last_sync && now - window.__com_last_sync < 5000) return;
    window.__com_last_sync = now;

    frappe.call({
        method: "sahayog.branch_score_card.doctype.com_visit_tracker.com_visit_tracker.has_com_tracker_access",
        no_spinner: true,
        callback(r) {
            if (r.message && r.message.created) {
                reload_list_after_create(listview);
            }
        }
    });
}

function hide_add_button(listview) {
    // hide_add_btn: Add button sirf Administrator / System Manager / Branch Scorecard Editor ko
    if (frappe.user.has_role(["System Manager", "Branch Scorecard Editor"])) return;
    try {
        listview.page.clear_primary_action();
        if (listview.page.btn_primary) listview.page.btn_primary.hide();
        listview.$page.find(".btn-new-doc, .primary-action, .btn-primary-action").hide();
        listview.$result.find(".btn-new-doc, .btn-primary").hide();
    } catch (e) {}
}

frappe.listview_settings["COM Visit Tracker"] = {
    add_fields: ["name"],

    onload(listview) {
        hide_add_button(listview);
        window.__com_last_sync = Date.now();
        // Access check: sirf Admin / System Manager / Branch Scorecard Editor / COM (Report Preference)
        frappe.call({
            method: "sahayog.branch_score_card.doctype.com_visit_tracker.com_visit_tracker.has_com_tracker_access",
            no_spinner: true,
            callback(r) {
                if (!r.message) {
                    show_no_access_after_back();
                    return;
                }
                if (r.message && r.message.created) {
                    reload_list_after_create(listview);
                }
                // Safety net: agar fir bhi list khali hai to ek baar aur reload
                setTimeout(() => {
                    if (!listview.data || !listview.data.length) {
                        listview.start = 0;
                        listview.refresh();
                    }
                }, 1500);
            }
        });

        listview.page.add_inner_button(__("Report Download"), function () {
            frappe.show_alert({ message: __("Generating report..."), indicator: "blue" });
            const drafts = [];
            try {
                const prefix = `com_visit_tracker_draft::${frappe.session.user}::`;
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(prefix)) drafts.push(k.slice(prefix.length));
                }
            } catch (e) {}
            window.open(
                "/api/method/sahayog.branch_score_card.doctype.com_visit_tracker.com_visit_tracker.download_report?drafts=" +
                    encodeURIComponent(JSON.stringify(drafts))
            );
        });
    },

    get_indicator(doc) {
        const filter = "name,=," + doc.name;

        if (has_widget_draft(doc.name)) {
            return [__("Final Submission Pending"), "orange", filter];
        }

        let has_rows;
        if (Array.isArray(doc.com_visit_tracker)) {
            has_rows = doc.com_visit_tracker.length > 0;
        } else {
            has_rows = rows_set ? rows_set.has(doc.name) : true;
        }

        if (!has_rows) {
            return [__("Action Pending"), "red", filter];
        }

        return [__("Submitted"), "green", filter];
    },

    refresh(listview) {
        hide_add_button(listview);
        sync_missing_trackers(listview);
        if (listview.__loading_rows) return;
        listview.__loading_rows = true;

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "COM Visit and Comp Item",
                parent: "COM Visit Tracker",
                fields: ["parent"],
                group_by: "parent",
                limit_page_length: 0
            },
            callback(r) {
                const fresh = new Set((r.message || []).map((d) => d.parent));
                const old = rows_set;
                rows_set = fresh;

                const changed =
                    !old ||
                    old.size !== fresh.size ||
                    [...fresh].some((n) => !old.has(n));

                listview.__loading_rows = false;

                if (changed && listview.data && listview.data.length) {
                    listview.render();
                }
            },
            error() {
                listview.__loading_rows = false;
            }
        });
    }
};