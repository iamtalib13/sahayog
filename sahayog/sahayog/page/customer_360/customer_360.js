frappe.pages['customer-360'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Customer 360',
        single_column: true
    });

    // 1. Hide the Default Title & Header
    page.main.find('.page-head').hide();
    
    // 2. FULL SCREEN HACK (Scoped to this page instance)
    // We traverse up to find the main container and force it to be full width/height
    const $pageContainer = $(wrapper).closest('.page-container');
    const $layoutMain = $(wrapper).closest('.layout-main-section');
    
    // Apply styles inline to override Frappe defaults strictly for this view
    $pageContainer.css({
        'margin': '0',
        'padding': '0',
        'max-width': '100%',
        'background-color': 'transparent',
        'width': '100%'
    });
    
    $layoutMain.css({
        'padding': '0',
        'border': 'none',
        'box-shadow': 'none',
        'background-color': 'transparent'
    });

    // Remove the white background from the standard wrapper
    $(wrapper).css('padding', '0');

    // 3. Initialize UI with a unique Root ID for CSS scoping
    new Customer360UI(page.body);
};

class Customer360UI {
    constructor(parent) {
        this.parent = parent;
        // Assign a unique ID to the root for CSS Scoping
        this.rootId = 'c360-root-' + frappe.utils.get_random(5);
        this.parent.attr('id', this.rootId);
        
        this.inject_css();
        this.render_interface();
        this.setup_validators();
    }

    inject_css() {
        // NOTE: All selectors start with #${this.rootId} to prevent global leaks
        const css = `
            /* Variables Scope */
            #${this.rootId} {
                --c360-primary: #6366f1;
                --c360-success: #10b981;
                --c360-error: #ef4444;
                --c360-bg: #f3f4f6;
                --c360-card-bg: rgba(255, 255, 255, 0.9);
                --c360-glass: rgba(255, 255, 255, 0.8);
                --c360-text-main: #1f2937;
                --c360-text-sub: #6b7280;
                --c360-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            }
            [data-theme="dark"] #${this.rootId} {
                --c360-primary: #818cf8;
                --c360-bg: #0f172a;
                --c360-card-bg: rgba(30, 41, 59, 0.9);
                --c360-glass: rgba(30, 41, 59, 0.8);
                --c360-text-main: #f1f5f9;
                --c360-text-sub: #94a3b8;
                --c360-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }

            /* Full Screen Wrapper */
            #${this.rootId} .c360-wrapper {
                font-family: 'Inter', sans-serif;
                background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent 40%),
                            radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.15), transparent 40%),
                            var(--c360-bg);
                min-height: calc(100vh - 45px); /* Subtract Navbar height */
                width: 100vw; /* Force full viewport width */
                margin-left: calc(-50vw + 50%); /* Center trick to break container if needed */
                padding: 60px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                box-sizing: border-box;
                position: relative;
                top: 0;
                left: 0;
            }

            /* Search Section */
            #${this.rootId} .c360-hero {
                text-align: center;
                margin-bottom: 60px;
                width: 100%;
                max-width: 900px;
                animation: slideDown 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            
            #${this.rootId} .c360-title {
                font-size: 4rem;
                font-weight: 800;
                background: linear-gradient(135deg, var(--c360-primary) 0%, #d946ef 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
                letter-spacing: -2px;
                line-height: 1.1;
            }
            
            #${this.rootId} .c360-subtitle {
                 color: var(--c360-text-sub);
                 font-size: 1.25rem;
                 margin-bottom: 40px;
            }

            /* Glass Bar */
            #${this.rootId} .c360-search-bar {
                display: flex;
                align-items: center;
                background: var(--c360-glass);
                padding: 10px;
                border-radius: 24px;
                box-shadow: var(--c360-shadow);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.2);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            #${this.rootId} .c360-search-bar:focus-within {
                transform: translateY(-2px);
                box-shadow: 0 30px 60px -10px rgba(99, 102, 241, 0.25);
            }

            #${this.rootId} .c360-select {
                padding: 18px 25px;
                border: none;
                background: transparent;
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--c360-text-main);
                cursor: pointer;
                outline: none;
                border-right: 1px solid rgba(156, 163, 175, 0.2);
                min-width: 160px;
            }

            #${this.rootId} .c360-input {
                flex: 1;
                padding: 18px 25px;
                border: none;
                background: transparent;
                font-size: 1.2rem;
                color: var(--c360-text-main);
                outline: none;
                min-width: 300px;
            }

            #${this.rootId} .c360-btn {
                background: linear-gradient(135deg, var(--c360-primary) 0%, #8b5cf6 100%);
                color: white;
                border: none;
                padding: 16px 45px;
                border-radius: 16px;
                font-weight: 600;
                font-size: 1.1rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            #${this.rootId} .c360-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                filter: grayscale(1);
            }
            #${this.rootId} .c360-btn:hover:not(:disabled) {
                transform: scale(1.02);
                box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
            }

            /* Results Grid */
            #${this.rootId} .c360-results {
                width: 100%;
                max-width: 1200px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 25px;
                padding-bottom: 50px;
            }

            #${this.rootId} .c360-card {
                background: var(--c360-card-bg);
                border-radius: 24px;
                padding: 30px;
                box-shadow: var(--c360-shadow);
                border: 1px solid rgba(255,255,255,0.1);
                animation: popUp 0.6s forwards;
                opacity: 0;
                transform: translateY(20px);
                transition: transform 0.3s;
            }
            #${this.rootId} .c360-card:hover {
                transform: translateY(-5px);
            }

            @keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes popUp { to { opacity: 1; transform: translateY(0); } }
        `;
        
        $('<style>').text(css).appendTo('head');
    }

    render_interface() {
        const html = `
            <div class="c360-wrapper">
                <div class="c360-hero">
                    <h1 class="c360-title">Customer 360</h1>
                    <p class="c360-subtitle">Finacle Intelligence Portal</p>
                    
                    <div class="c360-search-bar" id="search-container">
                        <select class="c360-select" id="kyc-type">
                            <option value="Mobile">Mobile No</option>
                            <option value="Aadhaar">Aadhaar UID</option>
                            <option value="PAN">PAN Number</option>
                            <option value="Voter ID">Voter ID</option>
                            <option value="Driving Licence">Driving License</option>
                        </select>
                        
                        <input type="text" class="c360-input" id="kyc-input" placeholder="Enter 10-digit Mobile Number" autocomplete="off">
                        
                        <button class="c360-btn" id="search-btn" disabled>Search</button>
                    </div>
                    <div id="validation-msg" style="color:var(--c360-error); margin-top:10px; min-height:20px; font-weight:500;"></div>
                </div>
                
                <div class="c360-results" id="results-area"></div>
            </div>
        `;
        this.parent.html(html);
    }

    setup_validators() {
        // Regex Patterns
        this.validators = {
            'Mobile': { regex: /^[6-9]\d{9}$/, placeholder: 'Enter 10-digit Mobile Number', error: 'Invalid Mobile Number' },
            'Aadhaar': { regex: /^\d{12}$/, placeholder: 'Enter 12-digit Aadhaar Number', error: 'Invalid Aadhaar (Must be 12 digits)' },
            'PAN': { regex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, placeholder: 'Ex: ABCDE1234F', error: 'Invalid PAN Format', mask: true },
            'Voter ID': { regex: /^[A-Z]{3}[0-9]{7}$/, placeholder: 'Ex: ABC1234567', error: 'Invalid Voter ID Format', mask: true },
            'Driving Licence': { regex: /^[A-Z0-9\s\-]{10,20}$/, placeholder: 'Enter DL Number', error: 'Invalid DL Format', mask: true }
        };

        const $input = $('#kyc-input');
        const $type = $('#kyc-type');
        const $btn = $('#search-btn');
        const $msg = $('#validation-msg');

        $type.on('change', () => {
            const rules = this.validators[$type.val()];
            $input.val('').attr('placeholder', rules.placeholder).focus();
            $msg.text('');
            $btn.prop('disabled', true);
        });

        $input.on('input', () => {
            let val = $input.val();
            const rules = this.validators[$type.val()];
            
            if (rules.mask) {
                val = val.toUpperCase();
                $input.val(val);
            }

            if(rules.regex.test(val)) {
                $btn.prop('disabled', false);
                $msg.text('');
            } else {
                $btn.prop('disabled', true);
                if(val.length > 0) $msg.text(rules.error);
                else $msg.text('');
            }
        });

        $btn.on('click', () => this.perform_search());
        $input.on('keypress', (e) => {
            if (e.which === 13 && !$btn.prop('disabled')) this.perform_search();
        });
    }

    perform_search() {
        const type = $('#kyc-type').val();
        const value = $('#kyc-input').val();
        const $results = $('#results-area');

        $results.html(`<div style="grid-column:1/-1; text-align:center; padding:50px; color:var(--c360-text-sub);">Scanning Finacle DB...</div>`);

        frappe.call({
            method: "sahayog.sahayog.page.customer_360.customer_360.search_account_by_kyc",
            args: { search_value: value, search_type: type },
            callback: (r) => {
                $results.empty();
                if (r.message && r.message.length > 0) {
                    r.message.forEach((customer, index) => this.render_card(customer, index));
                } else {
                    $results.html(`<div style="grid-column:1/-1; text-align:center; padding:50px; color:var(--c360-text-sub);"><h3>No Records Found</h3></div>`);
                }
            }
        });
    }

    render_card(data, index) {
        const initials = (data.acct_name || 'U').substring(0, 2).toUpperCase();
        const html = `
            <div class="c360-card" style="animation-delay: ${index * 0.1}s">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                    <div>
                        <div style="font-size:0.8rem; color:var(--c360-text-sub); margin-bottom:4px;">CIF: ${data.cif_id}</div>
                        <h3 style="font-size:1.2rem; margin:0; color:var(--c360-text-main);">${data.acct_name}</h3>
                    </div>
                    <div style="background:#e0e7ff; color:var(--c360-primary); width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:700;">${initials}</div>
                </div>
                <div style="font-size:0.9rem; color:var(--c360-text-main);">
                    <div><strong>${data.docdescr || data.doccode}</strong>: ${data.referencenumber}</div>
                    <div style="margin-top:5px;"><strong>Phone:</strong> ${data.phoneno || '-'}</div>
                </div>
            </div>
        `;
        $('#results-area').append(html);
    }
}
