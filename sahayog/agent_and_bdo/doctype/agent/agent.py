# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

from frappe.utils.xlsxutils import (
    read_xlsx_file_from_attached_file,
)
from openpyxl import load_workbook
import io
import re
from typing import Any, Dict, List, Optional, Union

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, getdate, nowdate, add_months


class Agent(Document):
    """
    Controller for Agent DocType.
    Manages agent metadata, commission scanning, and active/inactive status lifecycle.
    Note: Allocation and Unallocation workflows are disabled.
    """

    def validate(self) -> None:
        """Validate agent state before saving."""
        self.set_agent_type_from_code()

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

    def set_employee_from_auth_id(self) -> None:
        """Extract employee number from auth_id and update status accordingly."""
        if not self.auth_id:
            self.employee = None
            self.status = "Unallocated"
            return

        auth_str = str(self.auth_id).strip()
        employee_raw = (
            auth_str.upper().replace("SAH0", "")
            if auth_str.upper().startswith("SAH0")
            else auth_str
        )
        digits = re.sub(r"\D", "", employee_raw).lstrip("0")

        if digits:
            self.employee = digits
            self.status = "Allocated"
        else:
            self.employee = None
            self.status = "Unallocated"

    @frappe.whitelist()
    def approve_allocation(self) -> Dict[str, Union[bool, str]]:
        """Disabled method."""
        frappe.throw(
            _("Allocation and Unallocation functionality has been disabled."))

    @frappe.whitelist()
    def reject_allocation(self) -> Dict[str, Union[bool, str]]:
        """Disabled method."""
        frappe.throw(
            _("Allocation and Unallocation functionality has been disabled."))

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
        """Disabled method."""
        frappe.throw(
            _("Allocation and Unallocation functionality has been disabled."))

    @frappe.whitelist()
    def allocation_request(
        self, approver_user_id: Optional[str] = None
    ) -> Dict[str, Union[bool, str]]:
        """Disabled method."""
        frappe.throw(
            _("Allocation and Unallocation functionality has been disabled."))


@frappe.whitelist()
def bulk_unallocate(
    agent_names: Union[List[str], str, None] = None
) -> Dict[str, Any]:
    """Disabled method."""
    frappe.throw(
        _("Allocation and Unallocation functionality has been disabled."))


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
            fields=["name", "employee_name",
                    "user_id", "designation", "sol_id"],
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
    """Fetch employee details safely and efficiently from Employee DocType."""
    if not employee:
        return {}

    emp_details = frappe.db.get_value(
        "Employee",
        employee,
        [
            "name",
            "employee_name",
            "branch",
            "department",
            "designation",
            "company_email",
            "cell_number",
        ],
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


def evaluate_agent_status_from_json(comm_dict: dict) -> str:
    """
    Evaluates agent_status ('Active' vs 'Inactive') based on commission in the Current Month + Last 3 Months (4-month window).
    If total commission in these 4 months > 0: returns 'Active', else returns 'Inactive'.
    """
    if not comm_dict:
        return "Inactive"

    today = getdate(nowdate())
    recent_4_months = []
    for i in range(4):
        dt = add_months(today, -i)
        year_str = str(dt.year)
        month_str = str(dt.month).zfill(2)
        recent_4_months.append((year_str, month_str))

    total_recent_commission = 0.0
    for yr, mth in recent_4_months:
        if yr in comm_dict and isinstance(comm_dict[yr], dict):
            if mth in comm_dict[yr] and isinstance(comm_dict[yr][mth], dict):
                mth_comm = float(comm_dict[yr][mth].get(
                    "total_commission", 0.0) or 0.0)
                total_recent_commission += mth_comm

    return "Active" if total_recent_commission > 0 else "Inactive"


@frappe.whitelist()
def fetch_agent_commission(agent_code: str) -> Dict[str, Any]:
    """
    Scans tabSS and VS Report for the specified agent_code (rm_id).
    Builds and saves structured JSON hierarchy with Year-wise and Month-wise total commission,
    and updates agent_status (Active / Inactive) based on 4-month commission window.
    Skips update if current agent_status in DB is 'Closed'.
    """
    if not agent_code:
        frappe.throw(_("Agent Code is required."))

    agent_doc_name = frappe.db.get_value(
        "Agent",
        {"agent_code": agent_code},
        "name"
    ) or agent_code

    # Fetch current agent_status from DB
    current_agent_status = frappe.db.get_value(
        "Agent", agent_doc_name, "agent_status")

    # If already Closed, skip commission & status update
    if current_agent_status == "Closed":
        return {
            "status": "skipped",
            "message": _("Agent {0} is Closed. Commission JSON & status update skipped.").format(agent_code),
        }

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
        result[year_str][month_str]["total_commission"] = round(
            result[year_str][month_str]["total_commission"] + comm_val, 2
        )
        result[year_str]["total_commission"] = round(
            result[year_str]["total_commission"] + comm_val, 2
        )
        grand_total = round(grand_total + comm_val, 2)

    result["grand_total_commission"] = grand_total

    agent_status = evaluate_agent_status_from_json(result)
    commission_json_str = frappe.as_json(result)

    # Direct MariaDB SQL Update of commission_json and agent_status
    frappe.db.sql(
        """
        UPDATE `tabAgent` 
        SET commission_json = %s, agent_status = %s, modified = NOW() 
        WHERE name = %s OR agent_code = %s
        """,
        (commission_json_str, agent_status, agent_doc_name, agent_code)
    )
    frappe.db.commit()

    return {
        "status": "success",
        "data": result,
        "agent_status": agent_status,
        "commission_json": commission_json_str,
        "message": _("Commission JSON & Status ({0}) updated for Agent {1}").format(
            agent_status, agent_code
        ),
    }


@frappe.whitelist()
def bulk_update_agent_commissions() -> Dict[str, Any]:
    """
    Bulk Update of commission_json and agent_status for ALL agents in tabAgent.
    1. Single Grouped Raw SQL Scan from tabSS and VS Report for all agents.
    2. Evaluates agent_status (Active / Inactive) for 4-month window (current + 3 prior months).
    3. Skips agents whose current agent_status = 'Closed'.
    4. Bulk updates tabAgent using direct SQL for non-Closed agents.
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

        agent_data[rm_id][year_str][month_str][report_type] = round(
            comm_val, 2)
        agent_data[rm_id][year_str][month_str]["total_commission"] = round(
            agent_data[rm_id][year_str][month_str]["total_commission"] + comm_val, 2
        )
        agent_data[rm_id][year_str]["total_commission"] = round(
            agent_data[rm_id][year_str]["total_commission"] + comm_val, 2
        )
        agent_data[rm_id]["grand_total_commission"] = round(
            agent_data[rm_id]["grand_total_commission"] + comm_val, 2
        )

    # Fetch all agents with their current agent_status
    all_agents = frappe.db.sql("""
        SELECT name, agent_status
        FROM `tabAgent`
        WHERE docstatus < 2
    """, as_dict=True)

    now_time = now_datetime()
    active_count = 0
    inactive_count = 0
    skipped_count = 0

    for agent_row in all_agents:
        agent_name = agent_row["name"]
        current_status = agent_row["agent_status"]

        # Skip if agent is Closed
        if current_status == "Closed":
            skipped_count += 1
            continue

        comm_dict = agent_data.get(agent_name, {})
        agent_status = evaluate_agent_status_from_json(comm_dict)
        comm_json_str = frappe.as_json(comm_dict) if comm_dict else None

        if agent_status == "Active":
            active_count += 1
        else:
            inactive_count += 1

        frappe.db.sql("""
            UPDATE `tabAgent`
            SET commission_json = %s, agent_status = %s, modified = %s
            WHERE name = %s OR agent_code = %s
        """, (comm_json_str, agent_status, now_time, agent_name, agent_name))

    frappe.db.commit()

    msg = _(
        "Successfully updated commission JSON & status for {0} agents "
        "({1} Active, {2} Inactive, {3} Closed skipped)."
    ).format(len(all_agents), active_count, inactive_count, skipped_count)

    frappe.logger("scheduler").info(msg)

    return {
        "status": "success",
        "processed": active_count + inactive_count,
        "skipped_closed": skipped_count,
        "active_count": active_count,
        "inactive_count": inactive_count,
        "message": msg,
    }


@frappe.whitelist()
def bulk_update_pan_and_employee_status(file_url: str) -> Dict[str, Any]:
    """
    Bulk update PAN, PAN Status and Employee Status in Agent records from an Excel file.

    Expected Excel headers:
    - Agent Code / agent_code
    - PAN / pan_card
    - PAN Status / pan_status
    - Employee Status / employee_status

    Employee Status must be Yes or No.
    """
    if not file_url:
        frappe.throw(_("File URL is required."))

    file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")

    if not file_name:
        frappe.throw(_("Uploaded file not found."))

    file_doc = frappe.get_doc("File", file_name)
    file_content = file_doc.get_content()

    if not file_content:
        frappe.throw(_("Uploaded file is empty."))

    try:
        all_rows = read_xlsx_file_from_attached_file(fcontent=file_content)
    except Exception:
        frappe.throw(
            _("Invalid Excel file. Please upload a valid .xlsx file."))

    if not all_rows:
        frappe.throw(_("Excel file is empty."))

    headers = all_rows[0]
    rows = all_rows[1:]

    header_map = get_excel_header_map(headers)

    required_fields = ["agent_code", "pan_card",
                       "pan_status", "employee_status"]
    missing_fields = [
        field for field in required_fields if field not in header_map]

    if missing_fields:
        frappe.throw(
            _("Missing required Excel column(s): {0}").format(
                ", ".join(missing_fields)
            )
        )

    valid_updates = []
    errors = []
    row_number = 1

    for row in rows:
        row_number += 1

        if not row or all(value in (None, "") for value in row):
            continue

        agent_code = clean_excel_value(row[header_map["agent_code"]])
        pan_card = clean_excel_value(row[header_map["pan_card"]])
        pan_status = clean_excel_value(row[header_map["pan_status"]])
        employee_status = clean_excel_value(row[header_map["employee_status"]])

        if not agent_code:
            errors.append(
                _("Row {0}: Agent Code is required.").format(row_number))
            continue

        if not pan_card:
            errors.append(
                _("Row {0}: PAN is required for Agent {1}.").format(
                    row_number, agent_code)
            )
            continue

        if not pan_status:
            errors.append(
                _("Row {0}: PAN Status is required for Agent {1}.").format(
                    row_number, agent_code
                )
            )
            continue

        if employee_status not in ("Yes", "No"):
            errors.append(
                _("Row {0}: Employee Status must be Yes or No for Agent {1}.").format(
                    row_number, agent_code
                )
            )
            continue

        valid_updates.append(
            {
                "agent_code": agent_code,
                "pan_card": pan_card,
                "pan_status": pan_status,
                "employee_status": employee_status,
            }
        )

    if not valid_updates:
        return {
            "status": "failed",
            "message": _("No valid rows found in the Excel file."),
            "errors": errors,
        }

    agent_codes = [row["agent_code"] for row in valid_updates]

    existing_agents = frappe.db.get_all(
        "Agent",
        filters={"agent_code": ["in", agent_codes]},
        fields=["name", "agent_code"],
        as_list=True,
    )

    existing_agent_map = {
        agent_code: agent_name for agent_name, agent_code in existing_agents
    }

    updated_count = 0
    not_found_count = 0
    now_time = now_datetime()

    for row in valid_updates:
        agent_code = row["agent_code"]
        agent_name = existing_agent_map.get(agent_code)

        if not agent_name:
            not_found_count += 1
            errors.append(
                _("Agent Code {0} not found in Agent records.").format(
                    agent_code)
            )
            continue

        frappe.db.sql(
            """
            UPDATE `tabAgent`
            SET
                pan_card = %s,
                pan_status = %s,
                employee_status = %s,
                modified = %s
            WHERE name = %s
            """,
            (
                row["pan_card"],
                row["pan_status"],
                row["employee_status"],
                now_time,
                agent_name,
            ),
        )

        updated_count += 1

    frappe.db.commit()

    message = _(
        "Updated {0} Agent record(s). Not found: {1}. Invalid/missing rows: {2}."
    ).format(updated_count, not_found_count, len(errors))

    frappe.logger("agent_pan_update").info(message)

    return {
        "status": "success",
        "updated": updated_count,
        "not_found": not_found_count,
        "invalid_rows": len(errors),
        "errors": errors,
        "message": message,
    }


def get_excel_header_map(headers) -> Dict[str, int]:
    """
    Create normalized Excel header-to-column-index mapping.

    Supports both display headers and fieldname headers:
    Agent Code / agent_code
    PAN / pan_card
    PAN Status / pan_status
    Employee Status / employee_status
    """
    header_aliases = {
        "agent code": "agent_code",
        "agent_code": "agent_code",
        "pan": "pan_card",
        "pan card": "pan_card",
        "pan_card": "pan_card",
        "pan status": "pan_status",
        "pan_status": "pan_status",
        "employee status": "employee_status",
        "employee_status": "employee_status",
    }

    header_map = {}

    for index, header in enumerate(headers):
        if header is None:
            continue

        normalized_header = str(header).strip().lower()

        if normalized_header in header_aliases:
            fieldname = header_aliases[normalized_header]

            if fieldname not in header_map:
                header_map[fieldname] = index

    return header_map


def clean_excel_value(value) -> str:
    """Normalize Excel cell value into a clean string."""
    if value is None:
        return ""

    if isinstance(value, float) and value.is_integer():
        value = int(value)

    return str(value).strip()
