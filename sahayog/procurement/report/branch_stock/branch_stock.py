import frappe
def execute(filters=None):
    filters = filters or {}

    columns = [
        dict(fieldname='item_code', label='Item Code', fieldtype='Link', options='Item', width=150),
        dict(fieldname='item_name', label='Item Name', fieldtype='Data', width=200),
        dict(fieldname='warehouse', label='Warehouse', fieldtype='Link', options='Warehouse', width=150),
        dict(fieldname='stock_balance', label='Stock Balance', fieldtype='Float', width=100),
        dict(fieldname="issue",label="Issue",fieldtype="Data",width=80),

    ]

    conditions = []
    values = {}

    # Only show records for "Stores - S"
    conditions.append('bin.warehouse = %(warehouse)s')
    values['warehouse'] = 'Stores - S'

    where_clause = 'WHERE ' + ' AND '.join(conditions) if conditions else ''

    query = f'''
        SELECT
            bin.item_code,
            item.item_name,
            bin.warehouse,
            SUM(bin.actual_qty) as stock_balance
        FROM `tabBin` bin
        LEFT JOIN `tabItem` item ON bin.item_code = item.name
        {where_clause}
        GROUP BY bin.item_code, item.item_name, bin.warehouse
        ORDER BY bin.item_code ASC
    '''

    data = frappe.db.sql(query, values, as_dict=True)

    return columns, data
