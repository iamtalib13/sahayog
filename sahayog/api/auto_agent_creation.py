import frappe
from frappe import _
from psycopg2.extras import RealDictCursor
import psycopg2
from frappe.utils import today, add_days
from datetime import datetime, timedelta
import time


def db_connection():
    """Connect to external PostgreSQL (Finacle)."""
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


@frappe.whitelist()
def auto_create_agents_from_scheduler():
    """
    Automatically sync agents based on Sahayog Settings.
    Runs via scheduler.
    """
    try:
        # Get settings
        settings = frappe.get_single("Sahayog Settings")
        if not settings.agent_automation_days:
            frappe.log_error("Agent Automation Days not set", "Auto Agent Creation")
            return {"status": "error", "message": "Missing agent_automation_days"}

        # Calculate date range
        end_date = today()
        start_date = add_days(end_date, -int(settings.agent_automation_days))
        
        frappe.logger().info(f"🔁 Auto agent sync: {start_date} to {end_date}")

        # Fetch and sync agents
        result = fetch_and_sync_agents(start_date, end_date)
        
        frappe.logger().info(f"✅ Sync completed: {result}")
        return result

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Auto Agent Sync Failed")
        return {"status": "error", "message": str(e)}


# def fetch_and_sync_agents(start_date, end_date):
#     """
#     Fetch agents from PostgreSQL and sync to Agent doctype.
#     Creates new agents or updates existing ones.
#     """
#     try:
#         conn = db_connection()
#         cursor = conn.cursor(cursor_factory=RealDictCursor)

#         # Convert dates
#         start_dt = datetime.strptime(start_date, "%Y-%m-%d")
#         end_dt = datetime.strptime(end_date, "%Y-%m-%d")
#         delta = (end_dt - start_dt).days

#         created = 0
#         updated = 0
#         skipped = 0

#         # Loop through each date in range
#         for i in range(delta + 1):
#             current_date = start_dt + timedelta(days=i)
#             current_date_str = current_date.strftime("%d-%m-%Y")

#             # SQL Query
#             sql = """
#             SELECT
#                 d.lchg_time as agent_start_date,
#                 d.user_id AS agent_id,
#                 d.user_role_id AS agent_name,
#                 d.user_sol_id,
#                 d.auth_id,
#                 s.sol_desc
#             FROM custom.dsaauth d
#             JOIN tbaadm.sol s ON d.user_sol_id = s.sol_id
#             WHERE TRIM(d.lchg_time) = %s 
#             AND d.ent_cre_flg = 'Y' 
#             AND d.del_flg = 'N';
#             """

#             cursor.execute(sql, (current_date_str,))
#             agents = cursor.fetchall()

#             # Process each agent
#             for agent in agents:
#                 agent_code = agent.get("agent_id")

#                 # Filter: only RDDSA or DDDSA codes
#                 if not (str(agent_code).startswith("RDDSA") or str(agent_code).startswith("DDDSA")):
#                     skipped += 1
#                     continue

#                 # Get agent_start_date from SQL
#                 agent_start_date = agent.get("agent_start_date")
                
#                 # Convert DD-MM-YYYY to YYYY-MM-DD for Frappe
#                 creation_date = convert_date_format(agent_start_date)

#                 # Check if agent exists
#                 existing_agent = frappe.db.exists("Agent", agent_code)

#                 if existing_agent:
#                     # Update existing agent with SQL date
#                     frappe.db.set_value("Agent", existing_agent, "creation_date", creation_date, update_modified=False)
#                     updated += 1
#                     print(f"🔄 Updated: {agent_code} | Date: {creation_date}")
#                 else:
#                     # Create new agent with SQL date
#                     create_agent(agent, agent_code, creation_date)
#                     created += 1
#                     print(f"🆕 Created: {agent_code} | Date: {creation_date}")

#         cursor.close()
#         conn.close()
#         frappe.db.commit()

#         summary = f"✅ Created: {created} | Updated: {updated} | Skipped: {skipped}"
#         print(summary)

#         return {
#             "status": "success",
#             "message": summary,
#             "created": created,
#             "updated": updated,
#             "skipped": skipped
#         }

#     except Exception as e:
#         frappe.log_error(frappe.get_traceback(), "Fetch and Sync Agents Error")
#         return {"status": "error", "message": str(e)}




def fetch_and_sync_agents(start_date, end_date):
    """
    Fetch agents from PostgreSQL and sync to Agent doctype.
    Creates new agents or updates ALL details for existing ones.
    """
    import re  # Imported here to ensure parsing logic works in the loop
    
    try:
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Convert dates
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        delta = (end_dt - start_dt).days

        created = 0
        updated = 0
        skipped = 0

        # Loop through each date in range
        for i in range(delta + 1):
            current_date = start_dt + timedelta(days=i)
            current_date_str = current_date.strftime("%d-%m-%Y")

            # SQL Query
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
            WHERE TRIM(d.lchg_time) = %s 
            AND d.ent_cre_flg = 'Y' 
            AND d.del_flg = 'N';
            """

            cursor.execute(sql, (current_date_str,))
            agents = cursor.fetchall()

            # Process each agent
            for agent in agents:
                agent_code = agent.get("agent_id")

                # Filter: only RDDSA or DDDSA codes
                if not (str(agent_code).startswith("RDDSA") or str(agent_code).startswith("DDDSA")):
                    skipped += 1
                    continue

                # Get agent_start_date from SQL
                agent_start_date = agent.get("agent_start_date")
                
                # Convert DD-MM-YYYY to YYYY-MM-DD for Frappe
                creation_date = convert_date_format(agent_start_date)

                # --- PREPARE DATA FOR UPDATE/CREATION ---
                # We replicate the parsing logic here so we can use it for updates too
                auth_id = agent.get("auth_id") or ""
                
                # Logic to clean Employee ID (matches your create_agent logic)
                employee_raw = auth_id.upper().replace("SAH0", "") if auth_id.upper().startswith("SAH0") else auth_id
                employee = re.sub(r"\D", "", employee_raw).lstrip("0") or "0"
                
                # Determine status
                status = "Allocated" if auth_id else "Unallocated"
                
                # Prepare value dict
                agent_values = {
                    "creation_date": creation_date,
                    "agent_name": agent.get("agent_name"),
                    "branch_code": agent.get("user_sol_id"),
                    "branch_name": agent.get("sol_desc") or "Unknown",
                    "auth_id": auth_id,
                    "employee": employee,
                    "status": status
                }

                # Check if agent exists
                existing_agent = frappe.db.exists("Agent", agent_code)

                if existing_agent:
                    # UPDATED: Now updates ALL fields, not just creation_date
                    frappe.db.set_value("Agent", existing_agent, agent_values, update_modified=False)
                    updated += 1
                    print(f"🔄 Updated Full Details: {agent_code}")
                else:
                    # Create new agent (Logic remains same, passing original agent dict)
                    create_agent(agent, agent_code, creation_date)
                    created += 1
                    print(f"🆕 Created: {agent_code} | Date: {creation_date}")

        cursor.close()
        conn.close()
        frappe.db.commit()

        summary = f"✅ Created: {created} | Updated: {updated} | Skipped: {skipped}"
        print(summary)

        return {
            "status": "success",
            "message": summary,
            "created": created,
            "updated": updated,
            "skipped": skipped
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Fetch and Sync Agents Error")
        return {"status": "error", "message": str(e)}

def convert_date_format(date_str):
    """
    Convert DD-MM-YYYY to YYYY-MM-DD format for Frappe.
    """
    try:
        if not date_str:
            return today()
        
        # Parse DD-MM-YYYY format
        date_obj = datetime.strptime(date_str.strip(), "%d-%m-%Y")
        # Return in YYYY-MM-DD format
        return date_obj.strftime("%Y-%m-%d")
    except Exception as e:
        frappe.log_error(f"Date conversion error: {date_str} | {str(e)}", "Date Format Error")
        return today()


def create_agent(agent, agent_code, creation_date):
    """Create a new Agent document."""
    import re
    
    # Extract employee ID
    auth_id = agent.get("auth_id") or ""
    employee_raw = auth_id.upper().replace("SAH0", "") if auth_id.upper().startswith("SAH0") else auth_id
    employee = re.sub(r"\D", "", employee_raw).lstrip("0") or "0"

    # Determine status
    status = "Allocated" if auth_id else "Unallocated"
    
    # Extract role
    role = agent_code[:2] if agent_code else None

    # Prepare data
    data = {
        "doctype": "Agent",
        "agent_code": agent_code,
        "agent_name": agent.get("agent_name"),
        "branch_code": agent.get("user_sol_id"),
        "branch_name": agent.get("sol_desc") or "Unknown",
        "role": role,
        "employee": employee,
        "auth_id": auth_id,
        "status": status,
        "agent_status": "LIVE",
        "creation_date": creation_date,  # SQL se aayi hui date
    }

    # Create document
    doc = frappe.get_doc(data)
    doc.insert(ignore_permissions=True)



@frappe.whitelist()
def update_agent_from_finacle(agent_code):
    """
    Fetch and update details for a specific agent from Finacle.
    """
    try:
        # 1. Connect to Finacle
        conn = db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # 2. Query for this specific agent (using agent_code)
        # We look for the latest entry for this agent code
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
        
        cursor.close()
        conn.close()

        if not agent_data:
            return {"status": "error", "message": _("Agent details not found in Finacle for code: {0}").format(agent_code)}

        # 3. Process Data (Same logic as your bulk sync)
        import re
        
        # Date conversion
        agent_start_date = agent_data.get("agent_start_date")
        creation_date = convert_date_format(agent_start_date)

        # Auth ID and Employee parsing
        auth_id = agent_data.get("auth_id") or ""
        employee_raw = auth_id.upper().replace("SAH0", "") if auth_id.upper().startswith("SAH0") else auth_id
        employee = re.sub(r"\D", "", employee_raw).lstrip("0") or "0"
        
        # Determine status
        status = "Allocated" if auth_id else "Unallocated"
        
        # Prepare value dict
        agent_values = {
            "creation_date": creation_date,
            "agent_name": agent_data.get("agent_name"),
            "branch_code": agent_data.get("user_sol_id"),
            "branch_name": agent_data.get("sol_desc") or "Unknown",
            "auth_id": auth_id,
            "employee": employee,
            "status": status
        }

        # 4. Update the Agent Document
        # We use the existing doc to ensure we update the record currently open
        doc = frappe.get_doc("Agent", agent_code)
        doc.update(agent_values)
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success", 
            "message": _("Agent details successfully updated from Finacle."),
            "data": agent_values
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Single Agent Update Failed: {agent_code}")
        return {"status": "error", "message": str(e)}




# Update ALL agents daily - This will be scheduled in the hooks.py
def daily_agent_update_job():
    """
    Manager job: Splits agents into batches and enqueues them.
    This prevents any single process from locking the DB for too long.
    """
    # 1. Get all agents
    agents = frappe.get_all("Agent", fields=["name"], order_by="name asc")
    agent_names = [a.name for a in agents]
    
    # 2. Define batch size (500 is safe for production)
    batch_size = 500
    total_batches = 0
    
    # 3. Split into batches and enqueue
    for i in range(0, len(agent_names), batch_size):
        batch = agent_names[i:i + batch_size]
        
        # Enqueue each batch as an independent job in the 'long' queue
        # Each job gets its own database transaction
        frappe.enqueue(
            "sahayog.api.auto_agent_creation.process_agent_batch",
            queue="long",
            batch=batch,
            batch_num=total_batches + 1,
            timeout=2000 # 33 minutes per batch
        )
        total_batches += 1
        
        # Optional: Print progress to terminal if running manually
        print(f"Enqueued Batch {total_batches} ({len(batch)} agents)")

    print(f"✅ All {total_batches} batches enqueued to background workers.")


def process_agent_batch(batch, batch_num):
    """
    Worker job: Processes a specific batch of agents.
    """
    print(f"🚀 Starting Batch {batch_num}: Processing {len(batch)} agents...")
    
    success = 0
    fail = 0
    
    for agent_id in batch:
        try:
            # CALL YOUR ORIGINAL METHOD (No changes needed to it)
            result = update_agent_from_finacle(agent_id)
            
            if result.get("status") == "success":
                success += 1
            else:
                fail += 1
                # Log failures but keep going
                frappe.log_error(f"Batch {batch_num} Fail: {agent_id}", "Agent Sync")
            
            # Commit after EVERY agent to ensure row-locks are released
            frappe.db.commit()

        except Exception:
            frappe.db.rollback()
            fail += 1
            frappe.log_error(frappe.get_traceback(), f"Batch {batch_num} Critical Error: {agent_id}")

    print(f"✅ Batch {batch_num} Finished. Success: {success}, Fail: {fail}")


