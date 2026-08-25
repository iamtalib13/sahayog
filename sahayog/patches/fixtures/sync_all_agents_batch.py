import frappe
import time
import re
from frappe.utils import now
from sahayog.api.auto_agent_creation import db_connection, convert_date_format
from psycopg2.extras import RealDictCursor

def execute():
    """
    Syncs ALL agents from Finacle in batches of 100 with a cooldown.
    Run via: bench execute sahayog.patches.sync_all_agents_batch.execute
    """
    BATCH_SIZE = 100
    WAIT_TIME = 5  # Changed to 5 seconds for faster processing at night
    
    print(f"[{now()}] Agent UpdateStart")
    
    # 1. Get all Agent Codes from Frappe
    print(f"[{now()}] Fetching all Agent codes from Frappe...")
    all_agents = frappe.get_all("Agent", fields=["name"], order_by="name asc")
    total_agents = len(all_agents)
    print(f"[{now()}] Found {total_agents} agents to process.")

    # 2. Connect to Finacle (External DB)
    count = 0
    updated_count = 0
    error_count = 0

    # Process in chunks
    for i in range(0, total_agents, BATCH_SIZE):
        batch = all_agents[i : i + BATCH_SIZE]
        batch_ids = [a.name for a in batch]
        
        print(f"\n[{now()}] Processing Batch {i//BATCH_SIZE + 1}...")
        
        try:
            conn = db_connection()
            if not conn:
                print("Skipping batch due to DB connection failure.")
                continue
                
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            placeholders = ', '.join(['%s'] * len(batch_ids))
            sql = f"""
            SELECT
                d.lchg_time as agent_start_date,
                d.user_id AS agent_id,
                d.user_role_id AS agent_name,
                d.user_sol_id,
                d.auth_id,
                s.sol_desc
            FROM custom.dsaauth d
            JOIN tbaadm.sol s ON d.user_sol_id = s.sol_id
            WHERE d.user_id IN ({placeholders})
            AND d.ent_cre_flg = 'Y' 
            AND d.del_flg = 'N'
            """
            
            cursor.execute(sql, tuple(batch_ids))
            finacle_data = cursor.fetchall()
            
            # Create map for fast lookup
            finacle_map = {row['agent_id']: row for row in finacle_data}
            
            cursor.close()
            conn.close()

            # Update Frappe Records
            for agent_doc in batch:
                agent_code = agent_doc.name
                if agent_code in finacle_map:
                    row = finacle_map[agent_code]
                    
                    try:
                        agent_start_date = row.get("agent_start_date")
                        creation_date = convert_date_format(agent_start_date)
                        
                        auth_id = row.get("auth_id") or ""
                        auth_str = str(auth_id).strip()
                        employee_raw = (
                            auth_str.upper().replace("SAH0", "")
                            if auth_str.upper().startswith("SAH0")
                            else auth_str
                        )
                        digits = re.sub(r"\D", "", employee_raw).lstrip("0")

                        if digits:
                            employee = digits
                            status = "Allocated"
                        else:
                            employee = None
                            status = "Unallocated"

                        frappe.db.set_value("Agent", agent_code, {
                            "creation_date": creation_date,
                            "agent_name": row.get("agent_name"),
                            "branch_code": row.get("user_sol_id"),
                            "branch_name": row.get("sol_desc") or "Unknown",
                            "auth_id": auth_id,
                            "employee": employee,
                            "status": status
                        }, update_modified=False)
                        
                        # --- PRINT CONFIRMATION FOR EACH AGENT ---
                        print(f"Agent {agent_code} is updated")
                        
                        updated_count += 1
                    except Exception as e:
                        print(f"Error updating {agent_code}: {str(e)}")
                        error_count += 1
                else:
                    # Optional: Print if agent was checked but not found in Finacle to keep track
                    # print(f"Agent {agent_code} not found in Finacle source")
                    pass
            
            frappe.db.commit()
            count += len(batch)
            
            # Cooldown message
            if count < total_agents:
                print(f"Waiting for {WAIT_TIME} seconds...")
                time.sleep(WAIT_TIME)

        except Exception as batch_error:
            frappe.log_error(frappe.get_traceback(), f"Agent Sync Batch Error {i}")
            print(f"CRITICAL BATCH ERROR: {str(batch_error)}")
            time.sleep(WAIT_TIME)

    print(f"\n[{now()}] FINAL STATUS: Processed {count}/{total_agents} agents. Total Updated: {updated_count}")
