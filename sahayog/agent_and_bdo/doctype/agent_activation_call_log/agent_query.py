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

    # ── DEBUG BLOCK START ──────────────────────────────────────────────────────

    # 1. Agents excluded by this query (exited=1, docstatus=1)
    excluded = frappe.db.sql(
        """
        SELECT DISTINCT agent
        FROM `tabAgent Activation Call Log`
        WHERE docstatus = 1
          AND exited = 1
          AND agent IS NOT NULL
        """,
        as_dict=True,
    )
    excluded_list = [r.agent for r in excluded]

    # 2. All want_to_exit agents — with every relevant field
    want_to_exit_records = frappe.db.sql(
        """
        SELECT
            name,
            agent,
            trainer,
            docstatus,
            want_to_exit,
            exited,
            wants_to_stay,
            calling_date,
            reply_type
        FROM `tabAgent Activation Call Log`
        WHERE want_to_exit = 1
          AND agent IS NOT NULL
        ORDER BY agent, modified DESC
        """,
        as_dict=True,
    )

    # 3. Final result of this query — agents actually returned
    result_agents = frappe.db.sql(
        """
        SELECT name, agent_name
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
              AND exited = 1
              AND agent IS NOT NULL
        )
        ORDER BY name
        LIMIT 200
        """,
        {"txt": txt or "", "txt_like": f"%{txt}%"},
        as_dict=True,
    )
    result_agent_names = [r.name for r in result_agents]

    # 4. Cross-check: want_to_exit agents jo result mein NAHI hain
    missing_from_result = [
        r for r in want_to_exit_records
        if r.agent not in result_agent_names
    ]

    # 5. Permission query check — kya permission filter agents cut kar raha hai
    from sahayog.agent_and_bdo.doctype.agent.permissions import get_agents_sol_wise
    perm_condition = get_agents_sol_wise(frappe.session.user)

    lines = [
        f"Called by : {frappe.session.user}",
        f"Search txt : '{txt}'",
        f"Permission condition : {perm_condition or '(no restriction — sees all)'}",
        "",
        "═══ EXCLUDED by query (exited=1, docstatus=1) ═══",
    ]
    lines += excluded_list or ["(none)"]

    lines += ["", "═══ ALL want_to_exit=1 records ═══"]
    for r in want_to_exit_records:
        in_result = "✅ IN result" if r.agent in result_agent_names else "❌ NOT in result"
        lines.append(
            f"{in_result} | agent={r.agent} | record={r.name} | "
            f"docstatus={r.docstatus} | exited={r.exited} | "
            f"want_to_exit={r.want_to_exit} | trainer={r.trainer} | "
            f"reply_type={r.reply_type} | calling_date={r.calling_date}"
        )

    if missing_from_result:
        lines += ["", "═══ MISSING from dropdown — possible reasons ═══"]
        for r in missing_from_result:
            reasons = []
            if r.exited == 1 and r.docstatus == 1:
                reasons.append("exited=1 + docstatus=1 → excluded by query")
            if r.docstatus == 2:
                reasons.append("docstatus=2 (cancelled) → agent record may be gone")
            if not reasons:
                reasons.append("NOT excluded by this query — likely cut by permission filter")
            lines.append(f"  agent={r.agent} | record={r.name} | reasons: {'; '.join(reasons)}")
    else:
        lines += ["", "═══ All want_to_exit agents ARE in result ═══"]

    frappe.log_error(
        title="[DEBUG] get_non_exited_agents",
        message="\n".join(lines),
    )

    # ── DEBUG BLOCK END ────────────────────────────────────────────────────────

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
