import frappe

def execute():
    if frappe.db.exists("Letter Head", "Disciplinary Case"):
        lh = frappe.get_doc("Letter Head", "Disciplinary Case")
        lh.content = """<!-- Header Section -->
<div style="width:100%; height:100px; display:flex; align-items:center; padding:10px; font-family:Arial, sans-serif;">
    <img src="/assets/sahayog/images/sahayog_logo_2025.png" alt="Logo" style="height:60px;">
</div>
<!-- Bottom Strip -->
<div style="width:100%; background-color:#00a0a0; color:#fff; padding:5px 10px; display:flex; justify-content:space-between; font-size:11px; font-weight:bold; letter-spacing:0.5px; font-family:Arial, sans-serif;">
    {% if doc.doctype != 'Branch Visit Review' %}<div>॥ जहाँ रुपये से अधिक मनुष्य का मूल्य है ॥</div>{% else %}<div></div>{% endif %}
    <div>WHERE MAN IS WORTH MORE THAN MONEY</div>
    <div>॥ धनाधिक मुल्यम् मनुष्य रुपम् ॥</div>
</div>"""
        lh.save(ignore_permissions=True)
        frappe.db.commit()
