import frappe
from frappe.utils import getdate
from PIL import Image, ImageDraw, ImageFont
import base64
from io import BytesIO
import os

@frappe.whitelist()
def generate_share_certificate(transfer_doc_name, debug_mode=False):
    """
    Generates a share certificate by drawing text onto a PNG template,
    including shareholder details from the Shareholder doctype.
    If debug_mode=True, it will draw grid + bounding boxes for easy placement.
    """
    try:
        # 1. Fetch the Share Transfer document
        doc = frappe.get_doc("Share Transfer", transfer_doc_name)

        # 2. Fetch Shareholder details
        shareholder_name = ""
        shareholder_address = ""
        if doc.get("to_shareholder"):
            try:
                shareholder = frappe.get_doc("Shareholder", doc.to_shareholder)
                shareholder_name = shareholder.get("customer_name", "")
                shareholder_address = shareholder.get("address", "")
            except frappe.DoesNotExistError:
                frappe.log_error(f"Shareholder {doc.to_shareholder} not found", "Certificate Generation")

        # 3. Load certificate template
        template_path = frappe.get_app_path("sahayog", "public", "images", "share_certificate.png")
        cert_image = Image.open(template_path).convert("RGBA")
        draw = ImageDraw.Draw(cert_image)

        # 4. Define fonts (portable)
        title_font = ImageFont.load_default()
        try:
            font_path_str = frappe.get_app_path("sahayog", "public", "fonts", "DejaVuSansMono-Bold.ttf")
            if os.path.exists(font_path_str):
                title_font = ImageFont.truetype(font_path_str, size=50)
            else:
                frappe.log_error(f"Font file not found at: {font_path_str}", "Certificate Generation")
        except Exception as e:
            frappe.log_error(f"Font load error: {e}", "Certificate Generation")

        text_color = (0, 0, 0)  # Black

        # 5. Debugging helpers
        if debug_mode:
            add_grid(draw, cert_image.width, cert_image.height, step=50)

        # 6. Prepare formatted date (dd-mm-yyyy)
        formatted_date = ""
        if doc.get("date"):
            try:
                formatted_date = getdate(doc.date).strftime("%d-%m-%Y")
            except Exception:
                formatted_date = str(doc.get("date"))

        # 7. Draw dynamic data
        draw_text = draw_text_in_template #if debug_mode else draw.text

        # LEFT side certificate details
        draw_text(draw, (310, 680), str(shareholder_name), font=title_font, fill=text_color)

        # --- Address handling (single line with overflow wrapping) ---
        address = str(shareholder_address)
        if address:
            start_x, start_y = 210, 765
            max_x = 1400
            bbox = draw.textbbox((start_x, start_y), address, font=title_font)
            text_width = bbox[2] - bbox[0]

            if start_x + text_width <= max_x:
                draw_text(draw, (start_x, start_y), address, font=title_font, fill=text_color)
            else:
                words = address.split(" ")
                line1, line2 = "", ""
                for word in words:
                    test_line = (line1 + " " + word).strip()
                    test_width = draw.textlength(test_line, font=title_font)
                    if start_x + test_width <= max_x:
                        line1 = test_line
                    else:
                        line2 = " ".join(words[words.index(word):])
                        break
                draw_text(draw, (start_x, start_y), line1, font=title_font, fill=text_color)
                if line2:
                    draw_text(draw, (100, 850), line2, font=title_font, fill=text_color)

        draw_text(draw, (480, 935), str(doc.get("no_of_shares", "")), font=title_font, fill=text_color)
        draw_text(draw, (230, 1010), str(doc.get("from_no", "")), font=title_font, fill=text_color)
        draw_text(draw, (810, 1010), str(doc.get("to_no", "")), font=title_font, fill=text_color)
        draw_text(draw, (170, 1180), str(doc.get("amount", "")), font=title_font, fill=text_color)
        draw_text(draw, (520, 1840), formatted_date, font=title_font, fill=text_color)
        # LEFT side ends

        # RIGHT side certificate details
        draw_text(draw, (1810, 920), str(shareholder_name), font=title_font, fill=text_color)
        draw_text(draw, (1670, 1030), str(shareholder_address), font=title_font, fill=text_color)
        draw_text(draw, (2050, 1145), str(doc.get("no_of_shares", "")), font=title_font, fill=text_color)
        draw_text(draw, (2890, 1145), str(doc.get("from_no", "")), font=title_font, fill=text_color)
        draw_text(draw, (3415, 1145), str(doc.get("to_no", "")), font=title_font, fill=text_color)
        draw_text(draw, (3230, 1255), str(doc.get("amount","")), font=title_font, fill=text_color)
        draw_text(draw, (2280, 1920), formatted_date, font=title_font, fill=text_color)
        # RIGHT side ends

        # 8. Save to buffer and return
        buffered = BytesIO()
        cert_image.save(buffered, format="PDF")
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return {
            "file_data": img_str,
            "file_name": f"Certificate-{shareholder_name.replace(' ', '_')}-{doc.name}.pdf"
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Certificate Generation Failed")
        return None

# 🔹 Helper: Add grid overlay
def add_grid(draw, image_width, image_height, step=50):
    """Draws a coordinate grid with numbers to help find positions easily."""
    for x in range(0, image_width, step):
        draw.line([(x, 0), (x, image_height)], fill=(200, 200, 200), width=1)
        draw.text((x+5, 5), str(x), fill=(100, 100, 100))
    for y in range(0, image_height, step):
        draw.line([(0, y), (image_width, y)], fill=(200, 200, 200), width=1)
        draw.text((5, y+5), str(y), fill=(100, 100, 100))

# 🔹 Helper: Draw text with bounding box
def draw_text_in_template(draw, position, text, font, fill=(0, 0, 0)):
    """Draws text and a red rectangle around it to visualize placement."""
    x, y = position
    draw.text((x, y), text, font=font, fill=fill)
    
    # 🔹 RED Rectangle
    # bbox = draw.textbbox((x, y), text, font=font)
    # draw.rectangle(bbox, outline="red", width=2)  # red box for debugging