frappe.ready(function() {
	// Add custom styling for mandatory red labels
	$("<style>")
		.prop("type", "text/css")
		.html(`
			.web-form-page .reqd,
			.web-form-page label.reqd::after {
				color: #dc2626 !important;
				font-weight: bold;
			}
			.web-form-page .btn-primary {
				background-color: #05a15d !important;
				border-color: #05a15d !important;
				font-weight: 600;
				padding: 10px 24px;
				font-size: 14px;
				border-radius: 6px;
			}
			.web-form-page .form-section {
				background: #ffffff;
				padding: 15px;
				border-radius: 8px;
				border: 1px solid #e5e7eb;
				margin-bottom: 15px;
			}
		`)
		.appendTo("head");

	// 📱 Real-time Mobile Number Strict Input Filter (Only digits 6-9 first, max 10 digits)
	function apply_mobile_restriction(fieldname) {
		const $input = $(`[data-fieldname="${fieldname}"] input`);
		if ($input.length) {
			$input.attr("maxlength", "10");
			$input.on("input", function() {
				let val = this.value.replace(/\D/g, ""); // Strip non-digits (minus, letters, symbols)
				if (val.length > 0 && !/^[6-9]/.test(val)) {
					val = ""; // Clear if not starting with 6, 7, 8, 9
				}
				if (val.length > 10) {
					val = val.substring(0, 10);
				}
				this.value = val;
				frappe.web_form.set_value(fieldname, val);
			});
		}
	}

	// 📍 Real-time PIN Code Strict Filter (Only digits 1-9 first, max 6 digits)
	function apply_pincode_restriction(fieldname) {
		const $input = $(`[data-fieldname="${fieldname}"] input`);
		if ($input.length) {
			$input.attr("maxlength", "6");
			$input.on("input", function() {
				let val = this.value.replace(/\D/g, "");
				if (val.length > 6) {
					val = val.substring(0, 6);
				}
				this.value = val;
				frappe.web_form.set_value(fieldname, val);
			});
		}
	}

	// 🎂 Real-time Age Filter (Only positive digits)
	function apply_age_restriction(fieldname) {
		const $input = $(`[data-fieldname="${fieldname}"] input`);
		if ($input.length) {
			$input.attr("maxlength", "3");
			$input.on("input", function() {
				let val = this.value.replace(/\D/g, "");
				this.value = val;
				frappe.web_form.set_value(fieldname, val);
			});
		}
	}

	// 📧 Strict Email Format Check on blur
	function apply_email_restriction(fieldname) {
		const $input = $(`[data-fieldname="${fieldname}"] input`);
		if ($input.length) {
			$input.on("blur", function() {
				let val = (this.value || "").trim();
				if (val && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
					frappe.msgprint(__('Please enter a valid Email ID (e.g. name@domain.com)'));
					this.value = "";
					frappe.web_form.set_value(fieldname, "");
				}
			});
		}
	}

	setTimeout(function() {
		apply_mobile_restriction("mobile_no");
		apply_mobile_restriction("alternate_number");
		apply_pincode_restriction("pincode");
		apply_age_restriction("age");
		apply_email_restriction("email_id");
	}, 300);

	// 🏢 Auto-fetch State and City/District from Sahayog Branch in Web Form
	frappe.web_form.on('branch', (field, value) => {
		if (value) {
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Sahayog Branch",
					name: value
				},
				callback: function(r) {
					if (r.message) {
						if (r.message.state) frappe.web_form.set_value('state', r.message.state);
						if (r.message.district) frappe.web_form.set_value('city_district', r.message.district);
					}
				}
			});
		}
	});

	// Auto success handling on form submit
	frappe.web_form.after_save = function() {
		frappe.msgprint({
			title: __('Application Submitted!'),
			indicator: 'green',
			message: __('Thank you for applying for the WaFHa Agent Program. Our representative will contact you shortly.')
		});
	};
});
