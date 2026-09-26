import frappe


# =========================================================
# CONSTANTS
# =========================================================

MONTH_NUMBERS = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}

MONTH_ORDER = [
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "January",
    "February",
    "March",
]


# =========================================================
# BASIC API
# =========================================================

@frappe.whitelist()
def get_branch_scorecards():
    try:
        return frappe.get_all(
            "Branch Score Card",
            fields=[
                "name",
                "branch",
                "branch_name",
                "month",
                "year",
            ],
            order_by="creation desc",
            limit_page_length=0,
        )

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Branch Scorecard Error",
        )
        return []


@frappe.whitelist()
def get_scorecard_details(docname):
    try:
        return frappe.get_doc(
            "Branch Score Card",
            docname,
        )

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Branch Scorecard Details Error",
        )
        return {}


# =========================================================
# COMMON HELPERS
# =========================================================

def _get_financial_year_start_year(financial_year):
    try:
        return int(
            str(financial_year).strip().split("-")[0]
        )
    except (ValueError, TypeError, IndexError):
        frappe.throw("Invalid Financial Year")


def _get_month_year_map(start_year):
    """
    Returns the calendar year for each month
    of the selected financial year.
    """

    return {
        "April": start_year,
        "May": start_year,
        "June": start_year,
        "July": start_year,
        "August": start_year,
        "September": start_year,
        "October": start_year,
        "November": start_year,
        "December": start_year,
        "January": start_year + 1,
        "February": start_year + 1,
        "March": start_year + 1,
    }


def _get_previous_period(month, year):
    """
    Returns previous calendar month.

    August 2026 -> July 2026
    April 2026  -> March 2026
    January 2027 -> December 2026
    """

    month = str(month or "").strip()

    month_number = MONTH_NUMBERS.get(month)

    if not month_number:
        return None

    try:
        year = int(year)
    except (ValueError, TypeError):
        return None

    previous_month_number = month_number - 1
    previous_year = year

    if previous_month_number == 0:
        previous_month_number = 12
        previous_year -= 1

    previous_month = next(
        (
            name
            for name, number in MONTH_NUMBERS.items()
            if number == previous_month_number
        ),
        None,
    )

    if not previous_month:
        return None

    return {
        "month": previous_month,
        "year": previous_year,
    }


def _normalize_zone(zone):
    """
    Converts old and new zone formats to a common format.

    Examples:
        ZONE-1       -> ZONE-1
        ZONE-1(MH)   -> ZONE-1
        ZONE-4(KN)   -> ZONE-4
        zone-6(UK)   -> ZONE-6
    """

    zone = str(zone or "").strip().upper()

    if not zone.startswith("ZONE-"):
        return ""

    # Keep only the main zone number.
    zone_number = zone.split("-", 1)[1].split("(", 1)[0].strip()

    if not zone_number.isdigit():
        return ""

    return f"ZONE-{zone_number}"


def _is_zonal_branch(branch_type):
    return (
        str(branch_type or "")
        .strip()
        .lower()
        == "zonal"
    )


def _get_branch_zone_map():
    """
    Returns:

        {
            "1092": "ZONE-1",
            "1214": "ZONE-2",
            ...
        }

    Supports both old zone values:
        ZONE-1(MH)

    and new normalized values:
        ZONE-1
    """

    branch_records = frappe.get_all(
        "Sahayog Branch",
        fields=[
            "name",
            "sol_id",
            "branch",
            "branch_type",
            "zone",
        ],
        limit_page_length=0,
    )

    branch_zone_map = {}

    for branch in branch_records:

        if _is_zonal_branch(
            branch.get("branch_type")
        ):
            continue

        # Prefer sol_id.
        # If unavailable, use DocType name.
        sol_id = str(
            branch.get("sol_id")
            or branch.get("name")
            or ""
        ).strip()

        if not sol_id:
            continue

        # Branch SOL IDs should be numeric.
        if not sol_id.isdigit():
            continue

        zone = _normalize_zone(
            branch.get("zone")
        )

        if not zone:
            continue

        branch_zone_map[sol_id] = zone

    return branch_zone_map


def _get_branch_records():
    """
    Loads valid non-zonal branches once.

    Returns a normalized structure that can be reused
    by Zone Wise and COM Wise calculations.
    """

    records = frappe.get_all(
        "Sahayog Branch",
        fields=[
            "name",
            "sol_id",
            "branch",
            "branch_type",
            "zone",
            "cluster_operations_manager",
        ],
        limit_page_length=0,
    )

    branches = []

    for record in records:

        if _is_zonal_branch(
            record.get("branch_type")
        ):
            continue

        sol_id = str(
            record.get("sol_id")
            or record.get("name")
            or ""
        ).strip()

        if not sol_id:
            continue

        if not sol_id.isdigit():
            continue

        zone = _normalize_zone(
            record.get("zone")
        )

        if not zone:
            continue

        com = str(
            record.get("cluster_operations_manager")
            or ""
        ).strip()

        if not com:
            com = "Not Assigned"

        branches.append(
            {
                "sol_id": sol_id,
                "name": str(
                    record.get("name") or ""
                ).strip(),
                "branch": str(
                    record.get("branch") or ""
                ).strip(),
                "zone": zone,
                "com": com,
            }
        )

    return branches


def _get_branch_score_percentage(doc):
    """
    BHSC Percentage:

        Sum(score_obtain) /
        Sum(weightage) * 100

    Returns None when no valid weightage exists.
    """

    total_score = 0.0
    total_weightage = 0.0

    for row in doc.get("table_cxyy") or []:

        score = frappe.utils.flt(
            row.get("score_obtain")
        )

        weightage = frappe.utils.flt(
            row.get("weightage")
        )

        total_score += score
        total_weightage += weightage

    if total_weightage <= 0:
        return None

    return (
        total_score /
        total_weightage
    ) * 100


def _get_latest_scorecard_records(
    branch_sols,
    months=None,
    years=None,
):
    """
    Returns latest Branch Score Card record for each:

        branch + month + year

    This avoids duplicate scorecards.
    """

    if not branch_sols:
        return {}

    filters = {
        "branch": ["in", list(branch_sols)],
    }

    if months:
        filters["month"] = ["in", list(months)]

    if years:
        filters["year"] = ["in", list(years)]

    records = frappe.get_all(
        "Branch Score Card",
        filters=filters,
        fields=[
            "name",
            "branch",
            "month",
            "year",
            "modified",
        ],
        order_by="modified desc",
        limit_page_length=0,
    )

    latest = {}

    for record in records:

        branch = str(
            record.get("branch") or ""
        ).strip()

        month = str(
            record.get("month") or ""
        ).strip()

        try:
            year = int(
                float(
                    record.get("year")
                )
            )
        except (ValueError, TypeError):
            continue

        key = (
            branch,
            month,
            year,
        )

        if key not in latest:
            latest[key] = record["name"]

    return latest


def _get_scorecard_percentages(record_map):
    """
    Converts scorecard document names into:

        {
            (branch, month, year): percentage
        }
    """

    percentages = {}

    for key, docname in record_map.items():

        try:
            doc = frappe.get_doc(
                "Branch Score Card",
                docname,
            )

            percentage = _get_branch_score_percentage(
                doc
            )

            if percentage is not None:
                percentages[key] = percentage

        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"Scorecard Calculation Error: {docname}",
            )

    return percentages


# =========================================================
# ZONE WISE SCORE DATA
# =========================================================

@frappe.whitelist()
def get_zone_wise_scorecard_data(financial_year):

    if not financial_year:
        frappe.throw(
            "Financial Year is required"
        )

    start_year = _get_financial_year_start_year(
        financial_year
    )

    end_year = start_year + 1

    month_year_map = _get_month_year_map(
        start_year
    )

    today = frappe.utils.getdate()

    current_fy_start_year = (
        today.year
        if today.month >= 4
        else today.year - 1
    )

    # -----------------------------------------------------
    # Visible months
    # -----------------------------------------------------

    if start_year < current_fy_start_year:

        visible_months = MONTH_ORDER.copy()

    elif start_year == current_fy_start_year:

        if today.month >= 4:

            visible_months = [
                month
                for month in MONTH_ORDER
                if MONTH_NUMBERS[month] >= 4
                and MONTH_NUMBERS[month] <= today.month
            ]

        else:
            visible_months = []

    else:

        visible_months = []

    # -----------------------------------------------------
    # Periods
    # -----------------------------------------------------

    periods = [
        {
            "month": "March",
            "year": start_year,
            "label": f"Mar-{str(start_year)[-2:]}",
        }
    ]

    for month in visible_months:

        year = month_year_map[month]

        periods.append(
            {
                "month": month,
                "year": year,
                "label": (
                    f"{month[:3]}-"
                    f"{str(year)[-2:]}"
                ),
            }
        )

    # -----------------------------------------------------
    # Branch -> Zone
    # -----------------------------------------------------

    branch_zone_map = _get_branch_zone_map()

    zones = sorted(
        set(branch_zone_map.values()),
        key=lambda value: (
            int(value.split("-")[1])
            if value.split("-")[1].isdigit()
            else 999
        ),
    )

    result = {
        zone: {
            period["label"]: None
            for period in periods
        }
        for zone in zones
    }

    valid_sols = set(
        branch_zone_map.keys()
    )

    if not valid_sols:

        return {
            "financial_year": financial_year,
            "periods": periods,
            "zones": zones,
            "data": result,
            "grand_total": {
                period["label"]: None
                for period in periods
            },
        }

    # -----------------------------------------------------
    # Scorecards
    # -----------------------------------------------------

    record_map = _get_latest_scorecard_records(
        valid_sols,
        months={
            period["month"]
            for period in periods
        },
        years={
            period["year"]
            for period in periods
        },
    )

    score_percentages = (
        _get_scorecard_percentages(
            record_map
        )
    )

    # -----------------------------------------------------
    # Calculate Zone Wise scores
    # -----------------------------------------------------

    zone_month_scores = {}

    for (
        branch,
        month,
        year,
    ), percentage in score_percentages.items():

        zone = branch_zone_map.get(branch)

        if not zone:
            continue

        period_label = next(
            (
                period["label"]
                for period in periods
                if (
                    period["month"] == month
                    and
                    period["year"] == year
                )
            ),
            None,
        )

        if not period_label:
            continue

        zone_month_scores.setdefault(
            (zone, period_label),
            [],
        ).append(percentage)

    grand_total_month_scores = {}

    for (
        zone,
        label,
    ), scores in zone_month_scores.items():

        if not scores:
            continue

        result[zone][label] = round(
            sum(scores) / len(scores),
            2,
        )

        grand_total_month_scores.setdefault(
            label,
            [],
        ).extend(scores)

    # -----------------------------------------------------
    # Grand Total
    # -----------------------------------------------------

    grand_total = {}

    for period in periods:

        label = period["label"]

        scores = grand_total_month_scores.get(
            label,
            [],
        )

        grand_total[label] = (
            round(
                sum(scores) / len(scores),
                2,
            )
            if scores
            else None
        )

    return {
        "financial_year": financial_year,
        "periods": periods,
        "zones": zones,
        "data": result,
        "grand_total": grand_total,
    }


# =========================================================
# ZONE WISE TREND COMPARISON
# =========================================================

def get_zone_wise_trend_comparison_data(
    selected_fy,
    selected_month,
):

    selected_fy = str(
        selected_fy or ""
    ).strip()

    selected_month = str(
        selected_month or ""
    ).strip().capitalize()

    if not selected_fy:
        return {
            "available": False,
            "message": "Financial Year is required.",
        }

    if not selected_month:
        return {
            "available": False,
            "message": "Month is required.",
        }

    start_year = _get_financial_year_start_year(
        selected_fy
    )

    month_year_map = _get_month_year_map(
        start_year
    )

    current_year = month_year_map.get(
        selected_month
    )

    if not current_year:
        return {
            "available": False,
            "message": "Invalid selected month.",
        }

    previous_period = _get_previous_period(
        selected_month,
        current_year,
    )

    if not previous_period:
        return {
            "available": False,
            "message": "Unable to determine previous month.",
        }

    previous_month = previous_period["month"]
    previous_year = previous_period["year"]

    branch_zone_map = _get_branch_zone_map()

    zones = sorted(
        set(branch_zone_map.values()),
        key=lambda value: (
            int(value.split("-")[1])
            if value.split("-")[1].isdigit()
            else 999
        ),
    )

    comparison = {
        zone: {
            "constant": 0,
            "down": 0,
            "up": 0,
            "grand_total": 0,
        }
        for zone in zones
    }

    valid_sols = set(
        branch_zone_map.keys()
    )

    if not valid_sols:

        return {
            "available": True,
            "selected_month": selected_month,
            "selected_year": current_year,
            "selected_label": (
                f"{selected_month} {current_year}"
            ),
            "previous_month": previous_month,
            "previous_year": previous_year,
            "previous_label": (
                f"{previous_month} {previous_year}"
            ),
            "zones": zones,
            "data": comparison,
            "grand_total": {
                "constant": 0,
                "down": 0,
                "up": 0,
                "grand_total": 0,
            },
        }

    # -----------------------------------------------------
    # Latest records
    # -----------------------------------------------------

    record_map = _get_latest_scorecard_records(
        valid_sols,
        months={
            selected_month,
            previous_month,
        },
        years={
            current_year,
            previous_year,
        },
    )

    branch_scores = _get_scorecard_percentages(
        record_map
    )

    # -----------------------------------------------------
    # Compare
    # -----------------------------------------------------

    for sol_id, zone in branch_zone_map.items():

        current_score = branch_scores.get(
            (
                sol_id,
                selected_month,
                current_year,
            )
        )

        previous_score = branch_scores.get(
            (
                sol_id,
                previous_month,
                previous_year,
            )
        )

        # Both months are mandatory
        if (
            current_score is None
            or previous_score is None
        ):
            continue

        difference = (
            current_score -
            previous_score
        )

        if abs(difference) < 0.005:

            comparison[zone]["constant"] += 1

        elif difference < 0:

            comparison[zone]["down"] += 1

        else:

            comparison[zone]["up"] += 1

        comparison[zone]["grand_total"] += 1

    # -----------------------------------------------------
    # Grand Total
    # -----------------------------------------------------

    grand_total = {
        "constant": 0,
        "down": 0,
        "up": 0,
        "grand_total": 0,
    }

    for zone in zones:

        zone_data = comparison[zone]

        for key in [
            "constant",
            "down",
            "up",
            "grand_total",
        ]:
            grand_total[key] += zone_data[key]

    return {
        "available": True,
        "selected_month": selected_month,
        "selected_year": current_year,
        "selected_label": (
            f"{selected_month} {current_year}"
        ),
        "previous_month": previous_month,
        "previous_year": previous_year,
        "previous_label": (
            f"{previous_month} {previous_year}"
        ),
        "zones": zones,
        "data": comparison,
        "grand_total": grand_total,
    }


# =========================================================
# ZONE WISE BHSC API
# =========================================================

@frappe.whitelist()
def get_zone_wise_bhsc(
    selected_fy,
    selected_month=None,
):

    selected_fy = str(
        selected_fy or ""
    ).strip()

    selected_month = str(
        selected_month or ""
    ).strip().capitalize()

    if not selected_fy:
        frappe.throw(
            "Financial Year is required"
        )

    result = get_zone_wise_scorecard_data(
        selected_fy
    )

    periods = result.get(
        "periods",
        [],
    )

    # -----------------------------------------------------
    # Filter till selected month
    # IMPORTANT:
    # Match month + year, not month only.
    # This avoids March baseline/current-year conflict.
    # -----------------------------------------------------

    if selected_month:

        start_year = _get_financial_year_start_year(
            selected_fy
        )

        month_year_map = _get_month_year_map(
            start_year
        )

        selected_year = month_year_map.get(
            selected_month
        )

        selected_index = None

        for index, period in enumerate(periods):

            if (
                period.get("month")
                == selected_month
                and
                period.get("year")
                == selected_year
            ):
                selected_index = index
                break

        if selected_index is not None:

            periods = periods[
                :selected_index + 1
            ]

            result["periods"] = periods

            allowed_labels = {
                period["label"]
                for period in periods
            }

            result["data"] = {
                zone: {
                    label: values.get(label)
                    for label in allowed_labels
                }
                for zone, values
                in result.get("data", {}).items()
            }

            result["grand_total"] = {
                label: result.get(
                    "grand_total",
                    {},
                ).get(label)
                for label in allowed_labels
            }

    result["trend_comparison"] = (
        get_zone_wise_trend_comparison_data(
            selected_fy,
            selected_month,
        )
        if selected_month
        else {
            "available": False,
            "message": "Month is not selected.",
        }
    )

    result["selected_fy"] = selected_fy
    result["selected_month"] = selected_month

    return result


# =========================================================
# COM WISE BHSC PERFORMANCE
# =========================================================

@frappe.whitelist()
def get_com_wise_bhsc(
    selected_fy,
    selected_month=None,
):

    selected_fy = str(
        selected_fy or ""
    ).strip()

    selected_month = str(
        selected_month or ""
    ).strip().capitalize()

    if not selected_fy:
        return {
            "available": False,
            "message": "Financial Year is required.",
        }

    if not selected_month:
        return {
            "available": False,
            "message": "Month is required.",
        }

    start_year = _get_financial_year_start_year(
        selected_fy
    )

    month_year_map = _get_month_year_map(
        start_year
    )

    selected_year = month_year_map.get(
        selected_month
    )

    if not selected_year:
        return {
            "available": False,
            "message": "Invalid month.",
        }

    selected_year = str(selected_year)

    # -----------------------------------------------------
    # Branch data
    # -----------------------------------------------------

    branches = _get_branch_records()

    if not branches:
        return {
            "available": True,
            "selected_fy": selected_fy,
            "selected_month": selected_month,
            "selected_year": selected_year,
            "zones": [],
            "data": {},
            "zone_totals": {},
            "grand_total": {
                "excellent": 0,
                "good": 0,
                "needs_improvement": 0,
                "grand_total": 0,
                "has_data": False,
            },
        }

    # -----------------------------------------------------
    # Zone + COM structure
    # -----------------------------------------------------

    zone_com_map = {}

    branch_lookup = {}

    for branch in branches:

        sol_id = branch["sol_id"]
        branch_name = branch["name"]
        zone = branch["zone"]
        com = branch["com"]

        branch_info = {
            "zone": zone,
            "com": com,
        }

        branch_lookup[sol_id] = branch_info

        if branch_name:
            branch_lookup[branch_name] = branch_info

        zone_com_map.setdefault(
            zone,
            {},
        )

        zone_com_map[zone].setdefault(
            com,
            {
                "excellent": 0,
                "good": 0,
                "needs_improvement": 0,
                "grand_total": 0,
                "has_data": False,
            },
        )

    # -----------------------------------------------------
    # Scorecards
    # -----------------------------------------------------

    valid_sols = {
        branch["sol_id"]
        for branch in branches
    }

    record_map = _get_latest_scorecard_records(
        valid_sols,
        months={selected_month},
        years={int(selected_year)},
    )

    score_percentages = _get_scorecard_percentages(
        record_map
    )

    # -----------------------------------------------------
    # Process scorecards
    # -----------------------------------------------------

    for (
        branch,
        month,
        year,
    ), score_percentage in score_percentages.items():

        branch_info = branch_lookup.get(
            branch
        )

        if not branch_info:
            continue

        zone = branch_info["zone"]
        com = branch_info["com"]

        if score_percentage >= 85:

            category = "excellent"

        elif score_percentage >= 65:

            category = "good"

        else:

            category = "needs_improvement"

        zone_com_map.setdefault(
            zone,
            {},
        )

        zone_com_map[zone].setdefault(
            com,
            {
                "excellent": 0,
                "good": 0,
                "needs_improvement": 0,
                "grand_total": 0,
                "has_data": False,
            },
        )

        zone_com_map[zone][com][
            category
        ] += 1

        zone_com_map[zone][com][
            "grand_total"
        ] += 1

        zone_com_map[zone][com][
            "has_data"
        ] = True

    # -----------------------------------------------------
    # Zone sorting
    # -----------------------------------------------------

    def zone_sort_key(zone_name):

        try:
            return int(
                zone_name
                .split("-")[1]
                .split("(")[0]
            )
        except (ValueError, IndexError):
            return 999

    zones = sorted(
        zone_com_map.keys(),
        key=zone_sort_key,
    )

    # -----------------------------------------------------
    # Final data
    # -----------------------------------------------------

    data = {}
    zone_totals = {}

    for zone in zones:

        data[zone] = {}

        zone_totals[zone] = {
            "excellent": 0,
            "good": 0,
            "needs_improvement": 0,
            "grand_total": 0,
            "has_data": False,
        }

        for com in sorted(
            zone_com_map[zone].keys(),
            key=lambda value: value.lower(),
        ):

            com_data = zone_com_map[
                zone
            ][com]

            data[zone][com] = {
                "excellent": com_data[
                    "excellent"
                ],
                "good": com_data[
                    "good"
                ],
                "needs_improvement": com_data[
                    "needs_improvement"
                ],
                "grand_total": com_data[
                    "grand_total"
                ],
                "has_data": com_data[
                    "has_data"
                ],
            }

            for key in [
                "excellent",
                "good",
                "needs_improvement",
                "grand_total",
            ]:
                zone_totals[zone][key] += (
                    com_data[key]
                )

            if com_data["has_data"]:
                zone_totals[zone][
                    "has_data"
                ] = True

    # -----------------------------------------------------
    # Grand Total
    # -----------------------------------------------------

    grand_total = {
        "excellent": 0,
        "good": 0,
        "needs_improvement": 0,
        "grand_total": 0,
        "has_data": False,
    }

    for zone in zones:

        zone_total = zone_totals[zone]

        for key in [
            "excellent",
            "good",
            "needs_improvement",
            "grand_total",
        ]:
            grand_total[key] += (
                zone_total[key]
            )

        if zone_total["has_data"]:
            grand_total["has_data"] = True

    return {
        "available": True,
        "selected_fy": selected_fy,
        "selected_month": selected_month,
        "selected_year": selected_year,
        "zones": zones,
        "data": data,
        "zone_totals": zone_totals,
        "grand_total": grand_total,
    }