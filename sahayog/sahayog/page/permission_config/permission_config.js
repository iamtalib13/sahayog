// apps/sahayog/sahayog/sahayog/page/permission_config/permission_config.js

frappe.pages["permission-config"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Permission Configuration",
    single_column: true,
  });

  $(wrapper).find(".page-content").css({ padding: "0", maxWidth: "none" });
  $(wrapper).find(".layout-main-section").css({ maxWidth: "none" });

  frappe.require("/assets/sahayog/js/petite-vue.iife.js", () => {
    page.main.html(`
      <style>
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
        .perm-pane {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .perm-main { 
          width: 30%; 
          border-right: 1px solid #d0d7de; 
          background: transparent;
        }
        .perm-sidebar { 
          width: 70%; 
          background: transparent;
        }

        /* Pane Header Styling */
        .perm-pane-header {
          padding: 12px 16px;
          background: transparent;
          border-bottom: 1px solid #d0d7de;
          flex-shrink: 0;
        }
        .perm-pane-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #24292f;
        }

        /* Pane Content Scrollable Area */
        .perm-pane-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px;
        }

        /* Internal Components */
        .perm-header { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          margin-bottom: 16px; 
          padding-bottom: 12px; 
          border-bottom: 1px solid #d0d7de; 
        }
        .perm-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #24292f; }
        
        .perm-search { position: relative; width: 100%; max-width: 320px; }
        .perm-search input { 
          width: 100%; 
          padding: 5px 12px 5px 32px; 
          border: 1px solid #d0d7de; 
          border-radius: 6px; 
          font-size: 14px; 
          background-color: transparent;
          color: #24292f;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .perm-search input:focus { 
          outline: none; 
          border-color: #0969da; 
          box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.3); 
          background-color: transparent;
        }
        .perm-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #57606a; }
        
        .perm-list { display: flex; flex-direction: column; gap: 0; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
        .perm-card { 
          padding: 12px 16px; 
          border-bottom: 1px solid #d0d7de; 
          background: transparent; 
          cursor: pointer; 
          transition: background 0.1s; 
        }
        .perm-card:last-child { border-bottom: none; }
        .perm-card:hover { background: rgba(0,0,0,0.03); }
        .perm-card.active { background: rgba(0,0,0,0.03); border-left: 2px solid #0969da; padding-left: 14px; }
        .perm-card-name { font-size: 14px; font-weight: 600; color: #24292f; }
        .perm-card-email { font-size: 12px; color: #57606a; margin-top: 2px; }
        
        .perm-btn { 
          padding: 5px 16px; 
          background: transparent; 
          color: #24292f; 
          border: 1px solid #d0d7de; 
          border-radius: 6px; 
          font-size: 14px; 
          font-weight: 600; 
          cursor: pointer; 
          box-shadow: 0 1px 0 rgba(27,31,36,0.04);
          transition: background 0.2s;
        }
        .perm-btn:hover { background: rgba(0,0,0,0.03); }
        .perm-btn:active { background: rgba(0,0,0,0.05); }
        
        .perm-empty { padding: 32px; text-align: center; color: #57606a; border: 1px dashed #d0d7de; border-radius: 6px; font-size: 14px; }
        
        .perm-sidebar-empty { padding: 64px 32px; text-align: center; color: #57606a; }
        .perm-sidebar-empty svg { width: 40px; height: 40px; margin: 0 auto 16px; color: #d0d7de; }
        
        .perm-side-header { font-size: 16px; font-weight: 600; color: #24292f; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #d0d7de; }
        .perm-user-info { margin-bottom: 24px; padding: 16px; background: transparent; border: 1px solid #d0d7de; border-radius: 6px; }
        .perm-user-info div { font-size: 13px; color: #24292f; margin-bottom: 8px; }
        .perm-user-info div:last-child { margin-bottom: 0; }
        .perm-user-info strong { color: #24292f; font-weight: 600; }
        
        .perm-section { margin-bottom: 32px; }
        .perm-section-title { font-size: 12px; font-weight: 600; color: #57606a; text-transform: uppercase; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #d0d7de; }
        .perm-field { margin-bottom: 24px; }
        .perm-flabel { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #24292f; }
        .perm-flink { font-size: 12px; font-weight: 600; color: #0969da; cursor: pointer; text-decoration: none; }
        .perm-flink:hover { text-decoration: underline; }
        
        .perm-check-grid { display: grid; gap: 8px; }
        .perm-check-grid-zone, .perm-check-grid-region { grid-template-columns: repeat(auto-fill, minmax(45px, 1fr)); }
        .perm-check-grid-multi { grid-template-columns: 1fr; }
        
        .perm-check-item { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 8px 12px; 
          border: 1px solid #d0d7de; 
          border-radius: 6px; 
          background: transparent; 
          cursor: pointer; 
          transition: background 0.1s, border-color 0.1s; 
        }
        .perm-check-item:hover { background: rgba(0,0,0,0.03); }
        .perm-check-item.selected { background: rgba(9, 105, 218, 0.05); border-color: #0969da; }
        .perm-check-item input { margin: 0; cursor: pointer; accent-color: #0969da; }
        .perm-check-item label { margin: 0; font-size: 13px; color: #24292f; cursor: pointer; flex: 1; font-weight: 400; }
        
        .perm-control-wrap { margin-bottom: 20px; }
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

        /* Selected Pills in Dialog */
        .selected-users-wrapper { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; padding: 8px; border: 1px solid #d0d7de; border-radius: 6px; background: rgba(0,0,0,0.02); min-height: 40px; align-items: center; }
        .selected-pill { display: flex; align-items: center; gap: 6px; padding: 2px 10px; background: #0969da; color: #fff; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .selected-pill .remove-user { cursor: pointer; font-size: 14px; line-height: 1; opacity: 0.8; }
        .selected-pill .remove-user:hover { opacity: 1; }
        .selected-empty-text { font-size: 12px; color: #57606a; font-style: italic; }

        /* Scrollbar styling */
        .perm-pane-content::-webkit-scrollbar { width: 6px; }
        .perm-pane-content::-webkit-scrollbar-track { background: transparent; }
        .perm-pane-content::-webkit-scrollbar-thumb { background: #d0d7de; border-radius: 10px; }
        .perm-pane-content::-webkit-scrollbar-thumb:hover { background: #afb8c1; }
      </style>

      <div id="perm-root" v-scope @vue:mounted="init()">
        <div class="perm-layout">
          
          <div class="perm-main perm-pane">
            <div class="perm-pane-header">
              <h3>Users</h3>
            </div>
            <div class="perm-pane-content">
              <div class="perm-header">
                <h3>Report Preferences</h3>
                <button class="perm-btn" @click="createNew">+ New</button>
              </div>
              
              <div class="perm-search" style="margin-bottom: 16px;">
                <svg class="perm-search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input type="text" placeholder="Search..." v-model="searchQuery" @input="filterList">
              </div>

              <div class="perm-list" v-if="filteredList.length">
                <div v-for="item in filteredList" :key="item.name" 
                     class="perm-card" 
                     :class="{ active: selectedPref && selectedPref.user === item.user }"
                     @click="selectPreference(item)">
                  <div class="perm-card-name" v-html="highlight(item.full_name || item.user, searchQuery)"></div>
                  <div class="perm-card-email" v-html="highlight(item.user, searchQuery)"></div>
                </div>
              </div>

              <div class="perm-empty" v-else>
                No users found.
              </div>
            </div>
          </div>

          <div class="perm-sidebar perm-pane">
            <div class="perm-pane-header">
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
            </div>
            <div class="perm-pane-content">
              
              <div v-if="!selectedPref" class="perm-sidebar-empty">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <div style="font-size: 14px; font-weight: 500;">No User Selected</div>
                <div style="font-size: 13px; margin-top: 8px;">Select a user from the list to manage their permission preferences</div>
              </div>

              <div v-else>
                <div class="perm-section">
                  <div class="perm-section-title">Geographic Filters</div>

                  <div class="perm-field">
                    <div class="perm-flabel">
                      <span>Zone</span>
                      <a class="perm-flink" @click="toggleAll('zone')">[[ isAllSelected('zone') ? 'Deselect All' : 'Select All' ]]</a>
                    </div>
                    <div v-if="allOptions.zone.length" class="perm-check-grid perm-check-grid-zone">
                      <div v-for="opt in allOptions.zone" :key="opt"
                           class="perm-check-item"
                           :class="{ selected: selectedPref.zone.includes(opt) }"
                           @click="toggle('zone', opt)">
                        <input type="checkbox" :checked="selectedPref.zone.includes(opt)" @click.stop="toggle('zone', opt)">
                        <label>[[ getLabel(opt) ]]</label>
                      </div>
                    </div>
                    <div v-else class="perm-no-options">No options available</div>
                  </div>

                  <div class="perm-field">
                    <div class="perm-flabel">
                      <span>Region</span>
                      <a class="perm-flink" @click="toggleAll('region')">[[ isAllSelected('region') ? 'Deselect All' : 'Select All' ]]</a>
                    </div>
                    <div v-if="allOptions.region.length" class="perm-check-grid perm-check-grid-region">
                      <div v-for="opt in allOptions.region" :key="opt"
                           class="perm-check-item"
                           :class="{ selected: selectedPref.region.includes(opt) }"
                           @click="toggle('region', opt)">
                        <input type="checkbox" :checked="selectedPref.region.includes(opt)" @click.stop="toggle('region', opt)">
                        <label>[[ getLabel(opt) ]]</label>
                      </div>
                    </div>
                    <div v-else class="perm-no-options">No options available</div>
                  </div>

                  <div class="perm-field">
                    <div class="perm-flabel">
                      <span>State</span>
                    </div>
                    <div v-if="allOptions.state.length" class="perm-check-grid perm-check-grid-multi">
                      <div v-for="opt in allOptions.state" :key="opt"
                           class="perm-check-item"
                           :class="{ selected: selectedPref.state.includes(opt) }"
                           @click="toggle('state', opt)">
                        <input type="checkbox" :checked="selectedPref.state.includes(opt)" @click.stop="toggle('state', opt)">
                        <label>[[ opt ]]</label>
                      </div>
                    </div>
                    <div v-else class="perm-no-options">No options available</div>
                  </div>

                  <div class="perm-field">
                    <div class="perm-flabel">
                      <span>District</span>
                    </div>
                    <div v-if="allOptions.district.length" class="perm-check-grid perm-check-grid-multi">
                      <div v-for="opt in allOptions.district" :key="opt"
                           class="perm-check-item"
                           :class="{ selected: selectedPref.district.includes(opt) }"
                           @click="toggle('district', opt)">
                        <input type="checkbox" :checked="selectedPref.district.includes(opt)" @click.stop="toggle('district', opt)">
                        <label>[[ opt ]]</label>
                      </div>
                    </div>
                    <div v-else class="perm-no-options">No options available</div>
                  </div>

                  <div class="perm-field">
                    <div class="perm-flabel">
                      <span>Sol ID</span>
                    </div>
                    <div v-if="allOptions.sol_id.length" class="perm-check-grid perm-check-grid-multi">
                      <div v-for="opt in allOptions.sol_id" :key="opt"
                           class="perm-check-item"
                           :class="{ selected: selectedPref.sol_id.includes(opt) }"
                           @click="toggle('sol_id', opt)">
                        <input type="checkbox" :checked="selectedPref.sol_id.includes(opt)" @click.stop="toggle('sol_id', opt)">
                        <label>[[ opt ]]</label>
                      </div>
                    </div>
                    <div v-else class="perm-no-options">No options available</div>
                  </div>
                </div>

                <div class="perm-section">
                  <div class="perm-section-title">Lead Specific Filters</div>

                  <div class="perm-field">
                    <div class="perm-flabel">
                      <span>Product</span>
                    </div>
                    <div v-if="allOptions.product.length" class="perm-check-grid perm-check-grid-multi">
                      <div v-for="opt in allOptions.product" :key="opt"
                           class="perm-check-item"
                           :class="{ selected: selectedPref.product.includes(opt) }"
                           @click="toggle('product', opt)">
                        <input type="checkbox" :checked="selectedPref.product.includes(opt)" @click.stop="toggle('product', opt)">
                        <label>[[ opt ]]</label>
                      </div>
                    </div>
                    <div v-else class="perm-no-options">No options available</div>
                  </div>

                  <div class="perm-field">
                    <div class="perm-flabel">
                      <span>Source</span>
                    </div>
                    <div v-if="allOptions.source.length" class="perm-check-grid perm-check-grid-multi">
                      <div v-for="opt in allOptions.source" :key="opt"
                           class="perm-check-item"
                           :class="{ selected: selectedPref.source.includes(opt) }"
                           @click="toggle('source', opt)">
                        <input type="checkbox" :checked="selectedPref.source.includes(opt)" @click.stop="toggle('source', opt)">
                        <label>[[ opt ]]</label>
                      </div>
                    </div>
                    <div v-else class="perm-no-options">No options available</div>
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

      prefList: [],
      filteredList: [],
      searchQuery: "",
      selectedPref: null,
      selectedUsers: [], // Array to track multiple user selections in dialog
      allOptions: {
        zone: [],
        region: [],
        state: [],
        district: [],
        sol_id: [],
        product: [],
        source: [],
      },
      saveTimeout: null,

      init() {
        this.loadAllPreferences();
        this.loadFieldOptions();

        // Handle initial route
        const route = frappe.get_route();
        if (route[2]) {
          // If URL has /permission-config/user@email.com
          this.selectPreference({ user: route[2] });
        }
      },

      loadAllPreferences() {
        frappe.call({
          method: "sahayog.sahayog.page.permission_config.permission_config.get_all_preferences",
          callback: (r) => {
            this.prefList = r.message || [];
            this.filteredList = [...this.prefList];

            // If no user in route, but we have a list, maybe auto-select?
            // (Optional: this.selectPreference(this.prefList[0]))
          },
        });
      },

      loadFieldOptions() {
        frappe.call({
          method: "sahayog.sahayog.page.permission_config.permission_config.get_field_options",
          callback: (r) => {
            const opts = r.message || {};
            this.allOptions.zone = opts.zone || [];
            this.allOptions.region = opts.region || [];
            this.allOptions.state = opts.state || [];
            this.allOptions.district = opts.district || [];
            this.allOptions.sol_id = opts.sol_id || [];
            this.allOptions.product = opts.product || [];
            this.allOptions.source = opts.source || [];
            
            console.log("Loaded options:", this.allOptions);
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
              (p.user && p.user.toLowerCase().includes(q))
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

        // Update URL route without refreshing
        const current_route = frappe.get_route();
        if (current_route[2] !== item.user) {
          frappe.set_route("permission-config", item.user);
        }

        frappe.call({
          method: "sahayog.sahayog.page.permission_config.permission_config.get_preference_detail",
          args: { user: item.user },
          callback: (r) => {
            this.selectedPref = r.message || null;
            if (this.selectedPref) {
              // Filter out null values
              this.selectedPref.zone = (this.selectedPref.zone || []).filter(v => v);
              this.selectedPref.region = (this.selectedPref.region || []).filter(v => v);
              this.selectedPref.state = (this.selectedPref.state || []).filter(v => v);
              this.selectedPref.district = (this.selectedPref.district || []).filter(v => v);
              this.selectedPref.sol_id = (this.selectedPref.sol_id || []).filter(v => v);
              this.selectedPref.product = (this.selectedPref.product || []).filter(v => v);
              this.selectedPref.source = (this.selectedPref.source || []).filter(v => v);
            }
          },
        });
      },

      toggle(field, value) {
        if (!this.selectedPref) return;
        const arr = this.selectedPref[field];
        const idx = arr.indexOf(value);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(value);
        this.autoSave();
      },

      isAllSelected(field) {
        if (!this.selectedPref) return false;
        const all = this.allOptions[field] || [];
        const sel = this.selectedPref[field] || [];
        return all.length > 0 && sel.length === all.length;
      },

      toggleAll(field) {
        if (!this.selectedPref) return;
        if (this.isAllSelected(field)) {
          this.selectedPref[field] = [];
        } else {
          this.selectedPref[field] = [...this.allOptions[field]];
        }
        this.autoSave();
      },

      autoSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
          frappe.call({
            method: "sahayog.sahayog.page.permission_config.permission_config.save_preference",
            args: { data: this.selectedPref },
            callback: (r) => {
              if (r.message && r.message.success) {
                frappe.show_alert({ message: "Saved", indicator: "green" }, 2);
                this.loadAllPreferences();
              }
            },
          });
        }, 800);
      },

      createNew() {
        this.selectedUsers = []; // Reset selections
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
            {
              fieldname: "selected_area",
              fieldtype: "HTML",
            },
            {
              fieldname: "results",
              fieldtype: "HTML",
            }
          ],
          primary_action_label: "Create",
          primary_action: (values) => {
            if (this.selectedUsers.length === 0) {
              frappe.msgprint("Please select at least one user from the search results.");
              return;
            }

            const promises = this.selectedUsers.map(user => {
              return frappe.call({
                method: "sahayog.sahayog.page.permission_config.permission_config.save_preference",
                args: {
                  data: {
                    user: user,
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
              frappe.show_alert({ message: `Created preferences for ${this.selectedUsers.length} users`, indicator: "green" }, 3);
              this.loadAllPreferences();
              d.hide();
              
              // Select the first one after a short delay
              if (this.selectedUsers.length > 0) {
                const firstUser = this.selectedUsers[0];
                setTimeout(() => {
                  const newItem = this.prefList.find(p => p.user === firstUser);
                  if (newItem) this.selectPreference(newItem);
                }, 500);
              }
            });
          },
        });

        // Function to render selected users
        const renderSelectedUsers = () => {
          const $area = d.fields_dict.selected_area.$wrapper;
          if (this.selectedUsers.length === 0) {
            $area.html('<div class="selected-users-wrapper"><span class="selected-empty-text">No users selected yet</span></div>');
            d.get_primary_btn().text("Create");
            return;
          }

          let html = '<div class="selected-users-wrapper">';
          this.selectedUsers.forEach(user => {
            const displayName = user.split('@')[0];
            html += `<span class="selected-pill" data-user="${user}">
                        ${displayName}
                        <span class="remove-user" onclick="this.parentElement.click()">&times;</span>
                     </span>`;
          });
          html += '</div>';
          $area.html(html);

          // Handle pill clicks (to remove)
          $area.find('.selected-pill').on('click', (e) => {
            const user = $(e.currentTarget).attr('data-user');
            this.selectedUsers = this.selectedUsers.filter(u => u !== user);
            
            // Re-render both parts
            renderSelectedUsers();
            
            // Uncheck in search results if visible
            d.fields_dict.results.$wrapper.find(`.search-result-item[data-user="${user}"]`).removeClass('selected').find('input').prop('checked', false);
          });

          d.get_primary_btn().text(`Create (${this.selectedUsers.length})`);
        };

        // Initial render
        renderSelectedUsers();

        // Real-time search logic
        d.fields_dict.search_text.$input.on("input", () => {
          let value = d.get_value("search_text");

          if (!value || value.length < 1) {
            d.fields_dict.results.$wrapper.html("");
            return;
          }

          frappe.call({
            method: "sahayog.sahayog.page.permission_config.permission_config.search_user",
            args: { search_text: value },
            callback: (r) => {
              let results = r.message || [];
              let html = '<div class="search-results-list" style="max-height: 250px; overflow-y: auto;">';

              if (results.length === 0) {
                html += '<div style="padding:10px; color:#57606a; font-size:13px;">No users found</div>';
              } else {
                results.forEach((user) => {
                  let highlightedName = this.highlight(user.name, value);
                  let highlightedFullName = user.full_name ? this.highlight(user.full_name, value) : "";
                  let isChecked = this.selectedUsers.includes(user.name);

                  html += `
                  <div class="search-result-item ${isChecked ? 'selected' : ''}" 
                       data-user="${user.name}">
                      <input type="checkbox" ${isChecked ? 'checked' : ''} style="pointer-events:none;">
                      <div class="search-result-info">
                        <div class="search-result-name">${highlightedFullName || highlightedName}</div>
                        <div class="search-result-email">${highlightedName}</div>
                      </div>
                  </div>`;
                });
              }

              html += "</div>";
              const $wrapper = d.fields_dict.results.$wrapper;
              $wrapper.html(html);

              // Handle clicks on items
              $wrapper.find('.search-result-item').on('click', (e) => {
                const $item = $(e.currentTarget);
                const user = $item.attr('data-user');
                const $checkbox = $item.find('input[type="checkbox"]');
                
                if (this.selectedUsers.includes(user)) {
                  this.selectedUsers = this.selectedUsers.filter(u => u !== user);
                  $item.removeClass('selected');
                  $checkbox.prop('checked', false);
                } else {
                  this.selectedUsers.push(user);
                  $item.addClass('selected');
                  $checkbox.prop('checked', true);
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
