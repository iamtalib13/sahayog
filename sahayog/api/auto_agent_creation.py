import frappe
from frappe import _
from psycopg2.extras import RealDictCursor
import psycopg2
from frappe.utils import today, add_days
# from sahayog.api.auto_agent_creation import sync_agents_to_doctype

# Database Connection
def db_connection():
    """
    Connect to external PostgreSQL (Finacle). Uses Finacle Settings single doctype.
    """
    try:
        creds = frappe.get_single("Finacle Settings")
        conn = psycopg2.connect(
            host=creds.host,
            port=creds.port,
            user=creds.user,
            password=creds.get_password("password"),
            database=creds.database_name
        )
        return conn
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PostgreSQL Connection Failed")
        frappe.throw(_("Database Connection Error: {0}").format(str(e)))

# Get Agents by RM Start Date
@frappe.whitelist(allow_guest=False)
def get_agents_by_rm_start_date(start_date=None, end_date=None):
    """
    Fetch agents linked with RM start date from custom.dsaauth & custom.dsamap.
    Returns structured list of dicts:
    RM Start Date, Agent User Id, Agent Name, Branch Code, Branch Name,
    Agent Reportee Id, Employee, ID
    """
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Default to today's date if not provided
        if not start_date:
            start_date = frappe.utils.nowdate()
        if not end_date:
            end_date = start_date

        sql = """
        SELECT
            g.rm_start_date,
            d.user_id AS agent_id,
            d.user_role_id AS agent_name,
            d.user_sol_id,
            d.auth_id,
            d.auth_role_id,
            d.auth_sol_id
        FROM custom.dsaauth d
        JOIN custom.dsamap g ON d.user_id = g.rm_id
        WHERE
            g.entity_cre_flg = 'Y'
            AND g.del_flg = 'N'
            AND d.ent_cre_flg = 'Y'
            AND d.del_flg = 'N'
            AND g.rm_start_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$'
            AND TO_DATE(g.rm_start_date, 'DD-MM-YYYY')
                BETWEEN TO_DATE(%s, 'YYYY-MM-DD')
                    AND TO_DATE(%s, 'YYYY-MM-DD');
        """

        cursor.execute(sql, (start_date, end_date))
        agents = cursor.fetchall()
        cursor.close()
        conn.close()

        branch_mapping = {
            "1003": "Delhi Branch",
            "1024": "Mumbai Branch",
            "1181": "Pune Branch",
            # Add more mappings if needed
        }

        structured_agents = []
        for agent in agents:
            auth_id_raw = agent.get("auth_id", "")
            employee = auth_id_raw.upper().replace("SAH0", "") if auth_id_raw.upper().startswith("SAH0") else auth_id_raw

            structured_agents.append({
                "RM Start Date": agent.get("rm_start_date"),
                "Status": "Allocated",
                "Agent User Id": agent.get("agent_id"),
                "Agent Name": agent.get("agent_name"),
                "Branch Code": agent.get("user_sol_id"),
                "Branch Name": branch_mapping.get(agent.get("user_sol_id"), "Unknown"),
                # "Agent Reportee Id": auth_id_raw,
                "Agent Reportee Id": "",
                "Employee": employee,
                "ID": agent.get("agent_id"),
            })

            # print("Agents fetched:", len(structured_agents))
            # frappe.logger().info(f"Agents fetched: {len(structured_agents)}")


        return {"status": "success", "agents": structured_agents}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Get Agents by RM Start Date Error")
        return {"status": "error", "message": f"Error fetching agents: {str(e)}"}

# Helper to get branch name by code
@frappe.whitelist(allow_guest=True)
def get_branch_by_code(branch_code):
    branch = frappe.db.get_value('Sahayog Branch', branch_code, 'branch')
    return branch

# Sync Agents to Doctype
@frappe.whitelist()
def sync_agents_to_doctype(start_date=None, end_date=None):
    """
    Sync agents (filtered by RM start date) to the Agent Doctype.
    Creates new docs if not exist, updates existing ones.
    """
    api_response_url = get_agents_by_rm_start_date(start_date, end_date)
    api_response = api_response_url.get("agents", [])
    created = 0
    updated = 0
    skipped = 0

    print(f"🔍 Total agents fetched: {len(api_response)}")

    for agent in api_response:
        agent_code = agent.get("ID")
        # Fix: Accept all 'RDDSA...' and 'DDDSA...' codes
        if not (str(agent_code).startswith("RDDSA") or str(agent_code).startswith("DDDSA")):
            skipped += 1
            continue

    # --- baaki aapka purana code as-is ---

        auth_id = agent.get("Agent Reportee Id")
        status = "Allocated" if auth_id else "Unallocated"
        role = agent_code[:2] if agent_code else None

        raw_employee = str(agent.get("Employee") or "").strip()
        import re
        digits = re.sub(r"\D", "", raw_employee)
        employee_cleaned = digits.lstrip("0") if digits else "0"

        branch_code = agent.get("Branch Code")
        branch_name = get_branch_by_code(branch_code) or "undefined"

        data = {
            "status": status,
            "agent_name": agent.get("Agent Name"),
            "branch_code": branch_code,
            "branch_name": branch_name,  # <-- Updated branch name
            "role": role,
            "employee": employee_cleaned,
            "auth_id": auth_id,
            "agent_status": "LIVE",
            "agent_code": agent_code,
            "creation_date": start_date,
        }

        if frappe.db.exists("Agent", agent_code):
            doc = frappe.get_doc("Agent", agent_code)
            for field, value in data.items():
                if value is not None:
                    doc.set(field, value)
            doc.save(ignore_permissions=True)
            print(f"🔄 Updated Agent: {agent_code} (Employee={employee_cleaned})")
            updated += 1
        else:
            doc = frappe.get_doc({"doctype": "Agent", **data})
            doc.insert(ignore_permissions=True)
            print(f"🆕 Created Agent: {agent_code} (Employee={employee_cleaned})")
            created += 1

    frappe.db.commit()

    print("\nSummary:")
    print(f"  ➕ Created: {created}")
    print(f"  🔄 Updated: {updated}")
    print(f"  ⏭️ Skipped: {skipped}")

    return {
        "status": "success",
        # "message": f"{created} agents created, {updated} updated, {skipped} skipped."
        "message": f"{created} agents created"

    }

######################################################################


@frappe.whitelist()
def auto_create_agents_from_scheduler():
    """
    This runs automatically via scheduler.
    Reads `agent_automation_days` from "Sahayog Settings",
    calculates date range, and calls sync_agents_to_doctype().
    """
    try:
        settings = frappe.get_single("Sahayog Settings")

        if not settings.agent_automation_days:
            frappe.log_error("Agent Automation Days not set in Sahayog Settings", "Auto Agent Creation")
            return {"status": "error", "message": "Missing agent_automation_days in settings"}

        end_date = today()
        start_date = add_days(end_date, -int(settings.agent_automation_days))

        frappe.logger().info(f"🔁 Auto agent sync running from {start_date} to {end_date}")

        result = sync_agents_to_doctype(start_date=start_date, end_date=end_date)

        frappe.logger().info(f"✅ Agent sync completed: {result}")
        return {"status": "success", "message": "Auto sync completed", "data": result}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Auto Agent Sync Failed")
        return {"status": "error", "message": str(e)}
    