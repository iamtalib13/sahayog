import frappe

def execute():
    letter_head_name = "Sahayog Letter Head"
    print(f"🔍 Checking Letter Head: {letter_head_name}")

    content = """
    <style>
        @media print {
            .print-header {
                top: 0;
                width: 100%;
            }
        }
    </style>
    
    <div class="print-header">
        <div style="text-align: left; margin-bottom: 10px;">
            <img src="/files/Sahayog.png" alt="Company Logo" style="height: 70px; width: auto;">
            <hr>
        </div>
    </div>
    <br>
    """

    footer = """
    <div class="footer" style="font-size: 10px;">
            <strong>SAHAYOG Multi-State Credit Co-Operative Society Ltd.</strong><br>
            Shri Ji Complex, Opp. Bisen Petrol Pump, Gayatri Mandir Road, Gondia<br>
            Pincode: 441614, Contact No.: 9209008484 / 9370245105<br>
            Email: purchase@sahayogmultistate.com<br>
    </div>
    """

    if not frappe.db.exists("Letter Head", letter_head_name):
        print("➕ Creating new Letter Head...")
        doc = frappe.get_doc({
            "doctype": "Letter Head",
            "letter_head_name": letter_head_name,
            "is_default": 1,
            "enabled": 1,
            "source": "HTML",  # set here
            "footer_source": "HTML",
            "content": content,
            "footer": footer,
            "letter_head_image": None,
            "image_width": 0,
            "image_height": 0
        }).insert(ignore_permissions=True)
        # override again to ensure correct value
        doc.source = "HTML"
        doc.footer_source = "HTML"
        doc.save(ignore_permissions=True)
        print("✅ Created and corrected source.")
    else:
        print("✏️ Updating existing Letter Head...")
        doc = frappe.get_doc("Letter Head", letter_head_name)
        doc.update({
            "is_default": 1,
            "enabled": 1,
            "source": "HTML",  # update
            "footer_source": "HTML",
            "content": content,
            "footer": footer,
            "letter_head_image": None,
            "image_width": 0,
            "image_height": 0
        })
        doc.source = "HTML"
        doc.footer_source = "HTML"
        doc.save(ignore_permissions=True)
        print("✅ Updated and enforced source as HTML.")

    frappe.db.commit()
    print("💾 All changes committed.")
