frappe.ui.form.on("Agent Lead", {
	refresh(frm) {
		// 📱 Real-time Mobile Number Strict Typing Restriction (Desk Form)
		["mobile_no", "alternate_number"].forEach(fieldname => {
			if (frm.fields_dict[fieldname] && frm.fields_dict[fieldname].$input) {
				const $input = frm.fields_dict[fieldname].$input;
				$input.attr("maxlength", "10");
				$input.off("input.strict_mobile").on("input.strict_mobile", function() {
					let val = this.value.replace(/\D/g, ""); // Strip non-digits instantly
					if (val.length > 0 && !/^[6-9]/.test(val)) {
						val = ""; // Clear if first digit is not 6, 7, 8, 9
					}
					if (val.length > 10) {
						val = val.substring(0, 10);
					}
					this.value = val;
					frm.set_value(fieldname, val);
				});
			}
		});

		// 📍 Real-time PIN Code Strict Typing Restriction (6 digits max)
		if (frm.fields_dict.pincode && frm.fields_dict.pincode.$input) {
			const $input = frm.fields_dict.pincode.$input;
			$input.attr("maxlength", "6");
			$input.off("input.strict_pin").on("input.strict_pin", function() {
				let val = this.value.replace(/\D/g, "");
				if (val.length > 6) {
					val = val.substring(0, 6);
				}
				this.value = val;
				frm.set_value("pincode", val);
			});
		}

		// 🎂 Real-time Age Restriction (Positive digits only, max 3 digits)
		if (frm.fields_dict.age && frm.fields_dict.age.$input) {
			const $input = frm.fields_dict.age.$input;
			$input.attr("maxlength", "3");
			$input.off("input.strict_age").on("input.strict_age", function() {
				let val = this.value.replace(/\D/g, "");
				this.value = val;
				frm.set_value("age", val);
			});
		}

		// 📧 Strict Email Format Check on blur
		if (frm.fields_dict.email_id && frm.fields_dict.email_id.$input) {
			const $input = frm.fields_dict.email_id.$input;
			$input.off("blur.strict_email").on("blur.strict_email", function() {
				let val = (this.value || "").trim();
				if (val && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
					frappe.msgprint(__('Please enter a valid Email ID (e.g. name@domain.com)'));
					this.value = "";
					frm.set_value("email_id", "");
				}
			});
		}
	},

	// 🏢 Auto-populate State and City/District when Sahayog Branch is selected
	branch(frm) {
		if (frm.doc.branch) {
			frappe.db.get_doc("Sahayog Branch", frm.doc.branch).then(b => {
				if (b) {
					if (b.state) frm.set_value("state", b.state);
					if (b.district) frm.set_value("city_district", b.district);
				}
			});
		}
	}
});
