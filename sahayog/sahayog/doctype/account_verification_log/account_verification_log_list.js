frappe.listview_settings["Account Verification Log"] = {
    onload(listview) {
        if (!frappe.user.has_role("System Manager")) return;

        listview.page.add_inner_button(__("Download Report"), () => {
            const filters = listview.get_filters_for_args
                ? listview.get_filters_for_args()
                : listview.filter_area.get();

            window.open(
                "/api/method/sahayog.sahayog.doctype.account_verification_log.account_verification_log.download_report" +
                    "?filters=" + encodeURIComponent(JSON.stringify(filters))
            );
        });
    },
};
