import frappe


@frappe.whitelist()
def get_branch_scorecards():
    try:
        records = frappe.get_all(
            "Branch Score Card",
            fields=[
                "name",
                "branch",
                "branch_name",
                "month",
                "year"
            ],
            order_by="creation desc"
        )
        return records
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Branch Scorecard Error"
        )
        return []


@frappe.whitelist()
def get_scorecard_details(docname):
    try:
        doc = frappe.get_doc(
            "Branch Score Card",
            docname
        )
        return doc
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Branch Scorecard Details Error"
        )
        return {}


# =========================================================
# COMMON HELPERS
# =========================================================

def _get_financial_year_start_year(financial_year):
    try:
        return int(
            str(financial_year).split("-")[0]
        )
    except Exception:
        frappe.throw(
            "Invalid Financial Year"
        )


def _get_branch_zone_map():
    """
    Returns:
        {
            "1092": "ZONE-1(MH)",
            "1214": "ZONE-2(MH)",
            ...
        }

    Only valid non-zonal branches are included.
    """

    branch_records = frappe.get_all(
        "Sahayog Branch",
        fields=[
            "name",
            "sol_id",
            "branch",
            "branch_type",
            "zone"
        ],
        limit_page_length=0
    )

    branch_zone_map = {}

    for branch in branch_records:

        sol_id = str(
            branch.get("sol_id") or ""
        ).strip()

        if not sol_id:
            continue

        if not sol_id.isdigit():
            continue

        branch_type = str(
            branch.get("branch_type") or ""
        ).strip().lower()

        if branch_type == "zonal":
            continue

        zone = str(
            branch.get("zone") or ""
        ).strip()

        if not zone:
            continue

        if not zone.startswith("ZONE-"):
            continue

        if "(" not in zone or ")" not in zone:
            continue

        if not zone.endswith(")"):
            continue

        branch_zone_map[sol_id] = zone

    return branch_zone_map


def _get_branch_score_percentage(doc):
    """
    Calculates BHSC percentage using the same logic
    used by the existing Zone Wise average.

    Score Percentage =
        Sum(score_obtain) / Sum(weightage) * 100

    Returns None when no valid weightage exists.
    """

    total_score = 0.0
    total_weightage = 0.0

    child_rows = (
        doc.get("table_cxyy") or []
    )

    for row in child_rows:

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

    percentage = (
        total_score /
        total_weightage
    ) * 100

    return percentage


def _get_previous_period(
    month,
    year
):
    """
    Returns previous calendar month.

    Examples:
        August 2026
            -> July 2026

        April 2026
            -> March 2026

        January 2027
            -> December 2026
    """

    month_numbers = {
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
        "December": 12
    }

    month_names = {
        1: "January",
        2: "February",
        3: "March",
        4: "April",
        5: "May",
        6: "June",
        7: "July",
        8: "August",
        9: "September",
        10: "October",
        11: "November",
        12: "December"
    }

    month_number = month_numbers.get(
        str(month).strip()
    )

    if not month_number:
        return None

    try:
        year = int(year)
    except Exception:
        return None

    previous_month_number = month_number - 1
    previous_year = year

    if previous_month_number == 0:
        previous_month_number = 12
        previous_year -= 1

    return {
        "month": month_names[
            previous_month_number
        ],
        "year": previous_year
    }


# =========================================================
# EXISTING ZONE WISE SCORE DATA
# =========================================================

@frappe.whitelist()
def get_zone_wise_scorecard_data(
    financial_year
):
    """
    Returns real Zone Wise BHSC average score month-wise.

    Source:
    1. Sahayog Branch
    2. Branch Score Card
    3. Branch Score Card child table: table_cxyy

    No zone or score is hardcoded.
    """

    if not financial_year:
        frappe.throw(
            "Financial Year is required"
        )

    start_year = _get_financial_year_start_year(
        financial_year
    )

    end_year = start_year + 1

    month_order = [
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
        "March"
    ]

    calendar_month_number = {
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
        "December": 12
    }

    today = frappe.utils.getdate()

    current_fy_start_year = (
        today.year
        if today.month >= 4
        else today.year - 1
    )

    if start_year < current_fy_start_year:

        visible_months = month_order

    elif start_year == current_fy_start_year:

        current_month = today.month

        if current_month >= 4:

            visible_months = [
                month
                for month in month_order
                if (
                    calendar_month_number[month] >= 4
                    and
                    calendar_month_number[month] <= current_month
                )
            ]

        else:
            visible_months = []

    else:
        visible_months = []

    periods = []

    # March baseline for April comparison
    periods.append(
        {
            "month": "March",
            "year": start_year,
            "label": f"Mar-{str(start_year)[-2:]}"
        }
    )

    for month in visible_months:

        if month in [
            "January",
            "February",
            "March"
        ]:
            year = end_year
        else:
            year = start_year

        periods.append(
            {
                "month": month,
                "year": year,
                "label": f"{month[:3]}-{str(year)[-2:]}"
            }
        )

    branch_zone_map = _get_branch_zone_map()

    zones = sorted(
        set(branch_zone_map.values()),
        key=lambda value: value.lower()
    )

    result = {
        zone: {
            period["label"]: None
            for period in periods
        }
        for zone in zones
    }

    valid_sols = list(
        branch_zone_map.keys()
    )

    if not valid_sols:
        return {
            "financial_year": financial_year,
            "periods": periods,
            "zones": zones,
            "data": result
        }

    scorecard_records = frappe.get_all(
        "Branch Score Card",
        filters={
            "branch": ["in", valid_sols]
        },
        fields=[
            "name",
            "branch",
            "month",
            "year",
            "modified"
        ],
        order_by="modified desc",
        limit_page_length=0
    )

    period_lookup = {}

    for period in periods:

        key = (
            period["month"],
            int(period["year"])
        )

        period_lookup[key] = period["label"]

    selected_records = {}

    for record in scorecard_records:

        branch = str(
            record.get("branch") or ""
        ).strip()

        month = str(
            record.get("month") or ""
        ).strip()

        year_value = record.get("year")

        if branch not in branch_zone_map:
            continue

        try:
            record_year = int(
                float(year_value)
            )
        except Exception:
            continue

        period_key = (
            month,
            record_year
        )

        if period_key not in period_lookup:
            continue

        unique_key = (
            branch,
            month,
            record_year
        )

        if unique_key not in selected_records:

            selected_records[
                unique_key
            ] = record["name"]

    zone_month_scores = {}

    for unique_key, docname in selected_records.items():

        branch, month, record_year = unique_key

        zone = branch_zone_map.get(
            branch
        )

        if not zone:
            continue

        doc = frappe.get_doc(
            "Branch Score Card",
            docname
        )

        branch_percentage = _get_branch_score_percentage(
            doc
        )

        if branch_percentage is None:
            continue

        label = period_lookup.get(
            (
                month,
                record_year
            )
        )

        if not label:
            continue

        zone_month_scores.setdefault(
            (
                zone,
                label
            ),
            []
        ).append(
            branch_percentage
        )

    grand_total_month_scores = {}

    for (
        zone,
        label
    ), scores in zone_month_scores.items():

        if not scores:
            continue

        average_score = (
            sum(scores) /
            len(scores)
        )

        result[zone][label] = round(
            average_score,
            2
        )

        grand_total_month_scores.setdefault(
            label,
            []
        ).extend(scores)

    grand_total = {}

    for period in periods:

        label = period["label"]

        scores = grand_total_month_scores.get(
            label,
            []
        )

        if scores:

            grand_total[label] = round(
                sum(scores) / len(scores),
                2
            )

        else:
            grand_total[label] = None

    return {
        "financial_year": financial_year,
        "periods": periods,
        "zones": zones,
        "data": result,
        "grand_total": grand_total
    }


# =========================================================
# NEW: ZONE WISE TREND COMPARISON
# =========================================================

def get_zone_wise_trend_comparison_data(
    selected_fy,
    selected_month
):
    """
    Compares selected month with the immediately
    previous calendar month.

    Example:
        August 2026 vs July 2026
        September 2026 vs August 2026
        April 2026 vs March 2026
        January 2027 vs December 2026

    A branch is counted only when BOTH months
    have a valid BHSC score.

    Categories:
        Constant
        Down
        Up

    Grand Total = Constant + Down + Up
    """

    selected_fy = str(
        selected_fy or ""
    ).strip()

    selected_month = str(
        selected_month or ""
    ).strip()

    if not selected_fy:
        return {
            "available": False,
            "message": "Financial Year is required."
        }

    if not selected_month:
        return {
            "available": False,
            "message": "Month is required."
        }

    start_year = _get_financial_year_start_year(
        selected_fy
    )

    end_year = start_year + 1

    month_year_map = {
        "April": start_year,
        "May": start_year,
        "June": start_year,
        "July": start_year,
        "August": start_year,
        "September": start_year,
        "October": start_year,
        "November": start_year,
        "December": start_year,
        "January": end_year,
        "February": end_year,
        "March": end_year
    }

    current_year = month_year_map.get(
        selected_month
    )

    if not current_year:
        return {
            "available": False,
            "message": "Invalid selected month."
        }

    previous_period = _get_previous_period(
        selected_month,
        current_year
    )

    if not previous_period:
        return {
            "available": False,
            "message": "Unable to determine previous month."
        }

    previous_month = previous_period["month"]
    previous_year = previous_period["year"]

    branch_zone_map = _get_branch_zone_map()

    zones = sorted(
        set(branch_zone_map.values()),
        key=lambda value: value.lower()
    )

    comparison = {}

    for zone in zones:

        comparison[zone] = {
            "constant": 0,
            "down": 0,
            "up": 0,
            "grand_total": 0
        }

    valid_sols = list(
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
                "grand_total": 0
            }
        }

    scorecard_records = frappe.get_all(
        "Branch Score Card",
        filters={
            "branch": ["in", valid_sols]
        },
        fields=[
            "name",
            "branch",
            "month",
            "year",
            "modified"
        ],
        order_by="modified desc",
        limit_page_length=0
    )

    # -----------------------------------------------------
    # Select latest scorecard for each
    # branch + month + year
    # -----------------------------------------------------

    selected_records = {}

    for record in scorecard_records:

        branch = str(
            record.get("branch") or ""
        ).strip()

        month = str(
            record.get("month") or ""
        ).strip()

        if branch not in branch_zone_map:
            continue

        try:
            record_year = int(
                float(
                    record.get("year")
                )
            )
        except Exception:
            continue

        if month not in [
            selected_month,
            previous_month
        ]:
            continue

        if record_year not in [
            current_year,
            previous_year
        ]:
            continue

        unique_key = (
            branch,
            month,
            record_year
        )

        if unique_key not in selected_records:

            selected_records[
                unique_key
            ] = record["name"]

    # -----------------------------------------------------
    # Calculate branch scores
    # -----------------------------------------------------

    branch_scores = {}

    for unique_key, docname in selected_records.items():

        branch, month, record_year = unique_key

        doc = frappe.get_doc(
            "Branch Score Card",
            docname
        )

        percentage = _get_branch_score_percentage(
            doc
        )

        if percentage is None:
            continue

        branch_scores[
            unique_key
        ] = percentage

    # -----------------------------------------------------
    # Compare branch scores
    # -----------------------------------------------------

    for sol_id, zone in branch_zone_map.items():

        current_key = (
            sol_id,
            selected_month,
            current_year
        )

        previous_key = (
            sol_id,
            previous_month,
            previous_year
        )

        current_score = branch_scores.get(
            current_key
        )

        previous_score = branch_scores.get(
            previous_key
        )

        # Missing either month = do not count
        if (
            current_score is None
            or
            previous_score is None
        ):
            continue

        difference = (
            current_score -
            previous_score
        )

        # Small floating point differences are
        # treated as Constant.
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
        "grand_total": 0
    }

    for zone in zones:

        zone_data = comparison[zone]

        grand_total["constant"] += (
            zone_data["constant"]
        )

        grand_total["down"] += (
            zone_data["down"]
        )

        grand_total["up"] += (
            zone_data["up"]
        )

        grand_total["grand_total"] += (
            zone_data["grand_total"]
        )

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
        "grand_total": grand_total
    }


# =========================================================
# ZONE WISE BHSC
# =========================================================

@frappe.whitelist()
def get_zone_wise_bhsc(
    selected_fy,
    selected_month=None
):
    """
    Returns Zone Wise BHSC data for the
    Branch Scorecard page.

    Also returns dynamic Zone Wise Trend Comparison.
    """

    selected_fy = str(
        selected_fy or ""
    ).strip()

    selected_month = str(
        selected_month or ""
    ).strip()

    if not selected_fy:
        frappe.throw(
            "Financial Year is required"
        )

    result = get_zone_wise_scorecard_data(
        selected_fy
    )

    if not result:

        return {
            "financial_year": selected_fy,
            "periods": [],
            "zones": [],
            "data": {},
            "selected_fy": selected_fy,
            "selected_month": selected_month,
            "trend_comparison": {
                "available": False
            }
        }

    if selected_month:

        periods = result.get(
            "periods",
            []
        )

        selected_index = None

        for index, period in enumerate(periods):

            if (
                period.get("month")
                == selected_month
            ):
                selected_index = index
                break

        if selected_index is not None:

            result["periods"] = periods[
                :selected_index + 1
            ]

            allowed_labels = {
                period.get("label")
                for period in result["periods"]
            }

            filtered_data = {}

            for zone, zone_data in result.get(
                "data",
                {}
            ).items():

                filtered_data[zone] = {
                    label: zone_data.get(label)
                    for label in allowed_labels
                }

            result["data"] = filtered_data

            grand_total = result.get(
                "grand_total",
                {}
            )

            result["grand_total"] = {
                label: grand_total.get(label)
                for label in allowed_labels
            }

    # -----------------------------------------------------
    # NEW TREND COMPARISON DATA
    # -----------------------------------------------------

    result["trend_comparison"] = (
        get_zone_wise_trend_comparison_data(
            selected_fy,
            selected_month
        )
        if selected_month
        else {
            "available": False,
            "message": "Month is not selected."
        }
    )

    result["selected_fy"] = selected_fy
    result["selected_month"] = selected_month

    return result


# =========================================================
# COM WISE BHSC PERFORMANCE
# =========================================================

@frappe.whitelist()
def get_com_wise_bhsc(selected_fy, selected_month=None):

    if not selected_fy:
        return {
            "available": False,
            "message": "Financial Year is required."
        }

    if not selected_month:
        return {
            "available": False,
            "message": "Month is required."
        }

    # =========================================================
    # FINANCIAL YEAR / MONTH
    # =========================================================

    start_year = _get_financial_year_start_year(selected_fy)

    month_name = str(
        selected_month or ""
    ).strip().capitalize()

    month_year_map = {
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

    selected_year = month_year_map.get(month_name)

    if not selected_year:
        return {
            "available": False,
            "message": "Invalid month."
        }

    selected_year = str(selected_year)

    # =========================================================
    # GET ALL BRANCHES
    # =========================================================
    #
    # COM is taken DIRECTLY from:
    # Sahayog Branch.cluster_operations_manager
    #
    # No Employee lookup is used.
    #
    # Only valid zones such as:
    # ZONE-1(MH)
    # ZONE-2(MH)
    # ZONE-5(MP)
    #
    # are accepted.
    #
    # Invalid values such as:
    # ZONE-1
    # ZONE-2
    # etc.
    #
    # are ignored.
    # =========================================================

    branch_records = frappe.get_all(
        "Sahayog Branch",
        fields=[
            "name",
            "sol_id",
            "branch",
            "branch_type",
            "zone",
            "cluster_operations_manager"
        ],
        limit_page_length=0
    )

    zone_com_map = {}

    # ---------------------------------------------------------
    # Branch lookup map
    #
    # Score Card "branch" can contain either:
    # - Sahayog Branch name
    # - SOL ID
    #
    # So both are mapped.
    # ---------------------------------------------------------

    branch_map = {}

    for branch in branch_records:

        branch_name = str(
            branch.get("name") or ""
        ).strip()

        sol_id = str(
            branch.get("sol_id") or ""
        ).strip()

        zone = str(
            branch.get("zone") or ""
        ).strip()

        branch_type = str(
            branch.get("branch_type") or ""
        ).strip().lower()

        # -----------------------------------------------------
        # Do not include Zonal branch
        # -----------------------------------------------------

        if branch_type == "zonal":
            continue

        # -----------------------------------------------------
        # Zone validation
        #
        # ONLY accept:
        # ZONE-1(MH)
        # ZONE-2(MH)
        # ZONE-5(MP)
        #
        # Reject:
        # ZONE-1
        # ZONE-2
        # ZONE-5
        # -----------------------------------------------------

        if not zone:
            continue

        if not zone.startswith("ZONE-"):
            continue

        if "(" not in zone or ")" not in zone:
            continue

        if not zone.endswith(")"):
            continue

        # -----------------------------------------------------
        # COM directly from Sahayog Branch
        # -----------------------------------------------------

        com = str(
            branch.get("cluster_operations_manager") or ""
        ).strip()

        if not com:
            com = "Not Assigned"

        branch_info = {
            "zone": zone,
            "com": com
        }

        # -----------------------------------------------------
        # Map using Sahayog Branch name
        # -----------------------------------------------------

        if branch_name:
            branch_map[branch_name] = branch_info

        # -----------------------------------------------------
        # Map using SOL ID
        # -----------------------------------------------------

        if sol_id:
            branch_map[sol_id] = branch_info

        # -----------------------------------------------------
        # Initialize Zone + COM
        #
        # Initially has_data = False.
        #
        # Therefore frontend can display "-"
        # until actual scorecard is found.
        # -----------------------------------------------------

        if zone not in zone_com_map:
            zone_com_map[zone] = {}

        if com not in zone_com_map[zone]:

            zone_com_map[zone][com] = {
                "excellent": 0,
                "good": 0,
                "needs_improvement": 0,
                "grand_total": 0,
                "has_data": False
            }

    # =========================================================
    # GET SELECTED MONTH SCORECARDS
    # =========================================================

    scorecards = frappe.get_all(
        "Branch Score Card",
        filters={
            "month": month_name,
            "year": selected_year
        },
        fields=[
            "name",
            "branch",
            "month",
            "year",
            "modified"
        ],
        order_by="modified desc",
        limit_page_length=0
    )

    # =========================================================
    # PROCESS SCORECARDS
    # =========================================================

    # ---------------------------------------------------------
    # Keep latest scorecard for each branch.
    #
    # Because records are already ordered:
    # modified desc
    #
    # first record for a branch is the latest one.
    # ---------------------------------------------------------

    processed_branches = set()

    for record in scorecards:

        branch = str(
            record.get("branch") or ""
        ).strip()

        if not branch:
            continue

        # -----------------------------------------------------
        # Avoid duplicate counting for same branch
        # -----------------------------------------------------

        if branch in processed_branches:
            continue

        branch_info = branch_map.get(branch)

        # -----------------------------------------------------
        # If Branch Score Card branch value does not match
        # Sahayog Branch name/SOL ID, skip it.
        # -----------------------------------------------------

        if not branch_info:
            continue

        processed_branches.add(branch)

        zone = branch_info["zone"]
        com = branch_info["com"]

        # -----------------------------------------------------
        # Get scorecard document
        # -----------------------------------------------------

        try:

            doc = frappe.get_doc(
                "Branch Score Card",
                record["name"]
            )

        except Exception:

            continue

        # -----------------------------------------------------
        # Existing Branch Score Card scoring calculation
        #
        # _get_branch_score_percentage() remains unchanged.
        # -----------------------------------------------------

        score_percentage = _get_branch_score_percentage(doc)

        if score_percentage is None:
            continue

        # =====================================================
        # CATEGORY CALCULATION
        #
        # Existing logic:
        #
        # >= 85  = Excellent
        # >= 65  = Good
        # < 65   = Needs Improvement
        # =====================================================

        if score_percentage >= 85:

            category = "excellent"

        elif score_percentage >= 65:

            category = "good"

        else:

            category = "needs_improvement"

        # -----------------------------------------------------
        # Safety initialization
        # -----------------------------------------------------

        if zone not in zone_com_map:

            zone_com_map[zone] = {}

        if com not in zone_com_map[zone]:

            zone_com_map[zone][com] = {
                "excellent": 0,
                "good": 0,
                "needs_improvement": 0,
                "grand_total": 0,
                "has_data": False
            }

        # -----------------------------------------------------
        # Increment actual category count
        # -----------------------------------------------------

        zone_com_map[zone][com][category] += 1

        # -----------------------------------------------------
        # Grand Total = actual scorecard count
        # -----------------------------------------------------

        zone_com_map[zone][com]["grand_total"] += 1

        # -----------------------------------------------------
        # Mark that this COM has actual data
        # -----------------------------------------------------

        zone_com_map[zone][com]["has_data"] = True

    # =========================================================
    # SORT ZONES
    # =========================================================

    def zone_sort_key(zone_name):

        try:

            return int(
                zone_name
                .split("-")[1]
                .split("(")[0]
            )

        except Exception:

            return 999

    zones = sorted(
        zone_com_map.keys(),
        key=zone_sort_key
    )

    # =========================================================
    # BUILD FINAL DATA
    # =========================================================

    data = {}

    zone_totals = {}

    for zone in zones:

        data[zone] = {}

        zone_totals[zone] = {
            "excellent": 0,
            "good": 0,
            "needs_improvement": 0,
            "grand_total": 0,
            "has_data": False
        }

        # -----------------------------------------------------
        # Sort COM names alphabetically
        # -----------------------------------------------------

        sorted_coms = sorted(
            zone_com_map[zone].keys(),
            key=lambda value: value.lower()
        )

        for com in sorted_coms:

            com_data = zone_com_map[zone][com]

            # -------------------------------------------------
            # Keep actual 0 values.
            #
            # Frontend will decide:
            #
            # has_data = True
            #     -> 0 should remain 0
            #
            # has_data = False
            #     -> display "-"
            # -------------------------------------------------

            data[zone][com] = {
                "excellent": com_data["excellent"],
                "good": com_data["good"],
                "needs_improvement": com_data["needs_improvement"],
                "grand_total": com_data["grand_total"],
                "has_data": com_data["has_data"]
            }

            # -------------------------------------------------
            # Zone Total
            #
            # Only actual scorecard counts are added.
            # -------------------------------------------------

            zone_totals[zone]["excellent"] += (
                com_data["excellent"]
            )

            zone_totals[zone]["good"] += (
                com_data["good"]
            )

            zone_totals[zone]["needs_improvement"] += (
                com_data["needs_improvement"]
            )

            zone_totals[zone]["grand_total"] += (
                com_data["grand_total"]
            )

            if com_data["has_data"]:

                zone_totals[zone]["has_data"] = True

    # =========================================================
    # GRAND TOTAL
    # =========================================================

    grand_total = {
        "excellent": 0,
        "good": 0,
        "needs_improvement": 0,
        "grand_total": 0,
        "has_data": False
    }

    for zone in zones:

        zone_total = zone_totals[zone]

        grand_total["excellent"] += (
            zone_total["excellent"]
        )

        grand_total["good"] += (
            zone_total["good"]
        )

        grand_total["needs_improvement"] += (
            zone_total["needs_improvement"]
        )

        grand_total["grand_total"] += (
            zone_total["grand_total"]
        )

        if zone_total["has_data"]:

            grand_total["has_data"] = True

    # =========================================================
    # FINAL RESPONSE
    # =========================================================

    return {
        "available": True,
        "selected_fy": selected_fy,
        "selected_month": month_name,
        "selected_year": selected_year,
        "zones": zones,
        "data": data,
        "zone_totals": zone_totals,
        "grand_total": grand_total
    }