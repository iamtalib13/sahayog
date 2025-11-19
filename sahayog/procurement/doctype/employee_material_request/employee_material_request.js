// ==================================================================
// EMPLOYEE MATERIAL REQUEST - CLIENT SCRIPT (WORKFLOW BASED)
// ==================================================================
// This script handles:
// - Date validations (required_by_date restrictions)
// - Field validations (reporting person, items, employee)
// - Workflow action confirmations
// - Form intro messages
// - Auto-population of employee-related fields
// - Child table item category auto-detection
// - Hide toolbar buttons for non-admin users
// ==================================================================

frappe.ui.form.on("Employee Material Request", {
  
  // ------------------------------------------------------------------
  // REFRESH EVENT - Triggered when form loads/refreshes
  // ------------------------------------------------------------------
  refresh: function (frm) {
    // Set intro message based on document status
    set_form_intro(frm);
     
    
    // Apply date restrictions on required_by_date field
    set_date_restrictions(frm);
    
    // Hide toolbar buttons for non-admin users
    hide_toolbar_buttons_for_non_admin();
    
    // Show amend button for cancelled documents
    if (frm.doc.docstatus === 2) {
      frm.add_custom_button(__("Amend"), function () {
        frappe.model.open_amended_doc("Employee Material Request", frm.doc.name);
      });
    }
  },

  



  // ------------------------------------------------------------------
  // ONLOAD EVENT - Triggered once when form is first created
  // ------------------------------------------------------------------
  onload: function (frm) {
    // Set default values for new documents
    if (frm.is_new()) {
      frm.set_value("request_date", frappe.datetime.get_today());
      frm.set_value("status", "Draft");
      
      // Set default required by date to today if not set
      if (!frm.doc.required_by_date) {
        frm.set_value("required_by_date", frappe.datetime.get_today());
      }
    }
  },

  // ------------------------------------------------------------------
  // EMPLOYEE FIELD - Auto-populate reporting person and target location
  // ------------------------------------------------------------------
  employee: function (frm) {
    if (frm.doc.employee) {
      // Fetch employee details from server
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Employee",
          name: frm.doc.employee,
        },
        callback: function (res) {
          if (res.message) {
            // Auto-set Reporting Person from employee's "reports_to" field
            if (!frm.doc.reporting_person && res.message.reports_to) {
              frappe.call({
                method: "frappe.client.get_value",
                args: {
                  doctype: "Employee",
                  filters: { name: res.message.reports_to },
                  fieldname: ["user_id", "employee_name"],
                },
                callback: function (resp) {
                  if (resp.message && resp.message.user_id) {
                    frm.set_value("reporting_person", resp.message.user_id);
                    
                    frappe.show_alert({
                      message: __("Reporting Person: {0}", [resp.message.employee_name]),
                      indicator: "green",
                    }, 5);
                  }
                },
              });
            } else {
              frappe.show_alert("Reporting Person not set for selected Employee");
            }
            
            // Auto-set Target Warehouse with Branch and State info
            if (frm.doc.target_location) {
              frm.set_value("target_warehouse", frm.doc.target_location);
              
              frappe.db.get_value("Sahayog Branch", frm.doc.target_location, ["branch", "state"])
                .then((r) => {
                  let b = r?.message?.branch || "Not Found";
                  let s = r?.message?.state || "N/A";
                  
                  frm.set_df_property(
                    "target_warehouse",
                    "description",
                    `Branch: <b>${frappe.utils.escape_html(b)}</b> | State: <b>${frappe.utils.escape_html(s)}</b>`
                  );
                });
            } else {
              frappe.show_alert("Target location not set for selected Employee");
              frm.set_df_property("target_warehouse", "description", "");
            }
          }
        },
      });
    }
  },

  // ------------------------------------------------------------------
  // DATE VALIDATION - Triggered when required_by_date changes
  // ------------------------------------------------------------------
  required_by_date: function (frm) {
    validate_required_by_date(frm);
  },

  // ------------------------------------------------------------------
  // REQUEST DATE CHANGE - Re-validate required_by_date
  // ------------------------------------------------------------------
  request_date: function (frm) {
    if (frm.doc.required_by_date) {
      validate_required_by_date(frm);
    }
  },

  // ------------------------------------------------------------------
  // BEFORE WORKFLOW ACTION - Validation and confirmation dialogs
  // ------------------------------------------------------------------
  before_workflow_action: function (frm) {
    let action = frm.selected_workflow_action;
    
    // Unfreeze screen to show dialogs properly
    frappe.dom.unfreeze();
    
    // Validation for Submit action
    if (action === "Submit" || action === "Submit for Approval") {
      // Check reporting person is set
      if (!frm.doc.reporting_person) {
        frappe.throw(__("Please set Reporting Person"));
        return false;
      }
      
      // Check at least one item exists
      if (!frm.doc.items || frm.doc.items.length === 0) {
        frappe.throw(__("Please add at least one item"));
        return false;
      }
      
      // Validate required by date
      if (!validate_required_by_date(frm)) {
        return false;
      }
      
      // Show confirmation dialog
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("<b>Are all fields correctly entered?</b>"),
          function () {
            resolve();
          },
          function () {
            reject("❌ Submission cancelled by user.");
          }
        );
      });
    }
    
    // Confirmation for Approve action
    else if (action === "Approve") {
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("Are you sure you want to approve this request?"),
          function () {
            resolve();
          },
          function () {
            reject("❌ Approval cancelled by user.");
          }
        );
      });
    }
    
    // Confirmation for Reject action
    else if (action === "Reject") {
      return new Promise((resolve, reject) => {
        frappe.confirm(
          __("Are you sure you want to reject this request?"),
          function () {
            resolve();
          },
          function () {
            reject("❌ Rejection cancelled by user.");
          }
        );
      });
    }
  },
});

// ==================================================================
// CHILD TABLE EVENTS - Material Request Items
// ==================================================================

frappe.ui.form.on("Material Request Items", {
  
  // ------------------------------------------------------------------
  // ITEM CODE - Auto-detect category and populate item details
  // ------------------------------------------------------------------
  item_code: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    
    if (row.item_code) {
      // Fetch item details from server
      frappe.call({
        method: "frappe.client.get",
        args: {
          doctype: "Item",
          name: row.item_code,
        },
        callback: function (r) {
          if (r.message) {
            let item = r.message;
            
            // Set basic item fields
            frappe.model.set_value(cdt, cdn, "item_name", item.item_name);
            frappe.model.set_value(cdt, cdn, "uom", item.stock_uom);
            frappe.model.set_value(cdt, cdn, "description", item.description);
            
            // Auto-detect and set item category
            let category = "";
            if (item.is_fixed_asset) {
              category = "Asset";
              // Set quantity to 1 for assets by default
              if (!row.quantity || row.quantity === 0) {
                frappe.model.set_value(cdt, cdn, "quantity", 1);
              }
            } else if (item.is_stock_item) {
              category = "Stock Item";
            } else {
              // Item is neither asset nor stock item - show error
              frappe.msgprint({
                title: __("Invalid Item"),
                message: __("Row {0}: {1} is neither an Asset nor a Stock Item", 
                  [row.idx, item.item_code]),
                indicator: "red",
              });
              frappe.model.set_value(cdt, cdn, "item_code", "");
              return;
            }
            
            // Set category automatically
            frappe.model.set_value(cdt, cdn, "item_category", category);
            
            // Show success alert
            frappe.show_alert({
              message: __("Category auto-set: {0}", [category]),
              indicator: category === "Asset" ? "blue" : "purple",
            }, 3);
            
            // Get available stock for stock items
            if (category === "Stock Item" && row.warehouse) {
              get_available_stock(frm, cdt, cdn);
            }
            
            // Refresh form to show conditional fields
            frm.refresh_field("items");
          }
        },
      });
    }
  },

  // ------------------------------------------------------------------
  // WAREHOUSE FIELD - Fetch available stock when warehouse changes
  // ------------------------------------------------------------------
  warehouse: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.item_code && row.warehouse && row.item_category === "Stock Item") {
      get_available_stock(frm, cdt, cdn);
    }
  },

  // ------------------------------------------------------------------
  // QUANTITY FIELD - Warn if quantity exceeds available stock
  // ------------------------------------------------------------------
  quantity: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    
    if (row.item_category === "Stock Item" && row.quantity > row.available_qty) {
      frappe.msgprint({
        title: __("Stock Warning"),
        message: __("Row {0}: Requested ({1}) exceeds available ({2})", 
          [row.idx, row.quantity, row.available_qty]),
        indicator: "orange",
      });
    }
  },
});

// ==================================================================
// HELPER FUNCTIONS
// ==================================================================

// ==================================================================
// EMPLOYEE MATERIAL REQUEST - CLIENT SCRIPT
// ==================================================================

// frappe.ui.form.on("Employee Material Request", {
//     refresh: function(frm) {
//         set_form_intro(frm);
//     },
    
//     onload: function(frm) {
//         set_form_intro(frm);
//     }
// });

// ==================================================================
// SET FORM INTRO - Production-level implementation with caching
// ==================================================================

function set_form_intro(frm) {
  console.log("hello from intro")
  // Clear any existing intro
  frm.set_intro("");
  
  // Only show intro for brand new, unsaved documents
  if (frm.doc.__islocal) {
    frm.set_intro(__("Fill all required fields and save the document"), "blue");
  } else {
    // Fetch data with caching and render intro
    fetch_intro_data_with_cache(frm);
  }
}

// ------------------------------------------------------------------
// FETCH INTRO DATA WITH CACHING
// Implements intelligent caching with localStorage
// ------------------------------------------------------------------
function fetch_intro_data_with_cache(frm) {
  frm.set_intro("");
  const CACHE_KEY_PREFIX = "emr_intro_";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  const MAX_CACHE_ITEMS = 50; // Maximum cached items
  
  const cache_key = CACHE_KEY_PREFIX + frm.doc.name;
  
  // Try to get from cache first
  const cached_data = get_from_cache(cache_key, CACHE_DURATION);
  
  if (cached_data) {
    // Cache hit - render immediately
    console.log("Loading intro from cache:", frm.doc.name);
    render_intro_html(frm, cached_data);
    return;
  }
  
  // Cache miss - fetch from server
  console.log("Fetching intro from server:", frm.doc.name);
  
  frappe.call({
    method: "sahayog.procurement.doctype.employee_material_request.employee_material_request.get_material_request_intro_data",
    args: {
      doc_name: frm.doc.name
    },
    freeze: true,
    freeze_message: __("Loading details..."),
    callback: function(r) {
      if (r.message && r.message.success) {
        const data = r.message.data;
        
        // Save to cache
        save_to_cache(cache_key, data, MAX_CACHE_ITEMS, CACHE_KEY_PREFIX);
        
        // Render intro
        render_intro_html(frm, data);
      } else {
        // Error handling - show fallback
        frappe.msgprint({
          title: __("Error Loading Details"),
          message: r.message?.error || __("Unable to load intro details"),
          indicator: "red"
        });
        render_intro_fallback(frm);
      }
    },
    error: function(err) {
      console.error("Error fetching intro data:", err);
      render_intro_fallback(frm);
    }
  });
}

// ------------------------------------------------------------------
// GET FROM CACHE
// Retrieves data from localStorage with expiry check
// ------------------------------------------------------------------
function get_from_cache(key, duration) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - parsed.timestamp > duration) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch (e) {
    console.error("Cache read error:", e);
    return null;
  }
}

// ------------------------------------------------------------------
// SAVE TO CACHE
// Saves data to localStorage with LRU (Least Recently Used) eviction
// ------------------------------------------------------------------
function save_to_cache(key, data, max_items, key_prefix) {
  try {
    // Prepare cache entry
    const cache_entry = {
      data: data,
      timestamp: Date.now()
    };
    
    // Save current item
    localStorage.setItem(key, JSON.stringify(cache_entry));
    
    // Clean old cache entries if limit exceeded
    clean_old_cache(max_items, key_prefix);
    
  } catch (e) {
    // localStorage full - clean and retry
    if (e.name === 'QuotaExceededError') {
      console.warn("localStorage full, cleaning old entries...");
      clean_old_cache(Math.floor(max_items / 2), key_prefix);
      
      // Retry save
      try {
        localStorage.setItem(key, JSON.stringify(cache_entry));
      } catch (e2) {
        console.error("Failed to save to cache after cleanup:", e2);
      }
    } else {
      console.error("Cache write error:", e);
    }
  }
}

// ------------------------------------------------------------------
// CLEAN OLD CACHE
// Removes oldest cache entries when limit exceeded (LRU strategy)
// ------------------------------------------------------------------
function clean_old_cache(max_items, key_prefix) {
  try {
    // Get all cache keys
    const cache_entries = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(key_prefix)) {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          cache_entries.push({
            key: key,
            timestamp: value.timestamp || 0
          });
        } catch (e) {
          // Invalid cache entry - remove it
          localStorage.removeItem(key);
        }
      }
    }
    
    // If over limit, remove oldest entries
    if (cache_entries.length > max_items) {
      // Sort by timestamp (oldest first)
      cache_entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest entries
      const to_remove = cache_entries.length - max_items;
      for (let i = 0; i < to_remove; i++) {
        localStorage.removeItem(cache_entries[i].key);
      }
      
      console.log(`Cleaned ${to_remove} old cache entries`);
    }
  } catch (e) {
    console.error("Cache cleanup error:", e);
  }
}

// ------------------------------------------------------------------
// RENDER INTRO HTML
// Renders the intro section with fetched/cached data
// ------------------------------------------------------------------
function render_intro_html(frm, data) {
  let html = `
    <style>
      .emr-quick-guide {
        background: transparent;
        border-radius: 6px;
        padding: 0px;
        margin: 8px 0;
      }
      
      .emr-grid-parent {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 1fr);
        gap: 8px;
        min-height: 100px;
      }
      
      .emr-grid-card {
        background: transparent !important;
        border-radius: 4px;
        padding: 10px;
      }
      
      .emr-div1, .emr-div2, .emr-div3, .emr-div4 {
        background: transparent !important;
      }
      
      .emr-div1 {
        grid-column: span 2 / span 2;
        grid-row: span 2 / span 2;
      }
      
      .emr-div2 {
        grid-column: span 2 / span 2;
        grid-row: span 2 / span 2;
        grid-column-start: 3;
      }
      
      .emr-div3 {
        grid-column: span 2 / span 2;
        grid-row: span 2 / span 2;
        grid-row-start: 3;
      }
      
      .emr-div4 {
        grid-column: span 2 / span 2;
        grid-row: span 2 / span 2;
        grid-column-start: 3;
        grid-row-start: 3;
      }
      
      .emr-card-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: rgb(215, 140, 9) !important;
        border-radius: 50%;
        font-weight: 700;
        font-size: 11px;
        color: white;
        margin-right: 6px;
      }
      
      .emr-card-header {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
      }
      
      .emr-card-title {
        font-size: 12px;
        font-weight: 600;
      }
      
      .emr-card-line {
        font-size: 11px;
        line-height: 1.6;
        margin: 2px 0;
      }
      
      .emr-status-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        white-space: nowrap;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        height: 2.25rem;
        padding: 0.5rem 1rem;
        cursor: default;
        border: none;
      }
      
      .emr-status-badge:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transform: translateY(-1px);
      }
      
      .close-message {
        display: none;
      }

      /* ========== LIGHT MODE STYLES ========== */
      html[data-theme-mode="light"] .form-message.blue {
        border: none !important;
        background-color: #f8f9fa !important;
        background-image: linear-gradient(to right bottom, rgba(215, 140, 9, 0.15), #f8f9fa) !important;
        padding: 12px !important;
        border-radius: 6px !important;
      }
      
      html[data-theme-mode="light"] .emr-card-title {
        color: #212529 !important;
      }
      
      html[data-theme-mode="light"] .emr-card-line {
        color: #495057 !important;
      }
      
      /* Light Mode Status Badge Colors */
      html[data-theme-mode="light"] .status-approved {
        background: rgb(46, 184, 92) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-rejected {
        background: rgb(220, 53, 69) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-pending {
        background: rgb(215, 140, 9) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-skip {
        background: rgb(13, 110, 253) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-draft {
        background: rgb(215, 140, 9) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-submitted {
        background: rgb(46, 184, 92) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="light"] .status-cancelled {
        background: rgb(220, 53, 69) !important;
        color: #ffffff !important;
      }

      /* ========== DARK MODE STYLES ========== */
      html[data-theme-mode="dark"] .form-message.blue {
        border: none !important;
        background-color: rgb(50, 50, 50) !important;
        background-image: linear-gradient(to right bottom, rgba(215, 140, 9, 0.2), rgb(50, 50, 50)) !important;
        padding: 12px !important;
        border-radius: 6px !important;
      }
      
      html[data-theme-mode="dark"] .emr-card-title {
        color: #fff !important;
      }
      
      html[data-theme-mode="dark"] .emr-card-line {
        color: #e0e0e0 !important;
      }
      
      /* Dark Mode Status Badge Colors - Darker shades */
      html[data-theme-mode="dark"] .status-approved {
        background: rgb(25, 135, 84) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-rejected {
        background: rgb(176, 42, 55) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-pending {
        background: rgb(180, 117, 7) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-skip {
        background: rgb(10, 88, 202) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-draft {
        background: rgb(180, 117, 7) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-submitted {
        background: rgb(25, 135, 84) !important;
        color: #ffffff !important;
      }
      
      html[data-theme-mode="dark"] .status-cancelled {
        background: rgb(176, 42, 55) !important;
        color: #ffffff !important;
      }
    </style>
    
    <div class="emr-quick-guide">
      <div class="emr-grid-parent">
        
        <!-- DIV 1: Employee Details -->
        <div class="emr-grid-card emr-div1">
          <div class="emr-card-header">
            <div class="emr-card-number">1</div>
            <div class="emr-card-title">Employee Details</div>
          </div>
          <div class="emr-card-line">
            ${data.employee?.employee_number || 'N/A'} -
            ${data.employee?.employee_name || 'N/A'} -
            ${data.employee?.cell_number || 'N/A'}
          </div>
          <div class="emr-card-line">
            ${frm.doc.target_warehouse || 'N/A'} - 
            ${data.branch?.branch || 'N/A'}, 
            ${data.branch?.district || 'N/A'}, 
            ${data.branch?.state_code || 'N/A'}
          </div>
        </div>
        
        <!-- DIV 2: Request Details -->
        <div class="emr-grid-card emr-div2">
          <div class="emr-card-header">
            <div class="emr-card-number">2</div>
            <div class="emr-card-title">Request Details</div>
          </div>
          <div class="emr-card-line">
            ${data.requested_by?.employee_number || 'N/A'} -
            ${data.requested_by?.employee_name || 'N/A'} -
            ${data.requested_by?.cell_number || 'N/A'}
          </div>
          <div class="emr-card-line">
            <span class="emr-status-badge ${
              data.doc_status === 1 ? 'status-submitted' : 
              data.doc_status === 0 ? 'status-draft' : 
              'status-cancelled'
            }">
              ${data.doc_status === 1 ? 'Submitted' : data.doc_status === 0 ? 'Draft' : 'Cancelled'}
            </span>
          </div>
        </div>
        
        <!-- DIV 3: Reporting Person -->
        <div class="emr-grid-card emr-div3">
          <div class="emr-card-header">
            <div class="emr-card-number">3</div>
            <div class="emr-card-title">Reporting Person</div>
          </div>
          <div class="emr-card-line">
            ${data.reporting_person?.employee_number || 'N/A'} -
            ${data.reporting_person?.employee_name || 'N/A'} -
            ${data.reporting_person?.cell_number || 'N/A'}
          </div>
          <div class="emr-card-line">
            <span class="emr-status-badge ${
              data.reporting_person_status === 'Approved' ? 'status-approved' : 
              data.reporting_person_status === 'Rejected' ? 'status-rejected' : 
              data.reporting_person_status === 'Skip' ? 'status-skip' : 
              'status-pending'
            }">
              ${data.reporting_person_status || 'Pending'}
            </span>
          </div>
        </div>
        
        <!-- DIV 4: HO Officer -->
        <div class="emr-grid-card emr-div4">
          <div class="emr-card-header">
            <div class="emr-card-number">4</div>
            <div class="emr-card-title">HO Officer</div>
          </div>
          <div class="emr-card-line">
            ${data.ho_officer?.employee_number || 'N/A'} - 
            ${data.ho_officer?.employee_name || 'N/A'}
          </div>
          <div class="emr-card-line">
            <span class="emr-status-badge ${
              data.ho_officer_status === 'Approved' ? 'status-approved' : 
              data.ho_officer_status === 'Rejected' ? 'status-rejected' : 
              'status-pending'
            }">
              ${data.ho_officer_status || 'Pending'}
            </span>
          </div>
        </div>
        
      </div>
    </div>
  `;
  
  frm.set_intro(html);
}

// ------------------------------------------------------------------
// RENDER INTRO FALLBACK
// Shows basic intro when data fetch fails
// ------------------------------------------------------------------
function render_intro_fallback(frm) {
  frm.set_intro(__("Unable to load detailed information. Please refresh the page."), "orange");
}







// ------------------------------------------------------------------
// SET DATE RESTRICTIONS - Disable past dates in datepicker
// ------------------------------------------------------------------
function set_date_restrictions(frm) {
  // Add description below required_by_date field
  frm.set_df_property(
    "required_by_date",
    "description",
    __("Cannot select past dates. Minimum date: Today")
  );
  
  // Configure datepicker to disable past dates
  if (frm.fields_dict.required_by_date && frm.fields_dict.required_by_date.datepicker) {
    frm.fields_dict.required_by_date.datepicker.update({
      minDate: new Date(),
      maxDate: null,
    });
  }
}

// ------------------------------------------------------------------
// VALIDATE REQUIRED BY DATE - Comprehensive date validation logic
// ------------------------------------------------------------------
function validate_required_by_date(frm) {
  // Check if date is provided
  if (!frm.doc.required_by_date) {
    frappe.msgprint({
      title: __("Required Field Missing"),
      message: __("Please select Required By Date"),
      indicator: "red",
    });
    return false;
  }
  
  let today = frappe.datetime.get_today();
  let required_date = frm.doc.required_by_date;
  let request_date = frm.doc.request_date || today;
  
  // Validation 1: Required By Date cannot be in the past
  if (required_date < today) {
    frappe.msgprint({
      title: __("Invalid Date"),
      message: __(
        "Required By Date cannot be in the past.<br>Minimum date: <b>{0}</b>",
        [frappe.datetime.str_to_user(today)]
      ),
      indicator: "red",
    });
    
    // Auto-correct to today
    frm.set_value("required_by_date", today);
    frappe.validated = false;
    return false;
  }
  
  // Validation 2: Required By Date cannot be before Request Date
  if (required_date < request_date) {
    frappe.msgprint({
      title: __("Invalid Date Range"),
      message: __(
        "Required By Date cannot be before Request Date.<br>" +
        "Request Date: <b>{0}</b><br>" +
        "Required By Date: <b>{1}</b>",
        [
          frappe.datetime.str_to_user(request_date),
          frappe.datetime.str_to_user(required_date),
        ]
      ),
      indicator: "red",
    });
    
    // Auto-correct to request date
    frm.set_value("required_by_date", request_date);
    frappe.validated = false;
    return false;
  }
  
  // Warning: Far future dates (more than 90 days)
  let days_diff = frappe.datetime.get_day_diff(required_date, today);
  if (days_diff > 90) {
    frappe.msgprint({
      title: __("Notice"),
      message: __(
        "Required By Date is <b>{0} days</b> in the future.<br>Please verify if this is correct.",
        [days_diff]
      ),
      indicator: "orange",
    });
    // Don't block submission, just show warning
  }
  
  return true;
}

// ------------------------------------------------------------------
// GET AVAILABLE STOCK - Fetch actual quantity from Bin doctype
// ------------------------------------------------------------------
function get_available_stock(frm, cdt, cdn) {
  let row = locals[cdt][cdn];
  
  frappe.call({
    method: "frappe.client.get_value",
    args: {
      doctype: "Bin",
      filters: {
        item_code: row.item_code,
        warehouse: row.warehouse,
      },
      fieldname: "actual_qty",
    },
    callback: function (r) {
      if (r.message) {
        frappe.model.set_value(cdt, cdn, "available_qty", r.message.actual_qty || 0);
      }
    },
  });
}

// ------------------------------------------------------------------
// HIDE TOOLBAR BUTTONS - Only for non-admin users, keep sidebar visible
// ------------------------------------------------------------------
function hide_toolbar_buttons_for_non_admin() {
  // Check if user is NOT Administrator
  if (frappe.session.user !== "Administrator") {
    
    // Use setTimeout to ensure DOM is fully loaded
    setTimeout(function() {
      // Hide Previous button in form toolbar
      $("button.prev-doc").hide();
      
      // Hide Next button in form toolbar
      $("button.next-doc").hide();
      
      // Hide Print button in form toolbar
      $("button.icon-btn[data-original-title='Print']").hide();
      $("button.icon-btn[title='Print']").hide();
      
    }, 150); // Slight delay ensures buttons are rendered
  }
}
