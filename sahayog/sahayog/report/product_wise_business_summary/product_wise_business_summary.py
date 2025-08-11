import frappe
import locale
from collections import defaultdict

locale.setlocale(locale.LC_NUMERIC, "en_IN")

def execute(filters=None):
    if not filters:
        filters = {}

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    status = filters.get("status")
    zone = filters.get("zone")
    region = filters.get("region")
    branch = filters.get("branch")

    conditions = ""

    if status:
        conditions += " AND l.status = %(status)s"
    if from_date:
        conditions += " AND DATE(l.creation) >= %(from_date)s"
    if to_date:
        conditions += " AND DATE(l.creation) <= %(to_date)s"
    if zone:
        conditions += " AND l.custom_zone = %(zone)s"
    if region:
        conditions += " AND l.region = %(region)s"
    if branch:
        conditions += " AND l.branch = %(branch)s"

    columns = [
        {"label": "Product", "fieldname": "product", "fieldtype": "Link", "options": "Item", "width": 150},
        {"label": "Product Name", "fieldname": "product_name", "fieldtype": "Data", "width": 200},
        {"label": "Zone", "fieldname": "custom_zone", "fieldtype": "Data", "width": 120},
        {"label": "Region", "fieldname": "custom_region", "fieldtype": "Data", "width": 120},
        {"label": "Branch", "fieldname": "custom_branch", "fieldtype": "Data", "width": 120},
        {"label": "Lead Count", "fieldname": "lead_count", "fieldtype": "Int", "width": 100},
        {"label": "Total Amount", "fieldname": "total_amount", "fieldtype": "Currency", "width": 150},
        {"label": "Average Deal Size", "fieldname": "average_amount", "fieldtype": "Currency", "width": 150},
    ]

    data = frappe.db.sql(f"""
        SELECT
            lp.product,
            lp.product_name,
            l.custom_zone,
            l.custom_region,
            l.custom_branch,
            COUNT(lp.name) AS lead_count,
            SUM(lp.product_amount) AS total_amount,
            AVG(lp.product_amount) AS average_amount
        FROM `tabLead Product` lp
        INNER JOIN `tabLead` l ON l.name = lp.parent
        WHERE 1=1 {conditions}
        GROUP BY lp.product, lp.product_name, l.custom_zone, l.custom_region, l.custom_branch
        ORDER BY total_amount DESC
    """, {
        "from_date": from_date,
        "to_date": to_date,
        "status": status,
        "zone": zone,
        "region": region,
        "branch": branch
    }, as_dict=True)

    # Aggregating for chart (zone-wise)
    product_map = defaultdict(lambda: {"product_name": "", "lead_count": 0, "total_amount": 0, "zones": defaultdict(float)})
    all_zones = set()

    for row in data:
        key = row["product"]
        zone_name = row["custom_zone"]
        product_map[key]["product_name"] = row["product_name"]
        product_map[key]["lead_count"] += row["lead_count"]
        product_map[key]["total_amount"] += row["total_amount"]
        product_map[key]["zones"][zone_name] += row["total_amount"]
        all_zones.add(zone_name)

    all_zones = sorted(all_zones)
    chart_labels = []
    zone_wise = {zone: [] for zone in all_zones}

    # Final table data
    final_data = []
    for row in data:
        avg_amount = row["total_amount"] / row["lead_count"] if row["lead_count"] else 0
        final_data.append({
            "product": row["product"],
            "product_name": row["product_name"],
            "custom_zone": row["custom_zone"],
            "custom_region": row["custom_region"],
            "custom_branch": row["custom_branch"],
            "lead_count": row["lead_count"],
            "total_amount": row["total_amount"],
            "average_amount": avg_amount
        })

    for product, val in product_map.items():
        chart_labels.append(val["product_name"])
        for zone in all_zones:
            zone_wise[zone].append(val["zones"].get(zone, 0))

    # Grand totals
    total_amount = sum(row["total_amount"] for row in final_data)
    total_leads = sum(row["lead_count"] for row in final_data)
    avg_deal = total_amount / total_leads if total_leads else 0

    if final_data:
        final_data.append({
            "product": "Grand Total",
            "product_name": "",
            "custom_zone": "",
            "custom_region": "",
            "custom_branch": "",
            "lead_count": total_leads,
            "total_amount": total_amount,
            "average_amount": avg_deal,
            "_style": "font-weight: bold; color: darkgreen;"
        })

    # Chart
    catchy_colors = [
        "#FF6F61", "#6A4C93", "#00B8A9", "#F9A825",
        "#EF476F", "#118AB2", "#06D6A0", "#FFD166",
        "#8338EC", "#FB5607"
    ]

    chart = {
        "data": {
            "labels": chart_labels,
            "datasets": [
                {"name": zone, "values": zone_wise[zone]} for zone in all_zones
            ]
        },
        "type": "bar",
        "barOptions": {"stacked": True},
        "height": 120,
        "colors": catchy_colors[:len(all_zones)]
    }

    def inr_format(amount):
        return "₹ {}".format(locale.format_string("%d", amount, grouping=True))

    report_summary = [
        {"label": "Total Business", "value": inr_format(total_amount), "indicator": "Green"},
        {"label": "Total Leads", "value": total_leads, "indicator": "Blue"},
        {"label": "Avg Deal Size", "value": inr_format(round(avg_deal)), "indicator": "Orange"},
    ]

    return columns, final_data, None, chart, report_summary
