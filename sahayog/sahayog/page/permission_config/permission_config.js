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
        #perm-root { background: #fafafa; min-height: calc(100vh - 100px); }
        .perm-layout { display: grid; grid-template-columns: 1fr 400px; gap: 0; }
        
        .perm-main { padding: 20px; border-right: 1px solid #d1d5db; background: #fff; }
        .perm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
        .perm-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
        .perm-search { position: relative; width: 320px; }
        .perm-search input { width: 100%; padding: 10px 14px 10px 38px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .perm-search input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .perm-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
        
        .perm-list { display: grid; gap: 12px; }
        .perm-card { padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; cursor: pointer; transition: all 0.2s; }
        .perm-card:hover { border-color: #3b82f6; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15); }
        .perm-card.active { border-color: #3b82f6; background: #eff6ff; }
        .perm-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .perm-card-name { font-size: 15px; font-weight: 600; color: #111827; }
        .perm-card-email { font-size: 13px; color: #6b7280; margin-top: 4px; }
        
        .perm-btn { padding: 10px 18px; background: #3b82f6; color: #fff; border: 1px solid #3b82f6; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .perm-btn:hover { background: #2563eb; }
        .perm-empty { padding: 40px; text-align: center; color: #9ca3af; border: 1px dashed #d1d5db; border-radius: 10px; }
        
        .perm-sidebar { padding: 20px; background: #fff; overflow-y: auto; max-height: calc(100vh - 100px); }
        .perm-sidebar-empty { padding: 60px 20px; text-align: center; color: #9ca3af; border: 1px dashed #d1d5db; border-radius: 10px; }
        .perm-sidebar-empty svg { width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.4; }
        
        .perm-side-header { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
        .perm-user-info { margin-bottom: 20px; padding: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
        .perm-user-info div { font-size: 13px; color: #374151; margin-bottom: 6px; }
        .perm-user-info div:last-child { margin-bottom: 0; }
        .perm-user-info strong { color: #111827; font-weight: 600; }
        
        .perm-section { margin-bottom: 24px; }
        .perm-section-title { font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
        .perm-field { margin-bottom: 20px; }
        .perm-flabel { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; font-weight: 600; color: #111827; }
        .perm-flink { font-size: 12px; font-weight: 600; color: #3b82f6; cursor: pointer; text-decoration: none; }
        .perm-flink:hover { text-decoration: underline; }
        
        .perm-check-grid { display: grid; gap: 10px; }
        .perm-check-grid-zone { grid-template-columns: repeat(3, 1fr); }
        .perm-check-grid-region { grid-template-columns: repeat(2, 1fr); }
        .perm-check-grid-multi { grid-template-columns: 1fr; }
        
        .perm-check-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #fafafa; cursor: pointer; transition: all 0.15s; }
        .perm-check-item:hover { background: #f3f4f6; border-color: #9ca3af; }
        .perm-check-item.selected { background: #dbeafe; border-color: #3b82f6; }
        .perm-check-item input { margin: 0; cursor: pointer; }
        .perm-check-item label { margin: 0; font-size: 13px; color: #111827; cursor: pointer; flex: 1; }
        
        .perm-control-wrap { margin-bottom: 16px; }
        .perm-no-options { padding: 12px; text-align: center; color: #9ca3af; font-size: 12px; border: 1px dashed #d1d5db; border-radius: 8px; }
        
        @media (max-width: 1200px) { .perm-layout { grid-template-columns: 1fr; } }
      </style>

      <div id="perm-root" v-scope @vue:mounted="init()">
        <div class="perm-layout">
          
          <div class="perm-main">
            <div class="perm-header">
              <h3>Report Preferences</h3>
              <div style="display: flex; gap: 12px; align-items: center;">
                <div class="perm-search">
                  <svg class="perm-search-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                  <input type="text" placeholder="Search by name or email..." v-model="searchQuery" @input="filterList">
                </div>
                <button class="perm-btn" @click="createNew">+ Create New</button>
              </div>
            </div>

            <div class="perm-list" v-if="filteredList.length">
              <div v-for="item in filteredList" :key="item.name" 
                   class="perm-card" 
                   :class="{ active: selectedPref && selectedPref.user === item.user }"
                   @click="selectPreference(item)">
                <div class="perm-card-top">
                  <div class="perm-card-name">[[ item.full_name || item.user ]]</div>
                </div>
                <div class="perm-card-email">[[ item.user ]]</div>
              </div>
            </div>

            <div class="perm-empty" v-else>
              No preferences found. Click "Create New" to add one.
            </div>
          </div>

          <div class="perm-sidebar">
            
            <div v-if="!selectedPref" class="perm-sidebar-empty">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              <div>Select a user from the list to view and edit their permission preferences</div>
            </div>

            <div v-else>
              <div class="perm-side-header">Edit Permissions</div>

              <div class="perm-user-info">
                <div><strong>User:</strong> [[ selectedPref.user ]]</div>
                <div><strong>Name:</strong> [[ selectedPref.full_name || '-' ]]</div>
              </div>

              <div class="perm-control-wrap">
                <div class="perm-flabel"><span>User</span></div>
                <div class="perm-control-user"></div>
              </div>

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
                      <label>[[ opt ]]</label>
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
                      <label>[[ opt ]]</label>
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
    `);

    PetiteVue.createApp({
      $delimiters: ["[[", "]]"],

      prefList: [],
      filteredList: [],
      searchQuery: "",
      selectedPref: null,
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
      },

      loadAllPreferences() {
        frappe.call({
          method: "sahayog.sahayog.page.permission_config.permission_config.get_all_preferences",
          callback: (r) => {
            this.prefList = r.message || [];
            this.filteredList = [...this.prefList];
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

      selectPreference(item) {
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
            this.mountControls();
          },
        });
      },

      mountControls() {
        if (!this.selectedPref) return;

        this.$nextTick(() => {
          const userCtrl = frappe.ui.form.make_control({
            parent: $(page.main).find(".perm-control-user"),
            df: {
              fieldtype: "Link",
              fieldname: "user",
              options: "User",
              onchange: () => {
                const newUser = userCtrl.get_value();
                if (newUser && newUser !== this.selectedPref.user) {
                  // Load new user's preference
                  frappe.call({
                    method: "sahayog.sahayog.page.permission_config.permission_config.get_preference_detail",
                    args: { user: newUser },
                    callback: (r) => {
                      this.selectedPref = r.message || null;
                      if (this.selectedPref) {
                        this.selectedPref.zone = (this.selectedPref.zone || []).filter(v => v);
                        this.selectedPref.region = (this.selectedPref.region || []).filter(v => v);
                        this.selectedPref.state = (this.selectedPref.state || []).filter(v => v);
                        this.selectedPref.district = (this.selectedPref.district || []).filter(v => v);
                        this.selectedPref.sol_id = (this.selectedPref.sol_id || []).filter(v => v);
                        this.selectedPref.product = (this.selectedPref.product || []).filter(v => v);
                        this.selectedPref.source = (this.selectedPref.source || []).filter(v => v);
                      }
                      userCtrl.set_value(newUser);
                    },
                  });
                }
              },
            },
            render_input: true,
          });
          userCtrl.set_value(this.selectedPref.user);
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
        const d = new frappe.ui.Dialog({
          title: "Create New Preference",
          fields: [
            { fieldtype: "Link", fieldname: "user", label: "User", options: "User", reqd: 1 },
          ],
          primary_action_label: "Create",
          primary_action: (values) => {
            frappe.call({
              method: "sahayog.sahayog.page.permission_config.permission_config.save_preference",
              args: {
                data: {
                  user: values.user,
                  zone: [],
                  region: [],
                  state: [],
                  district: [],
                  sol_id: [],
                  product: [],
                  source: [],
                },
              },
              callback: (r) => {
                if (r.message && r.message.success) {
                  frappe.show_alert({ message: "Created successfully", indicator: "green" }, 3);
                  this.loadAllPreferences();
                  d.hide();
                  
                  // Auto-select the newly created preference
                  setTimeout(() => {
                    const newItem = this.prefList.find(p => p.user === values.user);
                    if (newItem) this.selectPreference(newItem);
                  }, 500);
                }
              },
            });
          },
        });
        d.show();
      },
    }).mount("#perm-root");
  });
};
