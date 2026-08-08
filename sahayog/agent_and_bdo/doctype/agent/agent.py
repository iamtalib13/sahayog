# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import re
from typing import Any, Dict, List, Optional, Union

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class Agent(Document):
    """
    Controller for Agent DocType.
    Manages agent status, user/employee allocation requests, and status lifecycle.
    """

    def validate(self) -> None:
        """Validate agent state before saving."""
        self.set_agent_type_from_code()

        # If both auth_id and employee are blank, force status to Unallocated
        if not self.auth_id and not self.employee and self.status == "Allocated":
            self.status = "Unallocated"

    def set_agent_type_from_code(self) -> None:
        """Extract and set agent_type (RDDSA / DDDSA) based on agent_code or document name."""
        code = str(self.agent_code or self.name or "").upper()
        if code.startswith("RDDSA"):
            self.agent_type = "RDDSA"
        elif code.startswith("DDDSA"):
            self.agent_type = "DDDSA"

    def before_save(self) -> None:
        """Actions to perform before saving document."""
        self._requested_by_validated = True

        if self.agent_name:
            self.agent_name = self.agent_name.upper()

        if self.status == "Unallocated":
            self.clear_allocation_fields()

    def set_employee_from_auth_id(self) -> None:
        """Extract employee number from auth_id if it starts with SAH prefix."""
        if not self.auth_id:
            return

        auth = self.auth_id.strip().upper()
        if auth.startswith("SAH"):
            match = re.search(r"\d+", auth)
            if match:
                number_part = match.group(0).lstrip("0")
                self.employee = number_part if number_part else ""
            else:
                self.employee = ""
        else:
            self.employee = ""

    @frappe.whitelist()
    def approve_allocation(self) -> Dict[str, Union[bool, str]]:
        """Approve allocation request and bind employee to agent."""
        self.approved_by = frappe.session.user
        self.approved_on = now_datetime()
        self.status = "Allocated"

        if self.requested_by:
            employee = frappe.db.get_value(
                "Employee", {"user_id": self.requested_by}, "name", cache=True
            )
            if employee:
                self.employee = employee
            else:
                frappe.throw(
                    _("No Employee record found for user {0}").format(self.requested_by)
                )

        self.save()
        return {
            "success": True,
            "message": _("Agent Allocated Successfully"),
        }

    @frappe.whitelist()
    def reject_allocation(self) -> Dict[str, Union[bool, str]]:
        """Reject allocation request and revert status to Unallocated."""
        self.requested_by = None
        self.requested_on = None
        self.status = "Unallocated"
        self.save()
        return {
            "success": True,
            "message": _("Agent Allocation Rejected"),
        }

    def clear_allocation_fields(self) -> None:
        """Clear all allocation fields on agent without saving."""
        self.requested_by = None
        self.requested_on = None
        self.approved_by = None
        self.approved_on = None
        self.employee = None
        self.auth_id = None

    @frappe.whitelist()
    def unallocate_agent(self) -> Dict[str, Union[bool, str]]:
        """Unallocate agent and clear all allocation metadata."""
        self.status = "Unallocated"
        self.clear_allocation_fields()
        self.save()
        return {
            "success": True,
            "message": _("Agent Unallocated Successfully"),
        }

    @frappe.whitelist()
    def allocation_request(
        self, approver_user_id: Optional[str] = None
    ) -> Dict[str, Union[bool, str]]:
        """Raise an allocation request targeting selected approver user."""
        if not approver_user_id:
            frappe.throw(_("Approver selection is required"))

        user_enabled = frappe.db.get_value(
            "User", approver_user_id, "enabled", cache=True
        )
        if user_enabled is None:
            frappe.throw(_("Selected approver user does not exist"))
        elif not user_enabled:
            frappe.throw(_("Selected approver user is disabled"))

        employee = frappe.db.get_value(
            "Employee",
            {"user_id": approver_user_id, "status": "Active"},
            ["name", "employee_name"],
            as_dict=True,
            cache=True,
        )

        if not employee:
            frappe.throw(_("No active employee found for selected approver"))

        self.requested_by = frappe.session.user
        self.requested_on = now_datetime()
        self.status = "Pending"
        self.approved_by = approver_user_id
        self.save()

        return {
            "success": True,
            "message": _("Allocation request sent to {0} for approval").format(
                employee.employee_name
            ),
        }


@frappe.whitelist()
def bulk_unallocate(
    agent_names: Union[List[str], str, None] = None
) -> Dict[str, Any]:
    """Unallocate selected agents in bulk without N+1 query overhead."""
    if isinstance(agent_names, str):
        agent_names = frappe.parse_json(agent_names)

    if not agent_names:
        return {
            "success": False,
            "message": _("No agents selected for unallocation"),
        }

    if not isinstance(agent_names, (list, tuple)):
        agent_names = [agent_names]

    frappe.db.set_value(
        "Agent",
        {"name": ["in", agent_names]},
        {
            "status": "Unallocated",
            "requested_by": None,
            "requested_on": None,
            "approved_by": None,
            "approved_on": None,
            "employee": None,
            "auth_id": None,
        },
        update_modified=True,
    )

    return {
        "success": True,
        "count": len(agent_names),
        "message": _("{0} agent(s) unallocated successfully").format(len(agent_names)),
    }


@frappe.whitelist()
def bulk_transfer(
    agent_names: Union[List[str], str, None] = None,
    to_employee: Optional[str] = None,
) -> Dict[str, Any]:
    """Transfer selected agents to another employee in bulk."""
    if isinstance(agent_names, str):
        agent_names = frappe.parse_json(agent_names)

    if not agent_names:
        return {
            "success": False,
            "message": _("No agents selected for transfer"),
        }

    if not to_employee:
        return {
            "success": False,
            "message": _("Target employee not provided"),
        }

    if not isinstance(agent_names, (list, tuple)):
        agent_names = [agent_names]

    frappe.db.set_value(
        "Agent",
        {"name": ["in", agent_names]},
        "employee",
        to_employee,
        update_modified=True,
    )

    return {
        "success": True,
        "count": len(agent_names),
        "message": _(
            "{0} agent(s) transferred to employee {1} successfully"
        ).format(len(agent_names), to_employee),
    }


@frappe.whitelist()
def get_branch_managers(branch_code: str) -> List[Dict[str, Any]]:
    """Get all Branch Managers for given branch code grouped & ordered by designation priority."""
    if not branch_code:
        frappe.throw(_("Branch Code is required"))

    allowed_designations = [
        "BRANCH MANAGER",
        "Asst. Branch Manager",
        "Branch Operation Manager",
    ]

    try:
        managers = frappe.db.get_all(
            "Employee",
            filters={
                "sol_id": branch_code,
                "status": "Active",
                "user_id": ["!=", ""],
                "designation": ["in", allowed_designations],
            },
            fields=["name", "employee_name", "user_id", "designation", "sol_id"],
            order_by="employee_name",
        )

        if not managers:
            return []

        user_ids = [m.user_id for m in managers if m.get("user_id")]
        if not user_ids:
            return []

        # Bulk fetch enabled user IDs to eliminate N+1 queries
        enabled_users = set(
            frappe.db.get_all(
                "User",
                filters={"name": ["in", user_ids], "enabled": 1},
                pluck="name",
            )
        )

        valid_managers = [m for m in managers if m.user_id in enabled_users]

        designation_priority = {
            "BRANCH MANAGER": 1,
            "Asst. Branch Manager": 2,
            "Branch Operation Manager": 3,
        }

        valid_managers.sort(
            key=lambda x: (
                designation_priority.get(x.designation, 4),
                x.employee_name,
            )
        )

        return valid_managers

    except Exception as e:
        frappe.log_error(title="Error in get_branch_managers", message=str(e))
        return []


@frappe.whitelist()
def get_approver_details(user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get employee details by user_id for approver display with fallback to User."""
    if not user_id:
        return None

    try:
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user_id, "status": "Active"},
            [
                "employee_name",
                "name",
                "designation",
                "branch",
                "company_email",
                "cell_number",
            ],
            as_dict=True,
            cache=True,
        )

        if employee:
            return {
                "employee_name": employee.employee_name,
                "employee_id": employee.name,
                "designation": employee.designation,
                "branch": employee.branch,
                "company_email": employee.company_email,
                "cell_number": employee.cell_number,
                "display_name": employee.employee_name,
            }

        user = frappe.db.get_value(
            "User",
            user_id,
            ["full_name", "email"],
            as_dict=True,
            cache=True,
        )

        if user:
            return {
                "employee_name": None,
                "employee_id": None,
                "designation": None,
                "branch": None,
                "company_email": None,
                "cell_number": None,
                "display_name": user.full_name or user.email,
            }

        return {"display_name": user_id}

    except Exception as e:
        frappe.log_error(title="Error in get_approver_details", message=str(e))
        return {"display_name": user_id}


@frappe.whitelist()
def get_employee_info(employee: str) -> Dict[str, Any]:
    """Fetch employee details safely and efficiently."""
    if not employee:
        return {}

    emp_details = frappe.db.get_value(
        "Employee",
        employee,
        ["employee_number", "employee_name", "branch", "department", "designation"],
        as_dict=True,
        cache=True,
    )

    return emp_details or {}


def has_permission(doc: Any, ptype: str, user: str) -> bool:
    """Evaluate permission rules for Agent document."""
    if user == "Administrator":
        return True

    if ptype == "create":
        return False

    return True


@frappe.whitelist()
def update_existing_agent_types() -> Dict[str, Any]:
    """Populate agent_type field for all existing Agent records in the database."""
    frappe.db.sql(
        "UPDATE `tabAgent` SET agent_type = 'RDDSA' WHERE name LIKE 'RDDSA%%' OR agent_code LIKE 'RDDSA%%'"
    )
    frappe.db.sql(
        "UPDATE `tabAgent` SET agent_type = 'DDDSA' WHERE name LIKE 'DDDSA%%' OR agent_code LIKE 'DDDSA%%'"
    )
    frappe.db.commit()
    return {"status": "success", "message": "Updated agent_type for existing records"}


@frappe.whitelist()
def fetch_agent_commission(agent_code: str) -> Dict[str, Any]:
    """
    Scans tabSS and VS Report for the specified agent_code (rm_id).
    Builds and saves structured JSON hierarchy with Year-wise and Month-wise total commission:
    {
        "2026": {
            "total_commission": 1388.50,
            "08": {
                "total_commission": 1388.50,
                "DAM": 353.00,
                "DD SAV": 325.50,
                "RD": 500.00,
                "SMBG": 210.00
            }
        },
        "grand_total_commission": 1388.50
    }
    """
    if not agent_code:
        frappe.throw(_("Agent Code is required."))

    agent_doc_name = frappe.db.get_value(
        "Agent",
        {"agent_code": agent_code},
        "name"
    ) or agent_code

    records = frappe.db.sql("""
        SELECT 
            YEAR(`date`) AS `year`,
            LPAD(MONTH(`date`), 2, '0') AS `month`,
            report_type,
            SUM(CAST(COALESCE(NULLIF(commission, ''), '0') AS DECIMAL(18,2))) AS total_commission
        FROM `tabSS and VS Report`
        WHERE rm_id = %s OR rm_id = %s
        GROUP BY YEAR(`date`), MONTH(`date`), report_type
        ORDER BY `year` DESC, `month` DESC, report_type ASC
    """, (agent_code, agent_doc_name), as_dict=True)

    result = {}
    grand_total = 0.0

    for row in records:
        year_str = str(row["year"])
        month_str = str(row["month"])
        report_type = str(row["report_type"])
        comm_val = float(row["total_commission"] or 0.0)

        if year_str not in result:
            result[year_str] = {
                "total_commission": 0.0
            }
        if month_str not in result[year_str]:
            result[year_str][month_str] = {
                "total_commission": 0.0
            }

        result[year_str][month_str][report_type] = round(comm_val, 2)
        result[year_str][month_str]["total_commission"] = round(result[year_str][month_str]["total_commission"] + comm_val, 2)
        result[year_str]["total_commission"] = round(result[year_str]["total_commission"] + comm_val, 2)
        grand_total = round(grand_total + comm_val, 2)

    result["grand_total_commission"] = grand_total

    commission_json_str = frappe.as_json(result)

    # Superfast Direct MariaDB SQL Update bypassing ORM overhead
    frappe.db.sql(
        "UPDATE `tabAgent` SET commission_json = %s, modified = NOW() WHERE name = %s OR agent_code = %s",
        (commission_json_str, agent_doc_name, agent_code)
    )
    frappe.db.commit()

    return {
        "status": "success",
        "data": result,
        "commission_json": commission_json_str,
        "message": _("Commission JSON generated in superfast mode for Agent {0}").format(agent_code),
    }


@frappe.whitelist()
def bulk_update_agent_commissions() -> Dict[str, Any]:
    """
    Superfast Bulk Update of commission_json for ALL agents in tabAgent.
    1. Single Grouped Raw SQL Scan from tabSS and VS Report for all agents.
    2. Builds structured JSON layers for all agents in memory.
    3. Bulk updates tabAgent using direct SQL.
    """
    records = frappe.db.sql("""
        SELECT 
            rm_id,
            YEAR(`date`) AS `year`,
            LPAD(MONTH(`date`), 2, '0') AS `month`,
            report_type,
            SUM(CAST(COALESCE(NULLIF(commission, ''), '0') AS DECIMAL(18,2))) AS total_commission
        FROM `tabSS and VS Report`
        WHERE rm_id IS NOT NULL AND rm_id != ''
        GROUP BY rm_id, YEAR(`date`), MONTH(`date`), report_type
        ORDER BY rm_id ASC, `year` DESC, `month` DESC, report_type ASC
    """, as_dict=True)

    if not records:
        return {
            "status": "success",
            "message": _("No SS & VS Report records found to calculate commission."),
            "processed": 0
        }

    agent_data = {}

    for row in records:
        rm_id = str(row["rm_id"]).strip()
        year_str = str(row["year"])
        month_str = str(row["month"])
        report_type = str(row["report_type"])
        comm_val = float(row["total_commission"] or 0.0)

        if rm_id not in agent_data:
            agent_data[rm_id] = {"grand_total_commission": 0.0}

        if year_str not in agent_data[rm_id]:
            agent_data[rm_id][year_str] = {"total_commission": 0.0}

        if month_str not in agent_data[rm_id][year_str]:
            agent_data[rm_id][year_str][month_str] = {"total_commission": 0.0}

        agent_data[rm_id][year_str][month_str][report_type] = round(comm_val, 2)
        agent_data[rm_id][year_str][month_str]["total_commission"] = round(
            agent_data[rm_id][year_str][month_str]["total_commission"] + comm_val, 2
        )
        agent_data[rm_id][year_str]["total_commission"] = round(
            agent_data[rm_id][year_str]["total_commission"] + comm_val, 2
        )
        agent_data[rm_id]["grand_total_commission"] = round(
            agent_data[rm_id]["grand_total_commission"] + comm_val, 2
        )

    updated_count = 0
    now_time = now_datetime()

    for rm_id, comm_dict in agent_data.items():
        comm_json_str = frappe.as_json(comm_dict)
        frappe.db.sql("""
            UPDATE `tabAgent`
            SET commission_json = %s, modified = %s
            WHERE name = %s OR agent_code = %s
        """, (comm_json_str, now_time, rm_id, rm_id))
        updated_count += 1

    frappe.db.commit()

    msg = _("Successfully updated commission JSON for {0} agents.").format(updated_count)
    frappe.logger("scheduler").info(msg)
    return {
        "status": "success",
        "processed": updated_count,
        "message": msg
    }