import frappe
from frappe.model.document import Document
from frappe import _


class ReportPreference(Document):

    def autoname(self):
        """
        Naming format:
        <User Email>
        """
        if not self.user:
            frappe.throw(_("User is required"))

        self.name = self.user

    def before_insert(self):
        # Naya record banate waqt check
        self.check_admin_access()

    def validate(self):
        # Har bar save/edit karte waqt check
        self.check_admin_access()
        self.validate_unique_preference()
        # self.validate_regional_requirements()

    def check_admin_access(self):
        """
        Manager's requirement: Only Administrator and System Manager allowed.
        """
        user = frappe.session.user
        allowed_roles = {"Administrator",
                         "System Manager", "Permission Manager"}
        user_roles = set(frappe.get_roles(user))

        if user != "Administrator" and not allowed_roles.intersection(user_roles):
            frappe.throw(
                _("Access Denied: Currently, only Administrators and System Managers are allowed to create or manage Report Preferences.")
            )

    def validate_unique_preference(self):
        existing = frappe.db.exists(
            "Report Preference",
            {
                "user": self.user,
                "name": ["!=", self.name],
            }
        )

        if existing:
            frappe.throw(
                _("Report Preference already exists for this user.")
            )

    # def validate_regional_requirements(self):
    #     """
    #     If Zone is selected, user must provide either 'All Regions' check or specific 'Regions'.
    #     """
    #     if self.zone and len(self.zone) > 0:
    #         if not self.all_regions and (not self.region or len(self.region) == 0):
    #             frappe.throw(
    #                 _("If Zones are selected, you must either check 'All Regions' or select specific Regions."),
    #                 title=_("Mandatory Requirement")
    #             )


@frappe.whitelist()
def search_user(search_text=None):
    if not search_text:
        return []

    # Hum sirf unhi users ko dhundenge jinka 'full_name' ya 'name'
    # search text se START hota ho.
    search_query = f"{search_text}%"

    return frappe.db.sql("""
        SELECT name, full_name
        FROM `tabUser`
        WHERE (name LIKE %(starts)s OR full_name LIKE %(starts)s)
        AND enabled = 1
        ORDER BY
            -- Pehle name ki priority phir full_name ki
            CASE 
                WHEN name LIKE %(starts)s THEN 0 
                ELSE 1 
            END,
            -- Numeric sorting ke liye length aur alphabetical order
            LENGTH(name) ASC,
            name ASC
        LIMIT 5
    """, {
        "starts": search_query
    }, as_dict=True)
