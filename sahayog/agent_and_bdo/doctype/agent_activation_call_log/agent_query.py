import frappe


def get_trainer_filter(alias="acl"):
    """Return SQL condition so Trainer sees only their own records.
    Trainer Head / System Manager / Administrator sees all."""
    user = frappe.session.user
    roles = frappe.get_roles(user)

    if "Administrator" in roles or "System Manager" in roles or "Trainer Head" in roles:
        return ""

    if "Trainer" in roles:
        return f"AND {alias}.trainer = {frappe.db.escape(user)}"

    return ""


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_non_exited_agents(doctype, txt, searchfield, start, page_len, filters):
    """
    Returns agents that have NOT been marked Exited in any submitted call log.
    Agents marked "Want to Exit" are still shown — only fully Exited ones are hidden.
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
              AND (exited = 1)
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


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_agents_of_other_trainers(doctype, txt, searchfield, start, page_len, filters):
    """Returns agents that have active (non-exited) call logs with trainers other
    than the current user. Used by the Reassign Agent dialog."""
    user = frappe.session.user
    return frappe.db.sql(
        """
        SELECT DISTINCT a.name, a.agent_name, a.branch_code
        FROM `tabAgent` a
        INNER JOIN `tabAgent Activation Call Log` acl ON acl.agent = a.name
        WHERE acl.docstatus < 2
          AND acl.exited = 0
          AND acl.trainer != %(user)s
          AND acl.trainer IS NOT NULL
          AND (
              %(txt)s = ''
              OR a.name LIKE %(txt_like)s
              OR a.agent_name LIKE %(txt_like)s
          )
        ORDER BY a.name
        LIMIT %(start)s, %(page_len)s
        """,
        {
            "user": user,
            "txt": txt or "",
            "txt_like": f"%{txt}%",
            "start": start,
            "page_len": page_len,
        },
    )
