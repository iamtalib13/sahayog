import frappe
from frappe import _

@frappe.whitelist()
def get_data(chart_name=None, filters=None, from_date=None, to_date=None, refresh=None, time_interval=None, timespan=None, heatmap_year=None):
    """
    Returns stacked bar chart data for Disciplinary Cases
    X-axis: Zones
    Stacked by: Regions
    """
    
    # Parse filters if provided as JSON string
    if filters and isinstance(filters, str):
        import json
        filters = json.loads(filters)
    
    # Extract filter values from filters dict
    if not from_date and filters:
        from_date = filters.get("from_date")
    if not to_date and filters:
        to_date = filters.get("to_date")
    
    # Build WHERE conditions - NO PARAMS, direct string formatting
    conditions = []
    
    if from_date:
        conditions.append(f"issue_occurrence_date >= '{from_date}'")
    if to_date:
        conditions.append(f"issue_occurrence_date <= '{to_date}'")
    
    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)
    
    # Fetch grouped data from database
    query = f"""
        SELECT 
            COALESCE(zone, 'No Zone') as zone,
            COALESCE(region, 'No Region') as region,
            COUNT(name) as count
        FROM `tabDisciplinary Case`
        {where_clause}
        GROUP BY zone, region
        ORDER BY zone, region
    """
    
    # Execute query WITHOUT params tuple - just pass query
    data = frappe.db.sql(query, as_dict=1)
    
    # Handle empty data case
    if not data:
        return {
            "labels": ["No Data"],
            "datasets": [{"name": "No Data", "values": [0]}]
        }
    
    # Extract unique zones for X-axis labels
    zones = []
    seen_zones = set()
    for row in data:
        if row.zone not in seen_zones:
            zones.append(row.zone)
            seen_zones.add(row.zone)
    
    # Extract unique regions for datasets
    regions_set = set()
    for row in data:
        regions_set.add(row.region)
    regions = sorted(list(regions_set))
    
    # Build datasets - one dataset per region
    datasets = []
    for region in regions:
        values = []
        for zone in zones:
            # Find count for this zone-region combination
            count = 0
            for row in data:
                if row.zone == zone and row.region == region:
                    count = row.count
                    break
            values.append(count)
        
        datasets.append({
            "name": region,
            "values": values
        })
    
    # Return data in Frappe Charts format
    return {
        "labels": zones,
        "datasets": datasets
    }