import os
import subprocess
import tempfile
from io import BytesIO

import frappe
from pypdf import PdfReader, PdfWriter


def _get_chrome_bin():
    for c in ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium-browser", "/usr/bin/chromium"]:
        if os.path.exists(c):
            return c
    return "google-chrome"


def generate(print_format=None, html=None, options=None, output=None, pdf_generator=None, **kwargs):
    """Frappe pdf_generator hook for `chrome`.

    Only handles pdf_generator == "chrome", else returns None to let
    wkhtmltopdf handle it.
    """
    if pdf_generator != "chrome":
        return None

    if not html:
        return None

    # Convert /assets/... to file:// so chrome can load without HTTP
    # frappe scrub_urls makes them http://site/... but for file:// we need local path
    # Replace both http and direct /assets
    import re

    def _assets_to_file(m):
        url_path = m.group(0)
        # url_path like /assets/sahayog/images/Dams_Letter_NoStamp.png
        if url_path.startswith("/assets/"):
            rel = url_path[len("/assets/"):]
        else:
            # http URL case, already stripped to /assets/
            rel = url_path[url_path.find("/assets/")+len("/assets/"):]
        # rel = sahayog/images/Dams_Letter_NoStamp.png
        candidate = f"/home/suraiyya/frappe-bench/apps/sahayog/sahayog/public/{rel[len('sahayog/'):] if rel.startswith('sahayog/') else rel}"
        # Fallback to sites/assets
        if os.path.exists(candidate):
            return f"file://{candidate}"
        # Try sites/assets
        site_candidate = f"/home/suraiyya/frappe-bench/sites/assets/{rel}"
        if os.path.exists(site_candidate):
            return f"file://{site_candidate}"
        # Keep original for http fallback
        return url_path

    # Replace http(s)://.../assets/... and bare /assets/... with file://
    # Full http URLs first
    def _http_assets_to_file(m):
        full_url = m.group(0)
        # Extract /assets/... part
        idx = full_url.find("/assets/")
        if idx != -1:
            return _assets_to_file(type('obj', (), {'group': lambda s, n=0: full_url[idx:]})())
        return full_url

    html = re.sub(r"https?://[^\s\"'\)]+/assets/[^\s\"'\)]+", _http_assets_to_file, html)
    html = re.sub(r"/assets/[^\s\"'\)]+", _assets_to_file, html)

    # Also handle /files/... (stamp) - try to map to sites files
    def _files_to_file(m):
        url_path = m.group(0)
        # Strip query string for file existence check
        clean = url_path.split("?")[0]
        # Try public files
        candidate = f"/home/suraiyya/frappe-bench/sites/suraiyya.com/public{clean}"
        if os.path.exists(candidate):
            return f"file://{candidate}"
        candidate2 = f"/home/suraiyya/frappe-bench/sites/suraiyya.com/private{clean}"
        if os.path.exists(candidate2):
            return f"file://{candidate2}"
        return url_path

    html = re.sub(r"https?://[^\s\"'\)]+/private/files/[^\s\"'\)]+", lambda m: _files_to_file(type('obj', (), {'group': lambda s, n=0: m.group(0)[m.group(0).find("/private/files/"): ]})()), html)
    html = re.sub(r"https?://[^\s\"'\)]+/files/[^\s\"'\)]+", lambda m: _files_to_file(type('obj', (), {'group': lambda s, n=0: m.group(0)[m.group(0).find("/files/"): ]})()), html)
    html = re.sub(r"/private/files/[^\s\"'\)]+", _files_to_file, html)
    html = re.sub(r"/files/[^\s\"'\)]+", _files_to_file, html)

    chrome = _get_chrome_bin()

    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as f:
        f.write(html)
        html_path = f.name

    pdf_path = html_path.replace(".html", ".pdf")

    try:
        cmd = [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--no-pdf-header-footer",
            "--print-to-pdf=" + pdf_path,
            "--allow-file-access-from-files",
            "file://" + html_path,
        ]
        # Use --print-to-pdf-no-header if needed, but --no-pdf-header-footer is correct for new headless
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)

        with open(pdf_path, "rb") as pf:
            pdf_bytes = pf.read()

        # If output PdfWriter is provided (for multi-pdf concatenation), append
        if output is not None:
            reader = PdfReader(BytesIO(pdf_bytes))
            output.append_pages_from_reader(reader)
            return output

        return pdf_bytes

    except Exception as e:
        frappe.log_error(f"Chrome PDF generation failed: {e}", "Chrome PDF")
        return None

    finally:
        for p in [html_path, pdf_path]:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass
