frappe.pages["permission-config"].on_page_load = function (wrapper) {
  // 1. Define required roles
  const authorized_roles = ["Administrator", "Permission Manager"];
  const user_roles = frappe.user_roles;

  // 2. Check if user has at least one authorized role
  const is_authorized = authorized_roles.some((role) =>
    user_roles.includes(role),
  );

  if (!is_authorized) {
    // Show a clean Access Denied message
    wrapper.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; color: #57606a;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cf222e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <h2 style="margin-top: 20px; color: #24292f;">Access Denied</h2>
        <p style="font-size: 14px; max-width: 400px; text-align: center; line-height: 1.6;">
            You do not have the required permissions to access this page. 
            Please contact your <strong>Administrator</strong> if you believe this is an error.
        </p>
        <button class="btn btn-default btn-sm" style="margin-top: 15px;" onclick="frappe.set_route('')">
            Back to Home
        </button>
      </div>
    `;
    return; // Stop execution of the rest of the page script
  }
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Permission Configuration",
    single_column: true,
  });

  page.add_inner_button(__("View Report"), () => {
    frappe.set_route("query-report", "Report Preference Report");
  });

  $(wrapper).find(".page-content").css({ padding: "0", maxWidth: "none" });
  $(wrapper).find(".layout-main-section").css({ maxWidth: "none" });

  frappe.require("/assets/sahayog/js/petite-vue.iife.js", () => {
    page.main.html(`
      <style>
        /* ... existing styles ... */
        * { box-sizing: border-box; }
        #perm-root { 
          height: calc(100vh - 110px); 
          overflow: hidden; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          color: #24292f;
        }
        .perm-layout { 
          display: flex; 
          height: 100%; 
          border: 1px solid #d0d7de;
          border-radius: 6px;
          margin: 0 16px 16px 16px;
          background: transparent;
          box-shadow: 0 1px 2px rgba(27,31,36,0.04);
          overflow: hidden;
        }
        
        /* Pane Styling */
        .perm-pane { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .perm-main { width: 30%; border-right: 1px solid #d0d7de; background: transparent; }
        .perm-sidebar { width: 70%; background: transparent; }

        /* ... existing pane header/content styles ... */
        .perm-pane-header { padding: 12px 16px; background: transparent; border-bottom: 1px solid #d0d7de; flex-shrink: 0; }
        .perm-pane-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: #24292f; }
        .perm-pane-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 19px; }

        /* Internal Components */
        .perm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; 
        padding-bottom: 12px; border-bottom: 1px solid #d0d7de; }
        .perm-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #24292f; }
        
        .perm-search { position: relative; width: 100%; max-width: 320px; }
        .perm-search input { 
          width: 100%; padding: 5px 12px 5px 32px; border: 1px solid #d0d7de; border-radius: 6px; 
          font-size: 14px; background-color: transparent; color: #24292f;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .perm-search input:focus { outline: none; border-color: #0969da; box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.3); background-color: transparent; }
        .perm-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #57606a; }
        
        .perm-list { display: flex; flex-direction: column; gap: 0; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
        .perm-card { 
          padding: 12px 16px; border-bottom: 1px solid #d0d7de; background: transparent; cursor: pointer; transition: background 0.1s; 
        }
        .perm-card:last-child { border-bottom: none; }
        .perm-card:hover { background: rgba(0,0,0,0.03); }
        .perm-card.active { background: rgba(0,0,0,0.03); border-left: 2px solid #0969da; padding-left: 14px; }
        
        /* NEW STYLES FOR TAG BADGE */
        .perm-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
        .perm-tag-badge { 
            background: #e8eaed; color: #57606a; font-size: 10px; font-weight: 600; 
            padding: 2px 6px; border-radius: 10px; border: 1px solid #d0d7de; margin-left: 8px;
        }

        .perm-card-name { font-size: 14px; font-weight: 600; color: #24292f; }
        .perm-card-email { font-size: 12px; color: #57606a; }
        
        .perm-btn { padding: 5px 16px; background: transparent; color: #24292f; border: 1px solid #d0d7de; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 0 rgba(27,31,36,0.04); transition: background 0.2s; }
        .perm-btn:hover { background: rgba(0,0,0,0.03); }
        
        .perm-empty { padding: 32px; text-align: center; color: #57606a; border: 1px dashed #d0d7de; border-radius: 6px; font-size: 14px; }
        .perm-sidebar-empty { padding: 64px 32px; text-align: center; color: #57606a; }
        .perm-sidebar-empty svg { width: 40px; height: 40px; margin: 0 auto 16px; color: #d0d7de; }
        
        .perm-user-info { margin-bottom: 24px; padding: 16px; background: transparent; border: 1px solid #d0d7de; border-radius: 6px; }
        .perm-user-info div { font-size: 13px; color: #24292f; margin-bottom: 8px; }
        
        .perm-section { margin-bottom: 32px; }
        .perm-section-title { font-size: 12px; font-weight: 600; color: #57606a; text-transform: uppercase; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #d0d7de; }
        .perm-field { margin-bottom: 24px; border: 1px dashed #d0d7de; padding: 12px; border-radius: 4px;}
        .perm-flabel { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #24292f; }
        .perm-flink { font-size: 12px; font-weight: 600; color: #0969da; cursor: pointer; text-decoration: none; }
        
        .perm-check-grid { display: grid; gap: 8px; }
        .perm-check-grid-zone, .perm-check-grid-region { grid-template-columns: repeat(auto-fill, minmax(45px, 1fr)); }
        .perm-check-grid-multi { grid-template-columns: 1fr; }
        
        .perm-check-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #d0d7de; border-radius: 6px; background: transparent; cursor: pointer; transition: background 0.1s, border-color 0.1s; }
        .perm-check-item:hover { background: rgba(0,0,0,0.03); }
        .perm-check-item.selected { background: rgba(9, 105, 218, 0.05); border-color: #0969da; }
        .perm-check-item input { margin: 0; cursor: pointer; accent-color: #0969da; }
        .perm-check-item label { margin: 0; font-size: 13px; color: #24292f; cursor: pointer; flex: 1; font-weight: 400; }
        
        /* NEW STYLES FOR SELECT */
        .perm-select {
            width: 100%; padding: 8px 12px; border: 1px solid #d0d7de; border-radius: 6px;
            font-size: 14px; background-color: transparent; color: #24292f; cursor: pointer;
            appearance: none; -webkit-appearance: none;
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat; background-position: right .7em top 50%; background-size: .65em auto;
        }
        .perm-select:focus { outline: none; border-color: #0969da; box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.3); }

        .perm-no-options { padding: 16px; text-align: center; color: #57606a; font-size: 13px; border: 1px dashed #d0d7de; border-radius: 6px; }

        /* Search Results for Dialog */
        .search-results-list { list-style: none; padding: 0; margin-top: 10px; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; background: transparent; }
        .search-result-item { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.1s; display: flex; align-items: center; gap: 12px; }
        .search-result-item:last-child { border-bottom: none; }
        .search-result-item:hover { background: rgba(0,0,0,0.03); }
        .search-result-item.selected { background: rgba(9, 105, 218, 0.05); }
        .search-result-info { display: flex; flex-direction: column; }
        .search-result-name { font-weight: 600; font-size: 13px; color: #24292f; }
        .search-result-email { font-size: 11px; color: #57606a; }
        .search-highlight { background: #fff2ac; padding: 0; border-radius: 2px; }

        /* Selected Pills */
        .selected-users-wrapper { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; padding: 8px; border: 1px solid #d0d7de; border-radius: 6px; background: rgba(0,0,0,0.02); min-height: 40px; align-items: center; }
        .selected-pill { display: flex; align-items: center; gap: 6px; padding: 2px 10px; background: #0969da; color: #fff; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .selected-pill .remove-user { cursor: pointer; font-size: 14px; line-height: 1; opacity: 0.8; }
        
        .perm-pane-content::-webkit-scrollbar { width: 6px; }
        .perm-pane-content::-webkit-scrollbar-track { background: transparent; }
        .perm-pane-content::-webkit-scrollbar-thumb { background: #d0d7de; border-radius: 10px; }

        /* Container for the row of chips */
.perm-check-grid-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px; /* Space between chips */
  align-items: center;
}

/* The Chip Itself */
.perm-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  /* Size & Shape */
  min-width: 32px;
  height: 24px;
  padding: 0 10px;
  border-radius: 12px; /* Pill shape */
  
  /* Default Style (Unselected - Grey) */
  background-color: #f0f4f6; /* Frappe light grey */
  color: #6c7680;           /* Frappe dark grey text */
  border: 1px solid transparent;
  
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

/* Hover State */
.perm-chip:hover {
  background-color: #e2e6ea;
  color: #1b2024;
}

/* Selected State (Green like Frappe Status) */
.perm-chip.selected {
  background-color: #e8fdf0; /* Light green bg */
  color: #2f9d58;           /* Dark green text */
  border: 1px solid #2f9d58;
}

/* Hide the actual checkbox input completely */
.perm-chip input {
  display: none;
}

.perm-flabel-inline {
  display: flex;
  align-items: center;
  width: 100%;
}

.perm-check-grid-chips-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 8px;
}

.perm-pane-header {
  display: flex; /* Enable flexbox */
  justify-content: space-between; /* Push items to edges */
  align-items: flex-start; /* Align top */
  padding: 12px 16px;
  background: transparent;
  border-bottom: 1px solid #d0d7de;
  flex-shrink: 0;
}


/* Toggle Switch Container */
.perm-toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  margin-right: 8px; /* Space between toggle and badge */
  vertical-align: middle;
}

/* Hide default checkbox */
.perm-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The Slider */
.perm-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d8dd; /* Default Grey (Disabled) */
  transition: .4s;
  border-radius: 20px;
}

/* The Circle inside slider */
.perm-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* Checked State (Enabled - Green) */
.perm-toggle input:checked + .perm-slider {
  background-color: #2f9d58; /* Frappe Green */
}

/* Move Circle when checked */
.perm-toggle input:checked + .perm-slider:before {
  transform: translateX(16px);
}

/* Focused State */
.perm-toggle input:focus + .perm-slider {
  box-shadow: 0 0 1px #2f9d58;
}

.perm-sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;    /* Horizontal center */
  justify-content: center; /* Vertical center */
  text-align: center;      /* Text alignment center */
  height: 100%;            /* Take full height of parent */
  padding: 64px 32px;
  color: #57606a;
}

.perm-sidebar-empty svg {
  margin-bottom: 16px;
  color: #d0d7de;
}


/* Container for badge and menu */
.perm-tag-container {
    position: relative;
    display: inline-block;
}

/* Make the badge look like a button */
.perm-tag-badge-btn {
    cursor: pointer;
    user-select: none;
    transition: transform 0.1s;
}

.perm-tag-badge-btn:active {
    transform: scale(0.95);
}

/* Floating Menu Styling */
.perm-tag-menu {
    position: absolute;
    top: 110%; /* Show below badge */
    right: 0;
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    min-width: 120px;
    overflow: hidden;
}

.perm-tag-option {
    padding: 8px 12px;
    font-size: 13px;
    color: #24292f;
    cursor: pointer;
    transition: background 0.1s;
}

.perm-tag-option:hover {
    background-color: #f6f8fa;
}

.perm-tag-option.active {
    font-weight: 600;
    color: #0969da;
    background-color: #f0f7ff;
}

.perm-tag-option-none {
    border-top: 1px solid #f0f0f0;
    color: #cf222e; /* Red color for "No Tag" */
}

/* Container for the whole row */
.perm-field-row {
    display: flex;
    flex-direction: row; /* Force side-by-side */
    gap: 24px;          /* Space between Zone block and Region block */
    align-items: center;
    width: 100%;
    margin-bottom: 20px;
}

/* Individual field blocks (Zone/Region) */
.perm-field-half {
    flex: 1;            /* Each takes 50% width */
    display: flex;
    align-items: center; /* Vertical center label and chips */
    min-width: 0;       /* Prevents overflow breaking flex */
    border: 1px dashed #d0d7de;
    padding: 12px;
    border-radius: 4px;
}

/* Label and Chips Wrapper */
.perm-flabel-inline {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
}

/* Specific label styling to prevent shrinking */
.perm-flabel-inline > span {
    font-weight: 600;
    font-size: 13px;
    margin-right: 12px;
    white-space: nowrap; /* Label won't break into 2 lines */
}

/* Chips container */
.perm-check-grid-chips-inline {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap; /* Allows chips to wrap if too many, but stays in row */
    gap: 6px;
}

/* Base badge style - consistent with your existing perm-tag-badge */
.perm-tag-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    font-weight: 600;
    font-size: 11px;
    border: 1px solid transparent;
    transition: all 0.2s ease;
}

/* Color Mappings (Subtle Style) */
.badge-green  { background-color: #e8fdf0; color: #2f9d58; border-color: #A6EFC0; } /* COM */
.badge-blue   { background-color: #e7f5ff; color: #007be0; border-color: #A7D7FD; } /* ROM */
.badge-orange { background-color: #fff8e6; color: #d09a0a; border-color: #FBDB73; } /* RM */
.badge-purple { background-color: #f5f0ff; color: #6846e3; border-color: #D6C8FF; } /* AZM */
.badge-cyan   { background-color: #e2f9ff; color: #008da6; border-color: #B2EBF2; } /* ZM */
.badge-gray   { background-color: #f0f4f6; color: #6c7680; border-color: #d1d8dd; } /* Default / No Tag */


/* Container for Label and Pencil */
.perm-flabel-with-edit {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-weight: 600;
    font-size: 13px;
    margin-right: 12px;
    white-space: nowrap;
}

.perm-edit-btn {
    cursor: pointer;
    color: #6c7680;
    padding: 2px;
    border-radius: 4px;
    transition: background 0.2s, color 0.2s;
    margin-bottom: 4px;
}

.perm-edit-btn:hover {
   
    color: #0969da;
}

/* Selected Pills Container */
.selected-users-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #fafbfc;
    min-height: 40px;
}

.selected-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    background: #e8fdf0; /* Light green like your other selected items */
    color: #2f9d58;
    border: 1px solid #2f9d58;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.remove-user {
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    opacity: 0.7;
}

.remove-user:hover {
    opacity: 1;
}

.selected-empty-text {
    font-size: 13px;
    color: #8c99a6;
    font-style: italic;
}


.selected-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px; /* Space between text and X */
    padding: 4px 12px;
    background-color: #e8fdf0;
    color: #2f9d58;
    border: 1px solid #2f9d58;
    border-radius: 16px;
    font-size: 12px;
}

.remove-user {
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;
    transition: color 0.2s;
}

.remove-user:hover {
    color: #cf222e; /* Red on hover to indicate deletion */
}

.perm-sidebar-empty {
    display: flex;
    flex-direction: column;
    align-items: center;      /* Centers horizontally */
    justify-content: center;   /* Centers vertically */
    text-align: center;
    height: 100%;             /* Ensures it spans the full sidebar height */
    padding: 64px 32px;
    color: #57606a;
}
    

/* Ensure the SVG can rotate smoothly */
.perm-tag-badge-btn svg {
    transition: transform 0.2s ease; /* Smooth turning animation */
    pointer-events: none; /* Let the click pass to the parent span */
}

/* When the menu is open, rotate the arrow 180 degrees */
.perm-tag-badge.menu-open svg {
    transform: rotate(180deg);
}


    </style>

      <div id="perm-root" v-scope @vue:mounted="init()">
        <div class="perm-layout">
          
          <div class="perm-main perm-pane">
            <div class="perm-pane-header" style="display: none"><h3>Users</h3></div>
            <div class="perm-pane-content">
              <div class="perm-header">
                <h3>Report Preferences</h3>
                <button class="perm-btn" @click="createNew">+ New</button>
              </div>
              
              <div class="perm-search" style="margin-bottom: 16px;">
                <!-- SVG Icon -->
                <svg class="perm-search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" placeholder="Search..." v-model="searchQuery" @input="filterList">
              </div>

              <div class="perm-list" v-if="filteredList.length">
                <div v-for="item in filteredList" :key="item.name" 
                     class="perm-card" 
                     :class="{ active: selectedPref && selectedPref.user === item.user }"
                     @click="selectPreference(item)">
                  
                  <!-- UPDATED: Display Tag Badge next to Name -->
                  <div class="perm-card-top">
    <!-- User Name -->
    <div class="perm-card-name" v-html="highlight(item.full_name || item.user, searchQuery)"></div>
    
    <!-- UPDATED: Added :class to sync colors -->
    <span v-if="item.tag" 
          class="perm-tag-badge" 
          :class="getTagClass(item.tag)"
          style="font-size: 10px; padding: 2px 6px;">
        [[ item.tag ]]
    </span>
</div>

                  
                  <div class="perm-card-email" v-html="highlight(item.user, searchQuery)"></div>
                </div>
              </div>

              <div class="perm-empty" v-else>No users found.</div>
            </div>
          </div>

          <div class="perm-sidebar perm-pane">
            <div class="perm-pane-header">
  
          <!-- LEFT SIDE: Title and Details -->
          <div v-if="!selectedPref">
            <h3>Permission Details</h3>
          </div>
          
          <div v-else style="display: flex; flex-direction: column; gap: 4px;">
            <h3 style="margin: 0;">Permission Details</h3>
            <div style="font-size: 13px; color: #57606a; display: flex; align-items: center; gap: 12px;">
              <span><strong>Employee Name:</strong> [[ selectedPref.full_name || '-' ]]</span>
              <span style="color: #d0d7de;">|</span>
              <span><strong>Employee ID:</strong> [[ selectedPref.user ? selectedPref.user.split('@')[0] : '-' ]]</span>
            </div>
          </div>

          <!-- RIGHT SIDE: Toggle + Tag Badge -->
          <div v-if="selectedPref" style="display: flex; align-items: center;">
            
          

            <!-- TAG BADGE -->
            <!-- RIGHT SIDE: Toggle + Clickable Tag Badge -->
        <!-- RIGHT SIDE: Toggle + Clickable Tag Badge -->
        <!-- RIGHT SIDE: Toggle + Clickable Dynamic Tag Badge -->
        <div v-if="selectedPref" style="display: flex; align-items: center;">
            
            <!-- ENABLED TOGGLE -->
            <label class="perm-toggle" title="Enable/Disable" style="margin-top: 7px;">
                <input type="checkbox" v-model="selectedPref.enabled" @change="autoSave">
                <span class="perm-slider"></span>
            </label>

            <!-- TAG BADGE CONTAINER -->
            <div class="perm-tag-container">
    <span class="perm-tag-badge perm-tag-badge-btn" 
          :class="[getTagClass(selectedPref.tag), { 'menu-open': showTagMenu }]"
          style="font-size: 12px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 6px;"
          :style="{ opacity: selectedPref.enabled ? 1 : 0.6, cursor: selectedPref.enabled ? 'pointer' : 'not-allowed' }"
          @click.stop="selectedPref.enabled ? toggleTagMenu() : notifyEnableToggle()">
        
        <!-- Tag Text -->
        <span>[[ selectedPref.tag || 'No Tag' ]]</span>
        
        <!-- Down Arrow SVG (Now Rotates based on menu-open class) -->
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"></path>
        </svg>
    </span>

    <!-- Floating Menu (v-if="showTagMenu") -->
    <div v-if="showTagMenu && selectedPref.enabled" class="perm-tag-menu">
        <div v-for="opt in allOptions.tag" :key="opt" class="perm-tag-option" :class="{ active: selectedPref.tag === opt }" @click="setTag(opt)">
            [[ opt ]]
        </div>
        <div class="perm-tag-option perm-tag-option-none" @click="setTag('')">No Tag</div>
    </div>
</div>


        </div>



          </div>

        </div>


        <div class="perm-pane-content">
  
  <!-- CASE 1: No user is selected from the left list -->
  <div v-if="!selectedPref" class="perm-sidebar-empty">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
    <div style="font-size: 14px; font-weight: 500;">No User Selected</div>
    <div style="font-size: 13px; margin-top: 8px;">Select a user from the list to manage their permission preferences</div>
  </div>

  <!-- CASE 2: A user is selected -->
  <div v-else>
    
    <!-- IF ENABLED: Show all the configuration settings -->
    <div v-if="selectedPref.enabled">
        
        <!-- Geographic Filters Section -->
        <div class="perm-section">
          <div class="perm-section-title" style="display: none">Geographic Filters</div>
          
          <div class="perm-field-row">
            <!-- Zone & Region side-by-side -->
            <div class="perm-field-half">
                <div class="perm-flabel-inline">
                  <span>Zone</span>
                  <div class="perm-check-grid-chips-inline">
                    <div class="perm-chip" :class="{ selected: isAllSelected('zone') }" @click="toggleAll('zone')">ALL</div>
                    <div v-for="opt in allOptions.zone" :key="opt" class="perm-chip" :class="{ selected: selectedPref.zone.includes(opt) }" @click="toggle('zone', opt)">[[ opt ]]</div>
                  </div>
                </div>
            </div>
            <div class="perm-field-half">
    <div class="perm-flabel-inline">
      <span>Region</span>
      <!-- Ensure the v-if is ONLY on this container -->
      <div v-if="allOptions.region && allOptions.region.length" class="perm-check-grid-chips-inline">
        
        <!-- ALL Chip -->
        <div class="perm-chip" 
             :class="{ selected: isAllSelected('region') }" 
             @click="toggleAll('region')">
          ALL
        </div>

        <!-- Dynamic Chips -->
        <div v-for="opt in allOptions.region" :key="opt" 
             class="perm-chip" 
             :class="{ selected: selectedPref.region.includes(opt) }" 
             @click="toggle('region', opt)">
          [[ opt ]]
        </div>
      </div>
      
      <!-- Show this if Region list is empty -->
      <div v-else class="selected-empty-text" style="margin-left: 10px;">
        No Regions available
      </div>
    </div>
</div>

          </div>

          <!-- SOL ID Section -->
          <div class="perm-field">
            <div class="perm-flabel-with-edit">
                <span>SOL ID</span>
                <div class="perm-edit-btn" @click="openSolIdDialog" title="Edit SOL IDs">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </div>
                <div class="perm-edit-btn" @click="clearSolIds" title="Clear SOL IDs" style="color: #cf222e;" v-if="selectedPref && selectedPref.sol_id && selectedPref.sol_id.length > 0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </div>
            </div>
            <div class="selected-users-wrapper">
                <span v-if="!selectedPref.sol_id || selectedPref.sol_id.length === 0" class="selected-empty-text">No SOL IDs selected yet.</span>
                <span v-for="sol in selectedPref.sol_id" :key="sol" class="selected-pill">[[ sol ]]<span class="remove-user" @click.stop="removeSolId(sol)">×</span></span>
            </div>
          </div>
        </div>

        <!-- New Finacle Report Permission Section -->
        <!-- Finacle Report Permission Section -->
<!-- Finacle Report Permission Section -->
<div class="perm-section">
  <div class="perm-field">
    <!-- Headline: Same style as SOL ID -->
    <div class="perm-flabel-with-edit">
        <span>Finacle Report Permission</span>
    </div>

    <!-- The Box Wrapper: Contains all selectable chips -->
    <div class="selected-users-wrapper" style="padding: 12px; min-height: 60px; background: #fafbfc;">
        
        <div class="perm-check-grid-chips-inline" style="margin: 0;">
          <!-- ALL Chip -->
          <div class="perm-chip" 
               :class="{ selected: isAllRolesSelected() }" 
               @click="toggleAllRoles()">
            ALL
          </div>

          <!-- Vertical Separator line -->
          <div style="width: 1px; height: 18px; background: #d0d7de; margin: 0 8px;"></div>

          <!-- Dynamic Chips for each Role -->
          <div v-for="pill in ['Admin', 'Audit', 'Branch', 'Finance', 'HR', 'JLL', 'Loan', 'MIS', 'Operation', 'TW', 'Vigilance']" 
               :key="pill" 
               class="perm-chip" 
               :class="{ selected: (selectedPref.finacle_roles || []).includes(pill) }" 
               @click="toggleRole(pill)">
            [[ pill ]]
            <!-- 'x' only shows if the pill is currently selected -->
            
          </div>
        </div>

        <!-- Helper message if nothing is selected (optional) -->
        <div v-if="!selectedPref.finacle_roles || selectedPref.finacle_roles.length === 0" 
             class="selected-empty-text" style="margin-top: 10px; width: 100%;">
            No permissions selected. Click on a role above to assign.
        </div>
    </div>
  </div>
</div>




        <!-- Lead Specific Filters Section -->
        <div class="perm-section">
          <div class="perm-section-title">Lead Specific Filters</div>
          <!-- Product and Source code here... -->
        </div>
    </div>

      <!-- IF DISABLED: Show the "Configuration Disabled" Message -->
      <div v-else class="perm-sidebar-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <div style="font-size: 16px; font-weight: 600; color: #24292f; margin-top: 12px;">Configuration Disabled</div>
          <div style="font-size: 13px; color: #57606a; margin-top: 8px; max-width: 300px; line-height: 1.5;">
              Enable this user's preferences using the toggle above to configure report filters.
          </div>
      </div>

    </div>
  </div>


          </div>
        </div>
      </div>
    `);

    PetiteVue.createApp({
      $delimiters: ["[[", "]]"],
      showTagMenu: false, // Tracks if the floating menu is open

      prefList: [],
      filteredList: [],
      searchQuery: "",
      selectedPref: null,
      selectedUsers: [],
      allOptions: {
        zone: [],
        region: [],
        state: [],
        district: [],
        sol_id: [],
        product: [],
        source: [],
        tag: [], // Added tag array
      },
      saveTimeout: null,

      init() {
        this.loadAllPreferences();
        this.loadFieldOptions();

        const route = frappe.get_route();
        if (route[2]) {
          this.selectPreference({ user: route[2] });
        }
      },

      loadAllPreferences() {
        frappe.call({
          method:
            "sahayog.sahayog.page.permission_config.permission_config.get_all_preferences",
          callback: (r) => {
            this.prefList = r.message || [];
            this.filteredList = [...this.prefList];
          },
        });
      },

      loadFieldOptions() {
        frappe.call({
          method:
            "sahayog.sahayog.page.permission_config.permission_config.get_field_options",
          callback: (r) => {
            const opts = r.message || {};
            this.allOptions.zone = opts.zone || [];
            this.allOptions.region = opts.region || [];
            this.allOptions.state = opts.state || [];
            this.allOptions.district = opts.district || [];
            this.allOptions.sol_id = opts.sol_id || [];
            this.allOptions.product = opts.product || [];
            this.allOptions.source = opts.source || [];
            this.allOptions.tag = opts.tag || []; // Load tag options
          },
        });
      },

      filterList() {
        const q = this.searchQuery.toLowerCase();
        if (!q) {
          this.filteredList = [...this.prefList];
        } else {
          this.filteredList = this.prefList.filter(
            (p) =>
              (p.full_name && p.full_name.toLowerCase().includes(q)) ||
              (p.user && p.user.toLowerCase().includes(q)),
          );
        }
      },

      highlight(text, q) {
        if (!q || !text) return text;
        const searchVal = q.trim();
        if (!searchVal) return text;
        const regex = new RegExp(`(${searchVal})`, "gi");
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
      },

      getLabel(val) {
        if (!val) return "";
        return val.replace(/\D/g, "");
      },

      selectPreference(item) {
        if (!item || !item.user) return;

        const current_route = frappe.get_route();
        if (current_route[2] !== item.user) {
          frappe.set_route("permission-config", item.user);
        }

        frappe.call({
          method:
            "sahayog.sahayog.page.permission_config.permission_config.get_preference_detail",
          args: { user: item.user },
          callback: (r) => {
            this.selectedPref = r.message || null;
            if (this.selectedPref) {
              // Ensure arrays are valid
              this.selectedPref.zone = (this.selectedPref.zone || []).filter(
                (v) => v,
              );
              this.selectedPref.region = (
                this.selectedPref.region || []
              ).filter((v) => v);
              this.selectedPref.state = (this.selectedPref.state || []).filter(
                (v) => v,
              );
              this.selectedPref.district = (
                this.selectedPref.district || []
              ).filter((v) => v);
              this.selectedPref.sol_id = (
                this.selectedPref.sol_id || []
              ).filter((v) => v);
              this.selectedPref.product = (
                this.selectedPref.product || []
              ).filter((v) => v);
              this.selectedPref.source = (
                this.selectedPref.source || []
              ).filter((v) => v);

              // Tag is a string, no filtering needed, but ensure it exists
              if (!this.selectedPref.tag) this.selectedPref.tag = "";
            }
          },
        });
      },

      // toggle(field, value) {
      //   if (!this.selectedPref) return;
      //   const arr = this.selectedPref[field];
      //   const idx = arr.indexOf(value);
      //   if (idx >= 0) arr.splice(idx, 1);
      //   else arr.push(value);
      //   this.autoSave();
      // },

      // toggleAll(field) {
      //   if (!this.selectedPref) return;
      //   if (this.isAllSelected(field)) {
      //     this.selectedPref[field] = [];
      //   } else {
      //     this.selectedPref[field] = [...this.allOptions[field]];
      //   }
      //   this.autoSave();
      // },

      toggle(field, value) {
        if (!this.selectedPref) return;

        // VALIDATION: Block Region selection if Zone is empty
        if (field === "region") {
          if (!this.selectedPref.zone || this.selectedPref.zone.length === 0) {
            frappe.show_alert(
              {
                message: __(
                  "Please select at least one <strong>Zone</strong> first.",
                ),
                indicator: "orange",
              },
              3,
            );
            return;
          }
        }

        // TOGGLE LOGIC: Add/Remove value
        const arr = this.selectedPref[field];
        const idx = arr.indexOf(value);

        if (idx >= 0) {
          arr.splice(idx, 1);
        } else {
          arr.push(value);
        }

        // AUTO-CLEAR: If Zone was emptied, clear Regions
        if (field === "zone" && this.selectedPref.zone.length === 0) {
          if (this.selectedPref.region && this.selectedPref.region.length > 0) {
            this.selectedPref.region = [];
            frappe.show_alert(
              {
                message: __("Regions cleared because no Zone is selected."),
                indicator: "blue",
              },
              3,
            );
          }
        }

        // Save to DocType
        this.autoSave();
      },

      toggleAll(field) {
        if (!this.selectedPref) return;

        // Block Region ALL if Zone empty
        if (
          field === "region" &&
          (!this.selectedPref.zone || this.selectedPref.zone.length === 0)
        ) {
          frappe.show_alert(
            {
              message: __(
                "Please select at least one <strong>Zone</strong> first.",
              ),
              indicator: "orange",
            },
            3,
          );
          return;
        }

        if (this.isAllSelected(field)) {
          this.selectedPref[field] = [];
        } else {
          this.selectedPref[field] = [...this.allOptions[field]];
        }

        // AUTO-CLEAR: If Zone ALL was deselected (emptying zones), clear Regions
        if (field === "zone" && this.selectedPref.zone.length === 0) {
          this.selectedPref.region = [];
          frappe.show_alert(
            { message: __("Regions cleared."), indicator: "blue" },
            2,
          );
        }

        this.autoSave();
      },

      toggleRole(pill) {
        if (!this.selectedPref.finacle_roles)
          this.selectedPref.finacle_roles = [];
        const arr = this.selectedPref.finacle_roles;
        const idx = arr.indexOf(pill);

        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(pill);

        this.autoSave();
      },

      isAllRolesSelected() {
        const all = [
          "HR",
          "JLL",
          "MIS",
          "Loan",
          "Audit",
          "Finance",
          "Operation",
          "TW",
          "Branch",
          "Admin",
          "Vigilance",
        ];
        const sel = this.selectedPref.finacle_roles || [];
        return sel.length === all.length;
      },

      toggleAllRoles() {
        const all = [
          "HR",
          "JLL",
          "MIS",
          "Loan",
          "Audit",
          "Finance",
          "Operation",
          "TW",
          "Branch",
          "Admin",
          "Vigilance",
        ];
        if (this.isAllRolesSelected()) {
          this.selectedPref.finacle_roles = [];
        } else {
          this.selectedPref.finacle_roles = [...all];
        }
        this.autoSave();
      },

      isAllSelected(field) {
        if (!this.selectedPref) return false;
        const all = this.allOptions[field] || [];
        const sel = this.selectedPref[field] || [];
        return all.length > 0 && sel.length === all.length;
      },

      removeSolId(val) {
        if (!this.selectedPref || !this.selectedPref.sol_id) return;

        // Filter out the clicked SOL ID
        this.selectedPref.sol_id = this.selectedPref.sol_id.filter(
          (s) => s !== val,
        );

        // Show a small feedback alert (optional)
        frappe.show_alert(
          { message: `Removed ${val}`, indicator: "orange" },
          2,
        );

        // Sync changes to the Report Preference DocType
        this.autoSave();
      },

      clearSolIds() {
        if (!this.selectedPref || !this.selectedPref.sol_id) return;
        this.selectedPref.sol_id = [];
        frappe.show_alert(
          { message: __("SOL IDs cleared."), indicator: "green" },
          2,
        );
        this.autoSave();
      },

      getTagClass(tag) {
        const map = {
          COM: "badge-green",
          ROM: "badge-blue",
          RM: "badge-orange",
          AZM: "badge-purple",
          ZM: "badge-cyan",
        };
        return map[tag] || "badge-gray";
      },

      toggleTagMenu() {
        this.showTagMenu = !this.showTagMenu;

        // Optional: Close menu when clicking anywhere else
        if (this.showTagMenu) {
          const close = () => {
            this.showTagMenu = false;
            window.removeEventListener("click", close);
          };
          setTimeout(() => window.addEventListener("click", close), 0);
        }
      },

      setTag(val) {
        if (!this.selectedPref) return;
        this.selectedPref.tag = val;
        this.showTagMenu = false; // Close menu after selection
        this.autoSave(); // Save to Report Preference DocType
      },

      autoSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
          frappe.call({
            method:
              "sahayog.sahayog.page.permission_config.permission_config.save_preference",
            args: { data: this.selectedPref },
            callback: (r) => {
              if (r.message && r.message.success) {
                frappe.show_alert({ message: "Saved", indicator: "green" }, 2);

                // Refresh list to show updated tags immediately
                this.loadAllPreferences();

                // Re-fetch details to load server-populated values (e.g. auto-mapped SOL IDs)
                if (this.selectedPref && this.selectedPref.user) {
                  this.selectPreference({ user: this.selectedPref.user });
                }
              }
            },
          });
        }, 800);
      },

      openSolIdDialog() {
        if (!this.selectedPref) return;

        // Initial state: load current selections from the record
        this.tempSelectedSolIds = [...(this.selectedPref.sol_id || [])];

        const d = new frappe.ui.Dialog({
          title: "Select SOL IDs",
          fields: [
            {
              label: "Search Branch",
              fieldname: "search_text",
              fieldtype: "Data",
              placeholder: "Type branch name or SOL ID...",
              reqd: 0,
            },
            { fieldname: "selected_area", fieldtype: "HTML" },
            { fieldname: "results", fieldtype: "HTML" },
          ],
          primary_action_label: "Save",
          primary_action: () => {
            // Apply temp selections to the real record
            this.selectedPref.sol_id = this.tempSelectedSolIds;
            this.autoSave();
            d.hide();
            frappe.show_alert({
              message: "SOL IDs updated",
              indicator: "green",
            });
          },
        });

        const renderSelectedSols = () => {
          const $area = d.fields_dict.selected_area.$wrapper;
          if (this.tempSelectedSolIds.length === 0) {
            $area.html(
              '<div class="selected-users-wrapper"><span class="selected-empty-text">No SOL IDs selected yet</span></div>',
            );
            return;
          }

          let html = '<div class="selected-users-wrapper">';
          this.tempSelectedSolIds.forEach((sol) => {
            html += `<span class="selected-pill">${sol}<span class="remove-user" data-val="${sol}">&times;</span></span>`;
          });
          html += "</div>";
          $area.html(html);

          // Click on pill to remove
          $area.find(".selected-pill").on("click", (e) => {
            const val = $(e.currentTarget)
              .find(".remove-user")
              .attr("data-val");
            this.tempSelectedSolIds = this.tempSelectedSolIds.filter(
              (s) => s !== val,
            );
            renderSelectedSols();
            // Uncheck in result list if visible
            d.fields_dict.results.$wrapper
              .find(`.search-result-item[data-sol="${val}"]`)
              .removeClass("selected")
              .find("input")
              .prop("checked", false);
          });
        };

        d.fields_dict.search_text.$input.on("input", () => {
          let value = d.get_value("search_text");
          if (!value || value.length < 1) {
            d.fields_dict.results.$wrapper.html("");
            return;
          }

          // Call a specific search for branches (adjust method path if needed)
          frappe.call({
            method:
              "sahayog.sahayog.page.permission_config.permission_config.search_branch",
            args: { search_text: value },
            callback: (r) => {
              let results = r.message || [];
              let html =
                '<div class="search-results-list" style="max-height: 250px; overflow-y: auto;">';

              if (results.length === 0) {
                html +=
                  '<div style="padding:10px; color:#57606a; font-size:13px;">No branches found</div>';
              } else {
                // Inside search_branch callback
                results.forEach((branch_doc) => {
                  let isChecked = this.tempSelectedSolIds.includes(
                    branch_doc.name,
                  );
                  html += `
        <div class="search-result-item ${isChecked ? "selected" : ""}" data-sol="${branch_doc.name}">
            <input type="checkbox" ${isChecked ? "checked" : ""} style="pointer-events:none;">
            <div class="search-result-info">
                <!-- branch_doc.branch is the descriptive name, branch_doc.name is the SOL ID -->
                <div class="search-result-name">${branch_doc.branch || branch_doc.name}</div>
                <div class="search-result-email">SOL ID: ${branch_doc.name}</div>
            </div>
        </div>`;
                });
              }
              html += "</div>";

              const $wrapper = d.fields_dict.results.$wrapper;
              $wrapper.html(html);

              $wrapper.find(".search-result-item").on("click", (e) => {
                const $item = $(e.currentTarget);
                const sol = $item.attr("data-sol");
                const $checkbox = $item.find('input[type="checkbox"]');

                if (this.tempSelectedSolIds.includes(sol)) {
                  this.tempSelectedSolIds = this.tempSelectedSolIds.filter(
                    (s) => s !== sol,
                  );
                  $item.removeClass("selected");
                  $checkbox.prop("checked", false);
                } else {
                  this.tempSelectedSolIds.push(sol);
                  $item.addClass("selected");
                  $checkbox.prop("checked", true);
                }
                renderSelectedSols();
              });
            },
          });
        });

        d.show();
        renderSelectedSols();
      },

      createNew() {
        // ... (create logic same as before, no changes needed for Tag unless you want to add tag selection in creation dialog too)
        this.selectedUsers = [];
        const d = new frappe.ui.Dialog({
          title: "Create New Preference",
          fields: [
            {
              label: "Search User",
              fieldname: "search_text",
              fieldtype: "Data",
              placeholder: "Type user name or email...",
              reqd: 1,
            },
            { fieldname: "selected_area", fieldtype: "HTML" },
            { fieldname: "results", fieldtype: "HTML" },
          ],
          primary_action_label: "Create",
          primary_action: (values) => {
            if (this.selectedUsers.length === 0) {
              frappe.msgprint("Please select at least one user.");
              return;
            }
            const promises = this.selectedUsers.map((user) => {
              return frappe.call({
                method:
                  "sahayog.sahayog.page.permission_config.permission_config.save_preference",
                args: {
                  data: {
                    user: user,
                    tag: "", // Default empty tag
                    zone: [],
                    region: [],
                    state: [],
                    district: [],
                    sol_id: [],
                    product: [],
                    source: [],
                  },
                },
              });
            });

            Promise.all(promises).then(() => {
              frappe.show_alert(
                {
                  message: `Created for ${this.selectedUsers.length} users`,
                  indicator: "green",
                },
                3,
              );
              this.loadAllPreferences();
              d.hide();
              if (this.selectedUsers.length > 0) {
                setTimeout(() => {
                  const newItem = this.prefList.find(
                    (p) => p.user === this.selectedUsers[0],
                  );
                  if (newItem) this.selectPreference(newItem);
                }, 500);
              }
            });
          },
        });

        // ... (rest of search/pill logic same as before)
        const renderSelectedUsers = () => {
          const $area = d.fields_dict.selected_area.$wrapper;
          if (this.selectedUsers.length === 0) {
            $area.html(
              '<div class="selected-users-wrapper"><span class="selected-empty-text">No users selected yet</span></div>',
            );
            d.get_primary_btn().text("Create");
            return;
          }
          let html = '<div class="selected-users-wrapper">';
          this.selectedUsers.forEach((user) => {
            const displayName = user.split("@")[0];
            html += `<span class="selected-pill" data-user="${user}">${displayName}<span class="remove-user" onclick="this.parentElement.click()">&times;</span></span>`;
          });
          html += "</div>";
          $area.html(html);
          $area.find(".selected-pill").on("click", (e) => {
            const user = $(e.currentTarget).attr("data-user");
            this.selectedUsers = this.selectedUsers.filter((u) => u !== user);
            renderSelectedUsers();
            d.fields_dict.results.$wrapper
              .find(`.search-result-item[data-user="${user}"]`)
              .removeClass("selected")
              .find("input")
              .prop("checked", false);
          });
          d.get_primary_btn().text(`Create (${this.selectedUsers.length})`);
        };

        renderSelectedUsers();

        d.fields_dict.search_text.$input.on("input", () => {
          let value = d.get_value("search_text");
          if (!value || value.length < 1) {
            d.fields_dict.results.$wrapper.html("");
            return;
          }
          frappe.call({
            method:
              "sahayog.sahayog.page.permission_config.permission_config.search_user",
            args: { search_text: value },
            callback: (r) => {
              let results = r.message || [];
              let html =
                '<div class="search-results-list" style="max-height: 250px; overflow-y: auto;">';
              if (results.length === 0) {
                html +=
                  '<div style="padding:10px; color:#57606a; font-size:13px;">No users found</div>';
              } else {
                results.forEach((user) => {
                  let highlightedName = this.highlight(user.name, value);
                  let highlightedFullName = user.full_name
                    ? this.highlight(user.full_name, value)
                    : "";
                  let isChecked = this.selectedUsers.includes(user.name);
                  html += `<div class="search-result-item ${isChecked ? "selected" : ""}" data-user="${user.name}"><input type="checkbox" ${isChecked ? "checked" : ""} style="pointer-events:none;"><div class="search-result-info"><div class="search-result-name">${highlightedFullName || highlightedName}</div><div class="search-result-email">${highlightedName}</div></div></div>`;
                });
              }
              html += "</div>";
              const $wrapper = d.fields_dict.results.$wrapper;
              $wrapper.html(html);
              $wrapper.find(".search-result-item").on("click", (e) => {
                const $item = $(e.currentTarget);
                const user = $item.attr("data-user");
                const $checkbox = $item.find('input[type="checkbox"]');
                if (this.selectedUsers.includes(user)) {
                  this.selectedUsers = this.selectedUsers.filter(
                    (u) => u !== user,
                  );
                  $item.removeClass("selected");
                  $checkbox.prop("checked", false);
                } else {
                  this.selectedUsers.push(user);
                  $item.addClass("selected");
                  $checkbox.prop("checked", true);
                }
                renderSelectedUsers();
              });
            },
          });
        });
        d.show();
      },
    }).mount("#perm-root");
  });
};
