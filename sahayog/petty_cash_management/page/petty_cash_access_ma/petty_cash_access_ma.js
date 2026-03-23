frappe.pages['petty-cash-access-ma'].on_page_load = function(wrapper) { 
    let page = frappe.ui.make_app_page({ 
        parent: wrapper, 
        title: 'Petty Cash Access Management', 
        single_column: true 
    }); 

    $(wrapper).find(".page-content").css({ padding: "0", maxWidth: "none" });
    $(wrapper).find(".layout-main-section").css({ maxWidth: "none" });
 
    frappe.require('/assets/sahayog/js/petite-vue.iife.js', () => { 
        page.main.html(` 
            <style>
			.page-container {
			margin-top: 66px !important;
			}
                * { box-sizing: border-box; }
                #perm-root { 
                  height: calc(100vh - 110px); 
                  overflow: hidden; 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                  color: #24292f;
                }
                .perm-layout { 
                  display: flex; height: 81%; border: 1px solid #d0d7de; border-radius: 6px;
                  margin: 0 16px 16px 16px; background: transparent;
                  box-shadow: 0 1px 2px rgba(27,31,36,0.04); overflow: hidden;
                }
                
                .perm-pane { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
                .perm-main { width: 35%; border-right: 1px solid #d0d7de; background: transparent; }
                .perm-sidebar { width: 65%; background: transparent; }

                .perm-pane-header { padding: 12px 16px; border-bottom: 1px solid #d0d7de; flex-shrink: 0; }
                .perm-pane-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: #24292f; }
                .perm-pane-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 19px; }

                .perm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #d0d7de; }
                .perm-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #24292f; }
                
                .perm-search { position: relative; width: 100%; margin-bottom: 16px; }
                .perm-search input { 
                  width: 100%; padding: 6px 12px 6px 32px; border: 1px solid #d0d7de; border-radius: 6px; 
                  font-size: 14px; background-color: transparent; color: #24292f;
                  transition: border-color 0.2s, box-shadow 0.2s;
                }
                .perm-search input:focus { outline: none; border-color: #0969da; box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.3); }
                .perm-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #57606a; }
                
                .perm-list { display: flex; flex-direction: column; gap: 0; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
                .perm-card { padding: 12px 16px; border-bottom: 1px solid #d0d7de; cursor: pointer; transition: background 0.1s; }
                .perm-card:last-child { border-bottom: none; }
                .perm-card:hover { background: rgba(0,0,0,0.03); }
                .perm-card.active { background: rgba(0,0,0,0.03); border-left: 3px solid #0969da; padding-left: 13px; }
                
                .perm-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
                .perm-card-name { font-size: 14px; font-weight: 600; color: #24292f; }
                .perm-card-email { font-size: 12px; color: #57606a; }
                .perm-tag-badge { background: #e8eaed; color: #57606a; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 10px; border: 1px solid #d0d7de; }
                .search-highlight { background: #fff2ac; padding: 0; border-radius: 2px; }

                .perm-sidebar-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 64px 32px; text-align: center; color: #57606a; }
                .perm-sidebar-empty svg { width: 40px; height: 40px; margin-bottom: 16px; color: #d0d7de; }

                /* Settings Card */
                .perm-section { margin-bottom: 32px; }
                .perm-field { border: 1px solid #d0d7de; padding: 16px; border-radius: 6px; background: #fafbfc; display: flex; justify-content: space-between; align-items: center; }
                .perm-flabel { font-size: 14px; font-weight: 600; color: #24292f; margin: 0; }
                .perm-fdesc { font-size: 12px; color: #57606a; margin-top: 4px; }

                /* Toggle Switch */
                .perm-toggle { position: relative; display: inline-block; width: 40px; height: 22px; }
                .perm-toggle input { opacity: 0; width: 0; height: 0; }
                .perm-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #d1d8dd; transition: .3s; border-radius: 22px; }
                .perm-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                .perm-toggle input:checked + .perm-slider { background-color: #2f9d58; }
                .perm-toggle input:checked + .perm-slider:before { transform: translateX(18px); }
                .perm-toggle input:disabled + .perm-slider { opacity: 0.6; cursor: not-allowed; }
            </style>

            <div id="perm-root" v-scope @vue:mounted="init()"> 
                <div class="perm-layout"> 
                    
                    <!-- Left Sidebar (Employee List) -->
                    <div class="perm-main perm-pane"> 
                        <div class="perm-pane-content"> 
                            <div class="perm-header"> 
                                <h3>Eligible Employees</h3> 
                            </div> 
                            
                            <div class="perm-search"> 
                                <svg class="perm-search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                <input type="text" placeholder="Search by name or ID..." v-model="searchQuery" @input="filterList"> 
                            </div> 

                            <div class="perm-list" v-if="filteredList.length"> 
                                <div v-for="emp in filteredList" :key="emp.name" 
                                     class="perm-card" 
                                     :class="{ active: selectedEmp && selectedEmp.name === emp.name }"
                                     @click="selectEmployee(emp)"> 
                                    
                                    <div class="perm-card-top">
                                        <div class="perm-card-name" v-html="highlight(emp.employee_name, searchQuery)"></div>
                                        
										<span class="perm-tag-badge">[[ getShortTag(emp.designation) ]]</span>
                                    </div>
                                    <div class="perm-card-email" v-html="highlight(emp.user_id, searchQuery)"></div>
                                </div> 
                            </div> 
                            <div class="perm-empty" style="padding: 32px; text-align: center; color: #57606a; border: 1px dashed #d0d7de; border-radius: 6px;" v-else>
                                No eligible employees found.
                            </div>
                        </div> 
                    </div> 

                    <!-- Right Main Content (Settings) -->
                    <div class="perm-sidebar perm-pane"> 
                        <div class="perm-pane-header">
                            <div v-if="!selectedEmp">
                                <h3>Access Configuration</h3>
                            </div>
                            <div v-else style="display: flex; flex-direction: column; gap: 4px;">
                                <h3 style="margin: 0;">Access Configuration</h3>
                                <div style="font-size: 13px; color: #57606a; display: flex; align-items: center; gap: 12px;">
                                    <span><strong>Employee:</strong> [[ selectedEmp.employee_name ]]</span>
                                    <span style="color: #d0d7de;">|</span>
                                    <span><strong>User ID:</strong> [[ selectedEmp.user_id ]]</span>
                                </div>
                            </div>
                        </div>

                        <div class="perm-pane-content"> 
                            <!-- State 1: No Selection -->
                            <div v-if="!selectedEmp" class="perm-sidebar-empty">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                <div style="font-size: 14px; font-weight: 500;">No Employee Selected</div>
                                <div style="font-size: 13px; margin-top: 8px;">Select an employee from the list to manage their roles</div>
                            </div>

                            <!-- State 2: Selected -->
                            <div v-else>
                                <div class="perm-section">
                                    <div class="perm-field">
                                        <div>
                                            <p class="perm-flabel">Branch User Access</p>
                                            <p class="perm-fdesc">Enable this to grant Branch User role permissions to this employee's linked account.</p>
                                        </div>
                                        <div>
                                            <label class="perm-toggle" title="Enable/Disable Branch User">
                                                <input type="checkbox" v-model="hasBranchUserRole" :disabled="isUpdating" @change="toggleRole">
                                                <span class="perm-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div> 
                    </div> 
                </div> 
            </div> 
        `); 
 
        PetiteVue.createApp({ 
            $delimiters: ['[[', ']]'], 
            empList: [],
            filteredList: [],
            searchQuery: "",
            selectedEmp: null,
            hasBranchUserRole: false,
            isUpdating: false,
 
            init() { 
                this.loadEmployees();
            }, 

            loadEmployees() {
                frappe.call({
                    // method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.get_eligible_employees",
					method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.get_eligible_employees",

                    callback: (r) => {
                        this.empList = r.message || [];
                        this.filteredList = [...this.empList];
                    }
                });
            },

            filterList() {
                const q = this.searchQuery.toLowerCase();
                if (!q) {
                    this.filteredList = [...this.empList];
                } else {
                    this.filteredList = this.empList.filter(
                        (p) =>
                            (p.employee_name && p.employee_name.toLowerCase().includes(q)) ||
                            (p.user_id && p.user_id.toLowerCase().includes(q))
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

            selectEmployee(emp) {
                this.selectedEmp = emp;
                this.checkRoleStatus(emp.user_id);
            },

			getShortTag(designation) {
                if (designation === "Branch Manager") return "BM";
                if (designation === "Branch Operation Manager") return "BOM";
                return designation;
            },


            checkRoleStatus(user_id) {
                this.isUpdating = true;
                frappe.call({
                    // method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.get_employee_role_status",
					method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.get_employee_role_status",

                    args: { user_id: user_id },
                    callback: (r) => {
                        this.hasBranchUserRole = r.message || false;
                        this.isUpdating = false;
                    }
                });
            },

            toggleRole() {
                if (!this.selectedEmp || !this.selectedEmp.user_id) return;
                
                this.isUpdating = true;
                frappe.call({
                    // method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.toggle_branch_user_role",
					method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.toggle_branch_user_role",

                    args: { 
                        user_id: this.selectedEmp.user_id,
                        enable: this.hasBranchUserRole
                    },
                    callback: (r) => {
                        this.isUpdating = false;
                        if(r.message) {
                            frappe.show_alert({ 
                                message: `Branch User role ${r.message.status} successfully`, 
                                indicator: r.message.status === 'added' ? 'green' : 'orange' 
                            }, 3);
                        }
                    },
                    error: (r) => {
                        this.isUpdating = false;
                        // Revert the toggle on error
                        this.hasBranchUserRole = !this.hasBranchUserRole;
                    }
                });
            }
        }).mount('#perm-root'); 
    }); 
}; 
