import frappe


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_non_exited_agents(doctype, txt, searchfield, start, page_len, filters):
    """
    Returns agents that have NOT been marked Exited in any submitted call log.
    Used by set_query in Agent Activation Call Log form.
    """
    return frappe.db.sql(
        """
        SELECT name, agent_name, branch_code
        FROM `tabAgent`
        WHERE (
            %(txt)s = ''
            OR name LIKE %(txt_like)s
            OR agent_name LIKE %(txt_like)s
        )
        AND name NOT IN (
            SELECT agent
            FROM `tabAgent Activation Call Log`
            WHERE docstatus = 1
              AND (exited = 1 OR want_to_exit = 1)
              AND agent IS NOT NULL
        )
        ORDER BY name
        LIMIT %(start)s, %(page_len)s
        """,
        {
            "txt": txt or "",
            "txt_like": f"%{txt}%",
            "start": start,
            "page_len": page_len,
        },
    )
