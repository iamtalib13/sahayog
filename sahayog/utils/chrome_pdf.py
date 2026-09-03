import os
import re
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


def _resolve_asset_to_file_url(m):
    """Convert /assets/... (bare or http) to file:// if file exists.
    Uses frappe.get_app_path and sites/assets for robustness.
    Accepts re.Match or str.
    """
    url_path = m.group(0) if hasattr(m, "group") else m
    # Extract rel after /assets/
    if url_path.startswith("/assets/"):
        rel = url_path[len("/assets/"):]
    else:
        idx = url_path.find("/assets/")
        if idx == -1:
            return url_path
        rel = url_path[idx + len("/assets/"):]

    # Strip query/hash for filesystem check
    clean_rel = rel.split("?")[0].split("#")[0]

    # Try app public path first (e.g., sahayog/images/...)
    # For rel like sahayog/images/X.png -> apps/sahayog/sahayog/public/images/X.png
    # For rel like frappe/dist/css/... -> apps/frappe/frappe/public/...
    # Need to infer app from first path component
    parts = clean_rel.split("/", 1)
    app_candidate = None
    if len(parts) == 2:
        app_name = parts[0]
        remainder = parts[1]
        try:
            # Check if app exists
            app_public = frappe.get_app_path(app_name, "public")
            candidate = os.path.join(app_public, remainder)
            if os.path.exists(candidate):
                return f"file://{candidate}"
        except Exception:
            pass

    # Fallback: sites/assets/<rel> (symlinked assets after bench build)
    # frappe.local.sites_path may be "." when run via worker; resolve absolut
    sites_path = getattr(frappe.local, "sites_path", None) or frappe.get_site_path("..")
    # Ensure absolute
    if not os.path.isabs(sites_path):
        # frappe.get_site_path("..") gives relative like "./..", normalize via bench path
        # Use get_bench_path helper if available
        try:
            bench_path = frappe.utils.get_bench_path()
            sites_path = os.path.join(bench_path, "sites")
        except Exception:
            sites_path = os.path.abspath(os.path.join(frappe.get_site_path(""), "..", ".."))

    site_candidate = os.path.join(sites_path, "assets", clean_rel)
    # Also try absolute /home/.../sites/assets if relative fails (hardcoded fallback for dev)
    if os.path.exists(site_candidate):
        return f"file://{site_candidate}"

    # Hardcoded fallback for legacy dev paths (keep for compatibility)
    for hard in [f"/home/suraiyya/frappe-bench/sites/assets/{clean_rel}",
                 f"/home/frappe/frappe-bench/sites/assets/{clean_rel}"]:
        if os.path.exists(hard):
            return f"file://{hard}"

    return url_path


def _resolve_file_to_file_url(m):
    """Convert /files/... or /private/files/... to file://.
    Returns original url_path if file not found.
    Accepts re.Match or str.
    """
    url_path = m.group(0) if hasattr(m, "group") else m
    clean = url_path.split("?")[0].split("#")[0]

    # Determine real file location
    # For /private/files/xxx -> sites/<site>/private/files/xxx
    # For /files/xxx -> sites/<site>/public/files/xxx
    site = getattr(frappe.local, "site", None)
    if not site:
        site = frappe.get_site_config().get("site") or "suraiyya.com"

    # Use frappe.get_site_path which is site-aware
    try:
        if clean.startswith("/private/files/"):
            # frappe.get_site_path already includes site prefix handling
            # Need absolute path: sites/<site>/private/files/...
            # frappe.get_site_path("private", "files", basename) returns correct absolute
            filename = os.path.basename(clean)
            # Preserve subfolders beyond private/files?
            sub = clean[len("/private/files/"):]
            candidate = frappe.get_site_path("private", "files", sub)
            # get_site_path may be relative like ./suraiyya.com/private/files/... -> make absolute
            if not os.path.isabs(candidate):
                candidate = os.path.abspath(candidate)
            if os.path.exists(candidate):
                return f"file://{candidate}"
            # Fallback absolute hardcoded
            for hard in [f"/home/suraiyya/frappe-bench/sites/{site}/private{clean}",
                         f"/home/frappe/frappe-bench/sites/{site}/private{clean}"]:
                if os.path.exists(hard):
                    return f"file://{hard}"
        elif clean.startswith("/files/"):
            sub = clean[len("/files/"):]
            candidate = frappe.get_site_path("public", "files", sub)
            if not os.path.isabs(candidate):
                candidate = os.path.abspath(candidate)
            if os.path.exists(candidate):
                return f"file://{candidate}"
            for hard in [f"/home/suraiyya/frappe-bench/sites/{site}/public{clean}",
                         f"/home/frappe/frappe-bench/sites/{site}/public{clean}"]:
                if os.path.exists(hard):
                    return f"file://{hard}"
    except Exception:
        pass

    return url_path


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
    # Handle both bare and http(s) URLs. Order: http first then bare.

    def _http_assets_to_file(m):
        full_url = m.group(0)
        idx = full_url.find("/assets/")
        if idx != -1:
            bare = full_url[idx:]
            converted = _resolve_asset_to_file_url(bare)
            # If conversion succeeded (file://), return it, else keep http url
            return converted
        return full_url

    def _http_private_to_file(m):
        full_url = m.group(0)
        idx = full_url.find("/private/files/")
        if idx != -1:
            bare = full_url[idx:]
            return _resolve_file_to_file_url(bare)
        idx = full_url.find("/files/")
        if idx != -1:
            bare = full_url[idx:]
            return _resolve_file_to_file_url(bare)
        return full_url

    # HTTP(S) assets first
    html = re.sub(r"https?://[^\s\"'\)]+/assets/[^\s\"'\)]+", _http_assets_to_file, html)
    html = re.sub(r"https?://[^\s\"'\)]+/private/files/[^\s\"'\)]+", lambda m: _resolve_file_to_file_url(m.group(0)[m.group(0).find("/private/files/"):]), html)
    html = re.sub(r"https?://[^\s\"'\)]+/files/[^\s\"'\)]+", lambda m: _resolve_file_to_file_url(m.group(0)[m.group(0).find("/files/"):]), html)

    # Bare paths (must run after http to avoid double conversion of file://)
    html = re.sub(r"/assets/[^\s\"'\)]+", _resolve_asset_to_file_url, html)
    html = re.sub(r"/private/files/[^\s\"'\)]+", _resolve_file_to_file_url, html)
    html = re.sub(r"/files/[^\s\"'\)]+", _resolve_file_to_file_url, html)

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
            "--disable-dev-shm-usage",
            "file://" + html_path,
        ]
        result = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)

        # Log chrome stderr for debugging (if any errors, log)
        stderr_text = result.stderr.decode(errors="ignore")
        if stderr_text and ("ERROR" in stderr_text or "Failed" in stderr_text):
            frappe.logger("chrome_pdf").info(f"Chrome stderr: {stderr_text[:2000]}")

        with open(pdf_path, "rb") as pf:
            pdf_bytes = pf.read()

        if output is not None:
            reader = PdfReader(BytesIO(pdf_bytes))
            output.append_pages_from_reader(reader)
            return output

        return pdf_bytes

    except subprocess.CalledProcessError as e:
        err = e.stderr.decode(errors="ignore") if e.stderr else str(e)
        frappe.log_error(f"Chrome PDF generation failed (CalledProcessError): {err}\nHTML snippet: {html[:2000]}", "Chrome PDF")
        return None
    except Exception as e:
        # Include html snippet for debugging
        frappe.log_error(f"Chrome PDF generation failed: {e}\n{frappe.get_traceback()}\nHTML snippet: {html[:2000]}", "Chrome PDF")
        return None

    finally:
        for p in [html_path, pdf_path]:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass
