import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional

import psycopg2
from psycopg2.extras import RealDictCursor

import frappe
from frappe import _
from frappe.utils import add_days, now_datetime, today

logger = frappe.logger("auto_agent_creation")


def db_connection():
    """Connect to external PostgreSQL (Finacle)."""
    try:
        creds = frappe.get_single("Finacle Settings")
        conn = psycopg2.connect(
            host=creds.host,
            port=creds.port,
            user=creds.user,
            password=creds.get_password("password"),
            database=creds.database_name,
        )
        return conn
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PostgreSQL Connection Failed")
        frappe.throw(_("Database Connection Error: {0}").format(str(e)))


@frappe.whitelist()
def auto_create_agents_from_scheduler() -> Dict[str, Any]:
    """
    Automatically sync overall agents from Finacle.
    Runs via scheduler or manual call.
    """
    try:
        logger.info("🔁 Auto agent overall sync started")
        result = sync_all_agents_overall()
        logger.info(f"✅ Sync completed: {result}")
        return result
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Auto Agent Sync Failed")
        return {"status": "error", "message": str(e)}


@frappe.whitelist()
def enqueue_agent_sync() -> Dict[str, Any]:
    """
    Directly execute overall agent sync synchronously for immediate response.
    """
    return sync_all_agents_overall()


def execute_bulk_upsert(records: list, chunk_size: int = 5000) -> None:
    """
    Direct DB-to-DB bulk UPSERT into tabAgent table without ORM overhead.
    Executes native SQL ON DUPLICATE KEY UPDATE in MariaDB (or ON CONFLICT DO UPDATE in Postgres).
    """
    if not records:
        return

    db_type = getattr(frappe.db, "db_type", "mariadb")
    row_placeholder = "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"

    for i in range(0, len(records), chunk_size):
        chunk = records[i : i + chunk_size]
        placeholders = ", ".join([row_placeholder] * len(chunk))
        flattened_params = [val for row in chunk for val in row]

        if db_type == "mariadb":
            sql = f"""
            INSERT INTO `tabAgent` (
                `name`, `creation`, `modified`, `modified_by`, `owner`, `docstatus`, `idx`,
                `agent_code`, `agent_name`, `branch_code`, `branch_name`, `role`,
                `auth_id`, `employee`, `status`, `agent_type`, `creation_date`
            ) VALUES {placeholders}
            ON DUPLICATE KEY UPDATE
                `modified` = VALUES(`modified`),
                `modified_by` = VALUES(`modified_by`),
                `agent_name` = VALUES(`agent_name`),
                `branch_code` = VALUES(`branch_code`),
                `branch_name` = VALUES(`branch_name`),
                `role` = VALUES(`role`),
                `auth_id` = VALUES(`auth_id`),
                `employee` = VALUES(`employee`),
                `status` = VALUES(`status`),
                `agent_type` = VALUES(`agent_type`),
                `creation_date` = VALUES(`creation_date`);
            """
            frappe.db.sql(sql, flattened_params)
        else:
            sql = f"""
            INSERT INTO "tabAgent" (
                "name", "creation", "modified", "modified_by", "owner", "docstatus", "idx",
                "agent_code", "agent_name", "branch_code", "branch_name", "role",
                "auth_id", "employee", "status", "agent_type", "creation_date"
            ) VALUES {placeholders}
            ON CONFLICT ("name") DO UPDATE SET
                "modified" = EXCLUDED."modified",
                "modified_by" = EXCLUDED."modified_by",
                "agent_name" = EXCLUDED."agent_name",
                "branch_code" = EXCLUDED."branch_code",
                "branch_name" = EXCLUDED."branch_name",
                "role" = EXCLUDED."role",
                "auth_id" = EXCLUDED."auth_id",
                "employee" = EXCLUDED."employee",
                "status" = EXCLUDED."status",
                "agent_type" = EXCLUDED."agent_type",
                "creation_date" = EXCLUDED."creation_date";
            """
            frappe.db.sql(sql, flattened_params)


@frappe.whitelist()
def sync_all_agents_overall(user: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch ALL active agents from PostgreSQL Finacle and sync to MariaDB tabAgent via direct raw SQL upsert.
    Bypasses in-memory GET queries for superfast DB-to-DB sync.
    """
    conn = None
    cursor = None
    target_user = user or getattr(frappe.session, "user", None)
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Query to fetch ALL active agents from Finacle (Filter RDDSA and DDDSA directly in PostgreSQL for maximum speed)
        sql = """
        SELECT
            d.lchg_time as agent_start_date,
            d.user_id AS agent_id,
            d.user_role_id AS agent_name,
            d.user_sol_id,
            d.auth_id,
            s.sol_desc
        FROM custom.dsaauth d
        JOIN tbaadm.sol s ON d.user_sol_id = s.sol_id
        WHERE d.ent_cre_flg = 'Y' 
        AND d.del_flg = 'N'
        AND (d.user_id LIKE 'RDDSA%' OR d.user_id LIKE 'DDDSA%');
        """

        cursor.execute(sql)
        agents = cursor.fetchall()

        if not agents:
            logger.info("No agents found in Finacle.")
            return {"status": "success", "message": "No agents found", "processed": 0, "skipped": 0}

        total_agents = len(agents)
        now_str = now_datetime()
        session_user = (
            frappe.session.user
            if getattr(frappe, "session", None) and getattr(frappe.session, "user", None)
            else "Administrator"
        )

        records_to_upsert = []
        skipped = 0

        frappe.publish_progress(
            percent=20,
            title=_("Processing Finacle Agents..."),
            description=_("Formatting {0} records for direct DB upsert").format(total_agents),
        )

        for agent in agents:
            agent_code = agent.get("agent_id")

            # Filter: only RDDSA or DDDSA codes
            if not (
                agent_code
                and (
                    str(agent_code).startswith("RDDSA")
                    or str(agent_code).startswith("DDDSA")
                )
            ):
                skipped += 1
                continue

            agent_values = prepare_agent_data(agent)
            role = agent_code[:2] if agent_code else None

            records_to_upsert.append(
                (
                    agent_code,  # name
                    now_str,  # creation
                    now_str,  # modified
                    session_user,  # modified_by
                    session_user,  # owner
                    0,  # docstatus
                    0,  # idx
                    agent_code,  # agent_code
                    agent_values["agent_name"],
                    agent_values["branch_code"],
                    agent_values["branch_name"],
                    role,  # role
                    agent_values["auth_id"],
                    agent_values["employee"],
                    agent_values["status"],
                    agent_values.get("agent_type"),
                    agent_values["creation_date"],
                )
            )

        processed_count = len(records_to_upsert)

        if records_to_upsert:
            frappe.publish_progress(
                percent=60,
                title=_("Direct MariaDB Upsert in Progress..."),
                description=_("Upserting {0} agents directly into MariaDB...").format(processed_count),
            )
            execute_bulk_upsert(records_to_upsert, chunk_size=5000)

        frappe.db.commit()

        frappe.publish_progress(
            percent=100,
            title=_("Agent Sync Finished"),
            description=_("Direct DB-to-DB Sync completed successfully!"),
        )

        summary = f"⚡ Direct DB Sync Completed! Processed: {processed_count} | Skipped: {skipped}"
        logger.info(summary)

        if target_user:
            frappe.publish_realtime(
                "msgprint",
                {
                    "title": _("Agent Sync Completed"),
                    "message": summary,
                    "indicator": "green",
                },
                user=target_user,
            )

        return {
            "status": "success",
            "message": summary,
            "processed": processed_count,
            "skipped": skipped,
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Overall Agent Sync Error")
        return {"status": "error", "message": str(e)}
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def convert_date_format(val: Any) -> str:
    """
    Convert datetime, date, or date string (%Y-%m-%d or %d-%m-%Y) to YYYY-MM-DD string for Frappe.
    No DB error logging to ensure maximum performance.
    """
    if not val:
        return today()
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")

    val_str = str(val).strip()
    if not val_str:
        return today()

    # Extract date portion if time included (e.g. '2025-06-02 13:33:21')
    date_part = val_str.split()[0]

    # Standard YYYY-MM-DD
    if len(date_part) == 10 and date_part[4] == "-" and date_part[7] == "-":
        return date_part

    # Try DD-MM-YYYY
    try:
        return datetime.strptime(date_part, "%d-%m-%Y").strftime("%Y-%m-%d")
    except Exception:
        pass

    # Fallback to today
    return today()


def prepare_agent_data(agent: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract and transform raw agent data from Finacle DB row into standard Frappe fields dictionary.

    Args:
        agent: Dictionary containing raw agent details fetched from Finacle DB.

    Returns:
        Dict containing mapped Frappe Agent field values.
    """
    agent = agent or {}
    auth_id = agent.get("auth_id") or ""

    # Clean Employee ID
    employee_raw = auth_id.upper().replace("SAH0", "") if auth_id.upper().startswith("SAH0") else auth_id
    employee = re.sub(r"\D", "", employee_raw).lstrip("0") or "0"

    # Determine status
    status = "Allocated" if auth_id else "Unallocated"

    # Date conversion
    creation_date = convert_date_format(agent.get("agent_start_date"))

    # Determine agent_type based on agent_id prefix
    agent_code_str = str(agent.get("agent_id") or "").upper()
    agent_type = None
    if agent_code_str.startswith("RDDSA"):
        agent_type = "RDDSA"
    elif agent_code_str.startswith("DDDSA"):
        agent_type = "DDDSA"

    return {
        "creation_date": creation_date,
        "agent_name": agent.get("agent_name"),
        "branch_code": agent.get("user_sol_id"),
        "branch_name": agent.get("sol_desc") or "Unknown",
        "auth_id": auth_id,
        "employee": employee,
        "status": status,
        "agent_type": agent_type,
    }


def fetch_and_sync_agents(start_date: str, end_date: str) -> Dict[str, Any]:
    """
    Fetch agents from PostgreSQL and sync to Agent doctype.
    Optimized for super fast bulk processing:
    1. Single PostgreSQL query for the entire date range.
    2. In-memory set lookup for existing Frappe Agent records.
    """
    conn = None
    cursor = None
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Convert dates & build date list for bulk IN query
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        delta = (end_dt - start_dt).days

        date_list = [(start_dt + timedelta(days=i)).strftime("%d-%m-%Y") for i in range(delta + 1)]
        if not date_list:
            return {"status": "success", "message": "No dates to sync", "created": 0, "updated": 0, "skipped": 0}

        created = 0
        updated = 0
        skipped = 0

        # Bulk SQL Query for all dates in range in 1 DB call (Filter RDDSA and DDDSA directly in PostgreSQL)
        sql = """
        SELECT
            d.lchg_time as agent_start_date,
            d.user_id AS agent_id,
            d.user_role_id AS agent_name,
            d.user_sol_id,
            d.auth_id,
            s.sol_desc
        FROM custom.dsaauth d
        JOIN tbaadm.sol s ON d.user_sol_id = s.sol_id
        WHERE TRIM(d.lchg_time) IN %s 
        AND d.ent_cre_flg = 'Y' 
        AND d.del_flg = 'N'
        AND (d.user_id LIKE 'RDDSA%' OR d.user_id LIKE 'DDDSA%');
        """

        cursor.execute(sql, (tuple(date_list),))
        agents = cursor.fetchall()

        if not agents:
            logger.info("No agents found in Finacle for the given date range.")
            return {"status": "success", "message": "No agents found", "created": 0, "updated": 0, "skipped": 0}

        now_str = now_datetime()
        session_user = (
            frappe.session.user
            if getattr(frappe, "session", None) and getattr(frappe.session, "user", None)
            else "Administrator"
        )

        records_to_upsert = []
        skipped = 0

        # Process each agent
        for agent in agents:
            agent_code = agent.get("agent_id")

            # Filter: only RDDSA or DDDSA codes
            if not (
                agent_code
                and (
                    str(agent_code).startswith("RDDSA")
                    or str(agent_code).startswith("DDDSA")
                )
            ):
                skipped += 1
                continue

            agent_values = prepare_agent_data(agent)
            role = agent_code[:2] if agent_code else None

            records_to_upsert.append(
                (
                    agent_code,  # name
                    now_str,  # creation
                    now_str,  # modified
                    session_user,  # modified_by
                    session_user,  # owner
                    0,  # docstatus
                    0,  # idx
                    agent_code,  # agent_code
                    agent_values["agent_name"],
                    agent_values["branch_code"],
                    agent_values["branch_name"],
                    role,  # role
                    agent_values["auth_id"],
                    agent_values["employee"],
                    agent_values["status"],
                    agent_values.get("agent_type"),
                    agent_values["creation_date"],
                )
            )

        processed_count = len(records_to_upsert)

        if records_to_upsert:
            execute_bulk_upsert(records_to_upsert, chunk_size=5000)

        frappe.db.commit()

        summary = f"⚡ Direct DB Sync Completed! Processed: {processed_count} | Skipped: {skipped}"
        logger.info(summary)

        return {
            "status": "success",
            "message": summary,
            "processed": processed_count,
            "skipped": skipped,
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Fetch and Sync Agents Error")
        return {"status": "error", "message": str(e)}
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def create_agent(agent: Dict[str, Any], agent_code: str, creation_date: Optional[str] = None) -> None:
    """Create a new Agent document."""
    agent_data = prepare_agent_data(agent)

    # Extract role
    role = agent_code[:2] if agent_code else None

    # Prepare data
    data = {
        "doctype": "Agent",
        "agent_code": agent_code,
        "agent_name": agent_data["agent_name"],
        "branch_code": agent_data["branch_code"],
        "branch_name": agent_data["branch_name"],
        "role": role,
        "employee": agent_data["employee"],
        "auth_id": agent_data["auth_id"],
        "status": agent_data["status"],
        "agent_type": agent_data.get("agent_type"),
        "creation_date": creation_date or agent_data["creation_date"],
    }

    # Create document
    doc = frappe.get_doc(data)
    doc.insert(ignore_permissions=True)


@frappe.whitelist()
def update_agent_from_finacle(agent_code: str) -> Dict[str, Any]:
    """
    Fetch and update details for a specific agent from Finacle.
    """
    conn = None
    cursor = None
    try:
        # 1. Connect to Finacle
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # 2. Query for this specific agent (using agent_code)
        sql = """
        SELECT
            d.lchg_time as agent_start_date,
            d.user_id AS agent_id,
            d.user_role_id AS agent_name,
            d.user_sol_id,
            d.auth_id,
            s.sol_desc
        FROM custom.dsaauth d
        JOIN tbaadm.sol s ON d.user_sol_id = s.sol_id
        WHERE d.user_id = %s
        AND d.ent_cre_flg = 'Y' 
        AND d.del_flg = 'N'
        ORDER BY d.lchg_time DESC
        LIMIT 1;
        """

        cursor.execute(sql, (agent_code,))
        agent_data = cursor.fetchone()

        if not agent_data:
            return {"status": "error", "message": _("Agent details not found in Finacle for code: {0}").format(agent_code)}

        # 3. Process Data
        agent_values = prepare_agent_data(agent_data)

        # 4. Update the Agent Document
        doc = frappe.get_doc("Agent", agent_code)
        doc.update(agent_values)
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success",
            "message": _("Agent details successfully updated from Finacle."),
            "data": agent_values,
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Single Agent Update Failed: {agent_code}")
        return {"status": "error", "message": str(e)}
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass
