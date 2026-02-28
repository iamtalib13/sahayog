import frappe
import os

def get_context(context):
    sahayog_app_path = frappe.get_app_path('sahayog')

    # Read CSS content
    css_path = os.path.join(sahayog_app_path, 'procurement', 'page', 'stockio', 'stockio.css')
    with open(css_path, 'r') as f:
        context.stockio_css = f.read()

    # Read the main HTML template from stockio.js
    js_path = os.path.join(sahayog_app_path, 'procurement', 'page', 'stockio', 'stockio.js')
    with open(js_path, 'r') as f:
        js_content = f.read()
    
    # Extract the HTML template from within the render() method's template literal
    try:
        html_template = js_content.split('this.wrapper.html(`')[1].split('`);')[0]
        context.stockio_html = html_template
    except IndexError:
        context.stockio_html = "<!-- Failed to extract HTML template from stockio.js -->"

    return context
