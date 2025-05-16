frappe.ui.form.on('Letter of Intent', {
    onload_post_render: function (frm) {
        // Format Aadhar and Mobile Number if already present
        if (frm.doc.aadhar_number) {
            frm.set_value('aadhar_number', formatAadhar(frm.doc.aadhar_number));
        }
        if (frm.doc.mobile_number) {
            frm.set_value('mobile_number', formatMobileNumber(frm.doc.mobile_number));
        }
        if (frm.doc.pan_number) {
            frm.set_value('pan_number', formatPanNumber(frm.doc.pan_number));
        }
    },
    aadhar_number: function (frm) {
        // Format Aadhar Number dynamically while typing
        if (frm.doc.aadhar_number) {
            frm.set_value('aadhar_number', formatAadhar(frm.doc.aadhar_number));
        }
    },
    mobile_number: function (frm) {
        // Format Mobile Number dynamically while typing
        if (frm.doc.mobile_number) {
            frm.set_value('mobile_number', formatMobileNumber(frm.doc.mobile_number));
        }
    },
	pan_number: function (frm) {
        // Format PAN Number dynamically while typing
        if (frm.doc.pan_number) {
            frm.set_value('pan_number', formatPanNumber(frm.doc.pan_number));
        }
    },
	before_save: function(frm) {
        // Clean up the spaces in the mobile number before saving
        if (frm.doc.mobile_number) {
            frm.set_value('mobile_number', frm.doc.mobile_number.replace(/\s/g, ''));
        }
		//Clean up the PAN number before saving
        if (frm.doc.pan_number) {
            frm.set_value('pan_number', frm.doc.pan_number.replace(/\s/g, ''));
        }
        
    },
	refresh: function(frm) {
        // For aadhar_number: Handle input dynamically, ensuring it's up to 12 digits, and formatted
        frm.fields_dict['aadhar_number'].$input.on('input', function() {
            let field = frm.fields_dict['aadhar_number'];
            let currentValue = field.$input.val();

            // Only allow up to 12 digits and prevent typing further digits
            if (currentValue.replace(/\D/g, '').length > 12) {
                field.$input.val(currentValue.substring(0, 12)); // Limit to 12 digits
            }

            // Apply the format as XXXX XXXX XXXX
            let formattedValue = formatAadhar(currentValue);
            if (currentValue !== formattedValue) {
                field.$input.val(formattedValue); // Update value with formatted version
            }
        });

        // For mobile_number: Handle input dynamically, ensuring it's up to 10 digits, and formatted
        frm.fields_dict['mobile_number'].$input.on('input', function() {
            let field = frm.fields_dict['mobile_number'];
            let currentValue = field.$input.val();

            // Only allow up to 10 digits and prevent typing further digits
            if (currentValue.replace(/\D/g, '').length > 10) {
                field.$input.val(currentValue.substring(0, 10)); // Limit to 10 digits
            }

            // Apply the format as XXXXX XXXXX
            let formattedValue = formatMobileNumber(currentValue);
            if (currentValue !== formattedValue) {
                field.$input.val(formattedValue); // Update value with formatted version
            }
        });

        // Handle input dynamically for pan_number
        frm.fields_dict['pan_number'].$input.on('input', function () {
            let field = frm.fields_dict['pan_number']; // Reference to pan_number field
            let currentValue = field.$input.val();

            // Limit to 10 characters, only allow alphanumeric characters
            if (currentValue.replace(/\W/g, '').length > 10) {
                field.$input.val(currentValue.substring(0, 10)); // Limit to 10 characters
            }

            // Apply the PAN number format: 'XXXXX1234X'
            let formattedValue = formatPanNumber(currentValue);
            if (currentValue !== formattedValue) {
                field.$input.val(formattedValue); // Update value with formatted version
            }
        });
    }
});

// Block any non-numeric keypress for Aadhar and Mobile Number fields
frappe.ui.keys.on('keypress', function (event) {
    let field = document.activeElement;

    // Check if the active field is aadhar_number or mobile_number field
    if (field && (field.dataset.fieldname === "aadhar_number" || field.dataset.fieldname === "mobile_number")) {
        let char = String.fromCharCode(event.which);

        // If the character is not a digit (0-9), prevent the keypress
        if (!/^\d$/.test(char)) {
            event.preventDefault();  // Block non-numeric keys
        }
    }
});

// Function to format Aadhar number to XXXX XXXX XXXX
function formatAadhar(aadhar) {
    // Remove non-numeric characters (if any)
    aadhar = aadhar.replace(/\D/g, '');

    // Limit the length to 12 digits
    aadhar = aadhar.substring(0, 12);

    // Format it as "XXXX XXXX XXXX"
    return aadhar.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

// Function to format Mobile number to XXXXX XXXXX
function formatMobileNumber(mobile) {
    // Remove non-numeric characters (if any)
    mobile = mobile.replace(/\D/g, '');

    // Limit the length to 10 digits
    mobile = mobile.substring(0, 10);

    // Format it as "XXXXX XXXXX"
    return mobile.replace(/(\d{5})(?=\d)/g, '$1 ').trim();
}
// Function to format PAN Number to 'ABCDE1234F'
function formatPanNumber(pan) {
    // Remove any non-alphanumeric characters
    pan = pan.replace(/\W/g, '');

    // Limit the length to 10 characters
    pan = pan.substring(0, 10);

    // Automatically convert to uppercase
    pan = pan.toUpperCase();

    return pan;
}
