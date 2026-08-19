from hrms.hr.doctype.leave_application.leave_application import LeaveApplication


class CustomLeaveApplication(LeaveApplication):
    def validate_back_dated_application(self):
        # Allow applications inside the current active allocation period even if
        # a future carry-forward allocation already exists. Falls through to the
        # standard HRMS check, which still blocks truly back-dated/gap leaves.
        alloc_on_to_date = self.get_allocation_based_on_application_dates()[1]
        if alloc_on_to_date:
            return
        super().validate_back_dated_application()
