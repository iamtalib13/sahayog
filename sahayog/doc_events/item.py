import frappe

def item_name_capital(doc, method):
    """Capitalize every word in item_name, even after hyphens (-)."""
    if doc.item_name:
        def capitalize_word(word):
            return '-'.join([w.capitalize() for w in word.split('-')])
        
        doc.item_name = ' '.join([capitalize_word(word) for word in doc.item_name.split(' ')])
