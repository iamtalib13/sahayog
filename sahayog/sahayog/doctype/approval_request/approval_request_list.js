frappe.listview_settings['Approval Request'] = {
    onload: function(listview) {
        listview.page.add_menu_item("My Pending Approvals", function() {
            // Show only requests where current user is an approver & status is Pending
            listview.filter_area.add([
                ["Approval Request Approver", "user", "=", frappe.session.user],
                ["Approval Request", "status", "=", "Pending"]
            ]);
            listview.refresh();
        });
    }
};
