# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

class EODTasks(Document):
    def validate(self):
        # Handle child table status updates if updated directly (though usually done via parent)
        if self.status == "Completed" and not self.completed_by:
            self.completed_by = frappe.session.user
            self.completed_on = now_datetime()
        elif self.status == "Pending":
            self.completed_by = None
            self.completed_on = None

def get_permission_query_conditions(user):
    """
    User should only see tasks of the teams they belong to.
    """
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return ""

    # Get teams where user is a member or lead
    teams = frappe.get_all(
        "Team Members",
        filters={"user": user},
        pluck="parent"
    )
    
    lead_teams = frappe.get_all(
        "EOD Team",
        filters={"team_lead": user},
        pluck="name"
    )

    all_teams = list(set(teams + lead_teams))
    
    if not all_teams:
        return "1=0" # No access if not in any team

    return f"team in ({', '.join([frappe.db.escape(t) for t in all_teams])})"

def has_permission(doc, user=None):
    """
    Check if user has permission to this task.
    """
    if not user:
        user = frappe.session.user
        
    if user == "Administrator":
        return True

    # Check if user is in the team or lead
    is_member = frappe.db.exists("Team Members", {"parent": doc.team, "user": user})
    is_lead = frappe.db.exists("EOD Team", {"name": doc.team, "team_lead": user})
    
    return is_member or is_lead
