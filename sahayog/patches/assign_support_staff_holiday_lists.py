import frappe

# District (Sahayog Branch.district) -> State. Used only when Sahayog Branch.state
# is not yet populated from Finacle.
DISTRICT_STATE = {
    # Maharashtra
    "AHMEDNAGAR": "MAHARASHTRA", "AKOLA": "MAHARASHTRA", "AMRAVATI": "MAHARASHTRA",
    "AURANGABAD": "MAHARASHTRA", "BEED": "MAHARASHTRA", "BHANDARA": "MAHARASHTRA",
    "BULDHANA": "MAHARASHTRA", "CHANDRAPUR": "MAHARASHTRA", "DHARASHIV": "MAHARASHTRA",
    "DHULE": "MAHARASHTRA", "GADCHIROLI": "MAHARASHTRA", "GONDIA": "MAHARASHTRA",
    "GONDIA-HO": "MAHARASHTRA", "HINGOLI": "MAHARASHTRA", "JALGAON": "MAHARASHTRA",
    "JALNA": "MAHARASHTRA", "KOLHAPUR": "MAHARASHTRA", "LATUR": "MAHARASHTRA",
    "MILLERS ROAD": "MAHARASHTRA", "NAGPUR": "MAHARASHTRA", "NANDED": "MAHARASHTRA",
    "NANDURBAR": "MAHARASHTRA", "NASHIK": "MAHARASHTRA", "NEW MUMBAI": "MAHARASHTRA",
    "PARBHANI": "MAHARASHTRA", "PUNE": "MAHARASHTRA", "RATNAGIRI": "MAHARASHTRA",
    "SANGLI": "MAHARASHTRA", "SATARA": "MAHARASHTRA", "SOLAPUR": "MAHARASHTRA",
    "SOUTH MUMBAI": "MAHARASHTRA", "THANE": "MAHARASHTRA", "WARDHA": "MAHARASHTRA",
    "WASHIM": "MAHARASHTRA", "WESTERN LINE": "MAHARASHTRA", "YAVATMAL": "MAHARASHTRA",
    # Madhya Pradesh
    "BALAGHAT": "MADHYA PRADESH", "BETUL": "MADHYA PRADESH", "BHOPAL": "MADHYA PRADESH",
    "BURHANPUR": "MADHYA PRADESH", "CHHINDWARA": "MADHYA PRADESH", "DHAR": "MADHYA PRADESH",
    "INDORE": "MADHYA PRADESH", "JABALPUR": "MADHYA PRADESH", "JHABUA": "MADHYA PRADESH",
    "KATNI": "MADHYA PRADESH", "MANDLA": "MADHYA PRADESH", "MANDSAUR": "MADHYA PRADESH",
    "NARMADAPURAM": "MADHYA PRADESH", "NARSINGPUR": "MADHYA PRADESH", "RAISEN": "MADHYA PRADESH",
    "RAJGARH": "MADHYA PRADESH", "SEHORE": "MADHYA PRADESH", "UJJAIN": "MADHYA PRADESH",
    "VIDISHA": "MADHYA PRADESH",
    # Karnataka
    "BELAGAVI": "KARNATAKA", "BIDAR": "KARNATAKA", "CHITRADURGA": "KARNATAKA",
    "DAVANAGERE": "KARNATAKA", "DHARWAD": "KARNATAKA", "DODDABALLARPURA": "KARNATAKA",
    "HASSAN": "KARNATAKA", "HAVERI": "KARNATAKA", "HUBLLI": "KARNATAKA",
    "KALABURAGI": "KARNATAKA", "KOLAR": "KARNATAKA", "KOPPAL": "KARNATAKA",
    "MANDYA": "KARNATAKA", "MYSORE": "KARNATAKA", "SHIVAMOGGA": "KARNATAKA",
    "UDUPI": "KARNATAKA", "UTTARA KANNADA": "KARNATAKA", "YADGIR": "KARNATAKA",
    # Uttarakhand
    "ALMORA": "UTTARAKHAND", "CHAMPAWAT": "UTTARAKHAND", "DEHRADUN": "UTTARAKHAND",
    "HARIDWAR": "UTTARAKHAND", "NAINITAL": "UTTARAKHAND", "PAURI GARHWAL": "UTTARAKHAND",
    "RISHIKESH": "UTTARAKHAND", "UDHAM SIGH NAGAR": "UTTARAKHAND",
    # Himachal Pradesh
    "SOLAN": "HIMACHAL PRADESH",
}

# State -> existing year-specific Holiday List name (kept unchanged)
STATE_HOLIDAY_LIST = {
    "MAHARASHTRA": "Maharashtra - 2026",
    "CHANDIGARH": "Chandigarh - 2026",
    "KARNATAKA": "Karnataka - 2026",
    "MADHYA PRADESH": "Madhya Pradesh - 2026",
    "PUDUCHERRY": "Pondicherry - 2026",
    "HIMACHAL PRADESH": "Himachal Pradesh - 2026",
    "JAMMU AND KASHMIR": "Jammu & Kashmir - 2026",
    "UTTARAKHAND": "Uttarakhand - 2026",
}


def _get_support_staff_records():
    return frappe.db.sql("""
        SELECT e.name, e.employee_name, e.holiday_list, e.sahayog_branch, sb.district, sb.state
        FROM `tabEmployee` e
        LEFT JOIN `tabSahayog Branch` sb ON sb.name = e.sahayog_branch
        WHERE e.custom_is_support_staff = 1
          AND e.status = 'Active'
    """, as_dict=True)


def _derive_state(emp):
    state = (emp.state or "").strip().upper()
    if not state:
        state = DISTRICT_STATE.get((emp.district or "").strip().upper())
    return state


def _proposed_holiday_list(emp):
    state = _derive_state(emp)
    holiday_list = STATE_HOLIDAY_LIST.get(state)
    if not holiday_list or not frappe.db.exists("Holiday List", holiday_list):
        return None
    return holiday_list


def dry_run():
    """Read-only preview. Shows Employee, current holiday_list, derived state and
    proposed holiday_list, with counts. Does NOT write anything."""
    from collections import Counter

    rows = _get_support_staff_records()
    report = []
    assign = Counter()
    for emp in rows:
        proposed = _proposed_holiday_list(emp)
        report.append({
            "employee": emp.name,
            "employee_name": emp.employee_name,
            "current_holiday_list": emp.holiday_list,
            "derived_state": _derive_state(emp) or None,
            "proposed_holiday_list": proposed,
        })
        if proposed:
            assign[proposed] += 1

    return {
        "total_active_support_staff": len(rows),
        "to_assign": sum(assign.values()),
        "counts_by_holiday_list": dict(assign),
        "report": report,
    }


def execute():
    rows = _get_support_staff_records()

    updated = skipped = 0
    for emp in rows:
        proposed = _proposed_holiday_list(emp)
        if not proposed:
            skipped += 1
            continue
        if emp.holiday_list != proposed:
            frappe.db.set_value("Employee", emp.name, "holiday_list", proposed)
            updated += 1

    frappe.db.commit()
    frappe.log_error(
        f"assign_support_staff_holiday_lists: updated={updated}, skipped_no_state_or_list={skipped}",
        "Patch: Support Staff Holiday Lists",
    )