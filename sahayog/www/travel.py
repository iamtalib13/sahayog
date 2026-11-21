import frappe

no_cache = 1


def get_context(context):
	# The frontend reads these as globals on `window`. frappe-ui sends
	# csrf_token with every request.
	user = frappe.session.user
	context.boot = {
		"csrf_token": frappe.sessions.get_csrf_token(),
		"user": user,
		"roles": frappe.get_roles(user),
	}
