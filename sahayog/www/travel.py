import frappe

no_cache = 1


def get_context(context):
	# The frontend reads these as globals on `window`. frappe-ui sends
	# csrf_token with every request.
	context.boot = {
		"csrf_token": frappe.sessions.get_csrf_token(),
		"user": frappe.session.user,
	}
