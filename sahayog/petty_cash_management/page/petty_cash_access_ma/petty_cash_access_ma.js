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
                * { box-sizing: border-box; }
                #perm-root { 
                  height: calc(100vh - 110px); 
                  overflow: hidden; 
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                  color: #24292f;
                  background: #f4f5f6;
                  padding: 16px;
				  border-radius: 8px;
                }
                
                /* --- Custom Scrollbar for all lists and panes --- */
                #perm-root ::-webkit-scrollbar { width: 6px; height: 6px; }
                #perm-root ::-webkit-scrollbar-track { background: transparent; }
                #perm-root ::-webkit-scrollbar-thumb { background: #d0d7de; border-radius: 10px; }
                #perm-root ::-webkit-scrollbar-thumb:hover { background: #aeb6c0; }

                .perm-layout { 
                  display: flex; height: 100%; border: 1px solid #d0d7de; border-radius: 8px;
                  background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden;
                }
                
                /* Layout Panes */
                .perm-pane { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
                .perm-main { width: 35%; border-right: 1px solid #d0d7de; background: #ffffff; }
                .perm-sidebar { width: 65%; background: #fafbfc; position: relative; }

                /* Headers */
                .perm-pane-header { padding: 16px 20px; border-bottom: 1px solid #d0d7de; flex-shrink: 0; background: #ffffff; }
                .perm-pane-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #1f2328; }
                .perm-pane-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px; }

                /* Search Bar */
                .perm-search { position: relative; width: 100%; padding: 16px 20px; border-bottom: 1px solid #d0d7de; background: #ffffff; }
                .perm-search input { 
                  width: 100%; padding: 8px 12px 8px 36px; border: 1px solid #d0d7de; border-radius: 6px; 
                  font-size: 14px; background-color: #f6f8fa; color: #24292f; transition: all 0.2s;
                }
                .perm-search input:focus { outline: none; border-color: #0969da; box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.3); background-color: #ffffff; }
                .perm-search-icon { position: absolute; left: 30px; top: 50%; transform: translateY(-50%); color: #57606a; }
                
                /* List & Cards */
                .perm-list { display: flex; flex-direction: column; overflow-y: auto; height: calc(100% - 70px); }
                .perm-card { 
                  display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #f0f3f6; 
                  cursor: pointer; transition: all 0.15s ease; 
                }
                .perm-card:hover { background: #f6f8fa; }
                .perm-card.active { background: #eef3f8; border-left: 3px solid #0969da; padding-left: 17px; }
                
                /* Avatar */
                .perm-avatar { 
                    width: 36px; height: 36px; border-radius: 50%; background: #e1e4e8; color: #24292f;
                    display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0;
                }

                /* Card Typography */
                .perm-card-info { flex: 1; min-width: 0; }
                .perm-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
                .perm-card-name { font-size: 14px; font-weight: 600; color: #1f2328; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .perm-card-email { font-size: 12px; color: #57606a; }
                
                /* Colorful Tags - Perfectly Centered Text & Increased Size */
                .perm-tag-badge { 
                    display: inline-flex; align-items: center; justify-content: center;
                    font-size: 13px; font-weight: 600; padding: 0 12px; height: 26px; 
                    line-height: 1; border-radius: 13px; 
                }
                .tag-bm { background: #e8fdf0; color: #2f9d58; border: 1px solid #A6EFC0; }
                .tag-bom { background: #e7f5ff; color: #007be0; border: 1px solid #A7D7FD; }
                
                .search-highlight { background: #fff2ac; padding: 0; border-radius: 2px; }

                /* Empty States */
                .perm-empty { padding: 40px 20px; text-align: center; color: #57606a; font-size: 14px; }
                .perm-sidebar-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 64px 32px; text-align: center; color: #57606a; }
                .perm-sidebar-empty svg { width: 48px; height: 48px; margin-bottom: 16px; color: #d0d7de; }

                /* Profile Header in Right Sidebar */
                .profile-header-container { display: flex; justify-content: space-between; align-items: flex-start; }
                .profile-header { display: flex; gap: 16px; align-items: center; }
                .profile-avatar { width: 48px; height: 48px; border-radius: 8px; background: #0969da; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; flex-shrink: 0; }
                .profile-details h3 { margin: 0 0 6px 0; font-size: 18px; color: #1f2328; }
                .profile-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #57606a; }
                .meta-item { display: flex; align-items: center; gap: 4px; }
                .meta-item svg { color: #8c959f; }

                /* Settings Card */
                .perm-section { margin-top: 24px; background: #ffffff; border: 1px solid #d0d7de; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
                .perm-field { padding: 20px; display: flex; justify-content: space-between; align-items: center; }
                .perm-flabel { font-size: 15px; font-weight: 600; color: #24292f; margin: 0 0 4px 0; }
                .perm-fdesc { font-size: 13px; color: #57606a; margin: 0; max-width: 80%; line-height: 1.4; }

                /* Toggle Switch */
                .perm-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0;}
                .perm-toggle input { opacity: 0; width: 0; height: 0; }
                .perm-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #d1d8dd; transition: .3s; border-radius: 24px; }
                .perm-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
                .perm-toggle input:checked + .perm-slider { background-color: #2f9d58; }
                .perm-toggle input:checked + .perm-slider:before { transform: translateX(20px); }
                .perm-toggle.is-updating { opacity: 0.5; pointer-events: none; }
                
                /* Loading Overlay */
                .loading-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(250,251,252,0.6); display: flex; align-items: center; justify-content: center; z-index: 10; font-weight: 500; color: #0969da; }
            </style>

            <div id="perm-root" v-scope @vue:mounted="init()"> 
                <div class="perm-layout"> 
                    
                    <!-- Left Sidebar (Employee List) -->
                    <div class="perm-main perm-pane"> 
                        <div class="perm-pane-header"> 
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
                                
                                <div class="perm-avatar">[[ getInitials(emp.employee_name) ]]</div>
                                
                                <div class="perm-card-info">
                                    <div class="perm-card-top">
                                        <div class="perm-card-name" v-html="highlight(emp.employee_name, searchQuery)"></div>
                                        <span class="perm-tag-badge" :class="getTagClass(emp.designation)">[[ getShortTag(emp.designation) ]]</span>
                                    </div>
                                    <div class="perm-card-email" v-html="highlight(emp.user_id, searchQuery)"></div>
                                </div>
                            </div> 
                        </div> 
                        <div class="perm-empty" v-else-if="!isLoading">
                            <div style="margin-bottom: 12px;">
                                <svg width="32" height="32" fill="none" stroke="#d0d7de" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            </div>
                            No eligible employees found.
                        </div>
                        <div class="perm-empty" v-if="isLoading">Loading employees...</div>
                    </div> 

                    <!-- Right Main Content (Settings) -->
                    <div class="perm-sidebar perm-pane"> 
                        
                        <!-- State 1: No Selection -->
                        <div v-if="!selectedEmp" class="perm-sidebar-empty">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                            <div style="font-size: 16px; font-weight: 600; color: #1f2328;">Access Configuration</div>
                            <div style="font-size: 14px; margin-top: 8px; max-width: 250px;">Select an employee from the left panel to manage their Petty Cash roles.</div>
                        </div>

                        <!-- State 2: Selected -->
                        <div v-else style="display: flex; flex-direction: column; height: 100%;">
                            <div class="perm-pane-header profile-header-container">
                                <div class="profile-header">
                                    <div class="profile-avatar">[[ getInitials(selectedEmp.employee_name) ]]</div>
                                    <div class="profile-details">
                                        <h3>[[ selectedEmp.employee_name ]]</h3>
                                        <div class="profile-meta">
                                            <div class="meta-item">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                [[ selectedEmp.user_id ]]
                                            </div>
                                            <div class="meta-item">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                                [[ selectedEmp.sahayog_branch || 'N/A' ]] - [[ selectedEmp.branch_name || 'N/A' ]]
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Right Corner Badge (now relies entirely on the global class) -->
                                <div style="margin-top: 4px;">
                                    <span class="perm-tag-badge" :class="getTagClass(selectedEmp.designation)">
                                        [[ getShortTag(selectedEmp.designation) ]]
                                    </span>
                                </div>
                            </div>

                            <div class="perm-pane-content" style="position: relative;"> 
                                <div v-if="isUpdating" class="loading-overlay">Updating Roles...</div>
                                
                                <h4 style="margin: 0 0 16px 0; font-size: 14px; color: #57606a; text-transform: uppercase; letter-spacing: 0.5px;">Role Management</h4>
                                
                                <div class="perm-section">
                                    <div class="perm-field">
                                        <div>
                                            <p class="perm-flabel">Branch User Access</p>
                                            <p class="perm-fdesc">Enable this to instantly grant or revoke the Branch User role permissions for this employee's linked account.</p>
                                        </div>
                                        <div>
                                            <label class="perm-toggle" :class="{'is-updating': isUpdating}" title="Toggle Branch User">
                                                <input type="checkbox" v-model="hasBranchUserRole" @change="toggleRole">
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
            isLoading: true,
 
            init() { 
                this.loadEmployees();
            }, 

            getInitials(name) {
                if (!name) return "?";
                const parts = name.trim().split(" ");
                if (parts.length > 1) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                }
                return parts[0].substring(0, 2).toUpperCase();
            },

            getShortTag(designation) {
                if (designation === "BRANCH MANAGER") return "BM";
                if (designation === "Branch Operation Manager") return "BOM";
                return designation;
            },

            getTagClass(designation) {
                if (designation === "BRANCH MANAGER") return "tag-bm";
                if (designation === "Branch Operation Manager") return "tag-bom";
                return "";
            },

            loadEmployees() {
                this.isLoading = true;
                frappe.call({
                    method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.get_eligible_employees",
                    callback: (r) => {
                        this.empList = r.message || [];
                        this.filteredList = [...this.empList];
                        this.isLoading = false;
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

            checkRoleStatus(user_id) {
                this.isUpdating = true;
                frappe.call({
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
                        this.hasBranchUserRole = !this.hasBranchUserRole;
                    }
                });
            }
        }).mount('#perm-root'); 
    }); 
}; 
