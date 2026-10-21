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

frappe.listview_settings["COM Visit Tracker"] = {
    add_fields: ["name"],

    onload(listview) {
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