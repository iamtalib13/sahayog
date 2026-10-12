frappe.pages['petty-cash-access-ma'].on_page_load = function (wrapper) {
    const authorized_roles = ["Administrator", "HO Petty Cash Manager", "HO Petty Cash Verifier"];
    const user_roles = frappe.user_roles;

    const is_authorized = authorized_roles.some(role => user_roles.includes(role));

    if (!is_authorized) {
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
        return;
    }

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
                    color: #1f2328;
                    background:
                        radial-gradient(circle at top left, rgba(9, 105, 218, 0.06), transparent 45%),
                        radial-gradient(circle at bottom right, rgba(31, 136, 91, 0.05), transparent 45%),
                        #f5f7fa;
                    padding: 16px;
                    border-radius: 10px;
                }

                #perm-root ::-webkit-scrollbar { width: 7px; height: 7px; }
                #perm-root ::-webkit-scrollbar-track { background: transparent; }
                #perm-root ::-webkit-scrollbar-thumb {
                    background: #c7ced6;
                    border-radius: 20px;
                }
                #perm-root ::-webkit-scrollbar-thumb:hover { background: #a8b2bd; }

                .perm-layout {
                    display: flex;
                    height: 100%;
                    border: 1px solid #d8dee4;
                    border-radius: 12px;
                    background: #ffffff;
                    box-shadow:
                        0 1px 2px rgba(16, 24, 40, 0.04),
                        0 12px 32px rgba(16, 24, 40, 0.06);
                    overflow: hidden;
                }

                .perm-pane {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }

                .perm-main {
                    width: 32%;
                    min-width: 320px;
                    border-right: 1px solid #e4e8ec;
                    background: #ffffff;
                }

                .perm-sidebar {
                    width: 68%;
                    background: #fafbfc;
                    position: relative;
                }

                .perm-pane-header {
                    padding: 18px 22px;
                    border-bottom: 1px solid #e4e8ec;
                    flex-shrink: 0;
                    background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
                }

                .perm-pane-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 700;
                    color: #101828;
                    letter-spacing: -0.2px;
                }

                .perm-pane-content {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 24px;
                }

                .perm-search {
                    position: relative;
                    width: 100%;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e4e8ec;
                    background: #ffffff;
                }

                .perm-search input,
                .employee-picker input {
                    width: 100%;
                    padding: 10px 12px 10px 38px;
                    border: 1px solid #d8dee4;
                    border-radius: 8px;
                    font-size: 14px;
                    background-color: #f8fafc;
                    color: #1f2328;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
                }

                .perm-search input:focus,
                .employee-picker input:focus {
                    outline: none;
                    border-color: #0969da;
                    background-color: #ffffff;
                    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.12);
                }

                .perm-search-icon,
                .picker-icon {
                    position: absolute;
                    left: 31px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #667085;
                    pointer-events: none;
                }

                .picker-icon { left: 12px; }

                .perm-list {
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                    height: calc(100% - 73px);
                }

                .perm-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px 20px;
                    border-bottom: 1px solid #f1f4f7;
                    cursor: pointer;
                    transition: background 0.15s ease, border-color 0.15s ease;
                    position: relative;
                }

                .perm-card:hover { background: #f8fafc; }

                .perm-card.active {
                    background: #f0f6ff;
                    border-left: 3px solid #0969da;
                    padding-left: 17px;
                }

                .perm-card.active::after {
                    content: "";
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: #0969da;
                    opacity: 0.08;
                }

                .branch-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #0969da, #218bff);
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 700;
                    flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(9, 105, 218, 0.22);
                }

                .perm-card-info {
                    flex: 1;
                    min-width: 0;
                }

                .perm-card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3px;
                    gap: 10px;
                }

                .perm-card-name {
                    font-size: 14px;
                    font-weight: 650;
                    color: #101828;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .perm-card-email {
                    font-size: 12px;
                    color: #667085;
                }

                .access-count {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 30px;
                    height: 24px;
                    padding: 0 9px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #05603a;
                    background: #dcfce7;
                    border: 1px solid #bbf7d0;
                    border-radius: 20px;
                    white-space: nowrap;
                }

                .perm-empty {
                    padding: 48px 24px;
                    text-align: center;
                    color: #667085;
                    font-size: 14px;
                }

                .perm-sidebar-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    padding: 64px 32px;
                    text-align: center;
                    color: #667085;
                }

                .perm-sidebar-empty svg {
                    width: 52px;
                    height: 52px;
                    margin-bottom: 18px;
                    color: #cbd5e1;
                }

                .profile-header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                }

                .profile-header {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }

                .profile-avatar {
                    width: 52px;
                    height: 52px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #0969da, #218bff);
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: 700;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(9, 105, 218, 0.22);
                }

                .profile-details h3 {
                    margin: 0 0 7px 0;
                    font-size: 19px;
                    font-weight: 700;
                    color: #101828;
                    letter-spacing: -0.2px;
                }

               .profile-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    color: #57606a;
}

.meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    line-height: 1;
    white-space: nowrap;
}

.meta-icon {
    flex-shrink: 0;
    display: block;
    color: #8c959f;
}

.meta-item span {
    display: inline-flex;
    align-items: center;
}

                .perm-section {
                    margin-top: 24px;
                    background: #ffffff;
                    border: 1px solid #e4e8ec;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
                }

                .perm-field {
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                }

                .perm-flabel {
                    font-size: 15px;
                    font-weight: 650;
                    color: #101828;
                    margin: 0 0 4px 0;
                }

                .perm-fdesc {
                    font-size: 13px;
                    color: #667085;
                    margin: 0;
                    max-width: 80%;
                    line-height: 1.45;
                }

                .perm-toggle {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 25px;
                    flex-shrink: 0;
                }

                .perm-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .perm-slider {
                    position: absolute;
                    cursor: pointer;
                    inset: 0;
                    background-color: #d8dee4;
                    transition: background 0.2s ease;
                    border-radius: 30px;
                }

                .perm-slider:before {
                    position: absolute;
                    content: "";
                    height: 19px;
                    width: 19px;
                    left: 3px;
                    bottom: 3px;
                    background-color: #ffffff;
                    transition: transform 0.2s ease;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(16, 24, 40, 0.18);
                }

                .perm-toggle input:checked + .perm-slider {
                    background: linear-gradient(135deg, #16a34a, #22c55e);
                }

                .perm-toggle input:checked + .perm-slider:before {
                    transform: translateX(21px);
                }

                .perm-toggle.is-updating {
                    opacity: 0.55;
                    pointer-events: none;
                }

                .employee-picker {
                    position: relative;
                    margin-bottom: 24px;
                }

                .picker-dropdown {
                    position: absolute;
                    top: calc(100% + 7px);
                    left: 0;
                    right: 0;
                    background: #ffffff;
                    border: 1px solid #e4e8ec;
                    border-radius: 10px;
                    box-shadow: 0 16px 40px rgba(16, 24, 40, 0.12);
                    max-height: 290px;
                    overflow-y: auto;
                    z-index: 30;
                }

                .picker-item {
                    padding: 13px 15px;
                    cursor: pointer;
                    border-bottom: 1px solid #f1f4f7;
                    transition: background 0.12s ease;
                }

                .picker-item:hover { background: #f8fafc; }
                .picker-item:last-child { border-bottom: 0; }

                .picker-name {
                    font-size: 14px;
                    font-weight: 650;
                    color: #101828;
                }

                .picker-meta {
                    font-size: 12px;
                    color: #667085;
                    margin-top: 3px;
                }

                .assigned-employee {
                    border: 1px solid #e4e8ec;
                    background: #ffffff;
                    border-radius: 10px;
                    padding: 16px 18px;
                    margin-bottom: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 18px;
                    transition: box-shadow 0.15s ease, border-color 0.15s ease;
                }

                .assigned-employee:hover {
                    border-color: #c7d7ea;
                    box-shadow: 0 4px 14px rgba(16, 24, 40, 0.06);
                }

                .assigned-employee-info { min-width: 0; }

                .assigned-name {
                    font-size: 15px;
                    font-weight: 650;
                    color: #101828;
                }

                .assigned-meta {
                    font-size: 13px;
                    color: #667085;
                    margin-top: 4px;
                }

                .loading-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(250, 251, 252, 0.72);
                    backdrop-filter: blur(2px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 20;
                    font-weight: 600;
                    color: #0969da;
                }

                .search-highlight {
                    background: #fff2ac;
                    padding: 0;
                    border-radius: 3px;
                }
            </style>

            <div id="perm-root" v-scope @vue:mounted="init()">
                <div class="perm-layout">

                    <div class="perm-main perm-pane">
                        <div class="perm-pane-header">
                            <h3>Branch Access</h3>
                        </div>

                        <div class="perm-search">
                            <svg class="perm-search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input type="text" placeholder="Search branch..." v-model="branchSearch" @input="filterBranches">
                        </div>

                        <div class="perm-list" v-if="filteredBranches.length">
                            <div v-for="branch in filteredBranches" :key="branch.branch_id"
                                 class="perm-card"
                                 :class="{ active: selectedBranch && selectedBranch.branch_id === branch.branch_id }"
                                 @click="selectBranch(branch)">

                                <div class="branch-avatar">[[ getBranchInitials(branch.branch_name) ]]</div>

                                <div class="perm-card-info">
                                    <div class="perm-card-top">
                                        <div class="perm-card-name" v-html="highlight(branch.branch_name, branchSearch)"></div>
                                        <span class="access-count">
    [[ branch.employees.filter(emp => emp.has_branch_user_role).length ]]
</span>
                                    </div>
                                    <div class="perm-card-email">Branch ID: [[ branch.branch_id ]]</div>
                                </div>
                            </div>
                        </div>

                        <div class="perm-empty" v-else-if="!isLoading">
                            No branches with Petty Cash access found.
                        </div>

                        <div class="perm-empty" v-if="isLoading">Loading branches...</div>
                    </div>

                    <div class="perm-sidebar perm-pane">
                        <div v-if="!selectedBranch" class="perm-sidebar-empty">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            </svg>
                            <div style="font-size: 16px; font-weight: 600; color: #1f2328;">Branch Access Configuration</div>
                            <div style="font-size: 14px; margin-top: 8px; max-width: 280px;">
                                Select a branch from the left panel to manage its Petty Cash user access.
                            </div>
                        </div>

                        <div v-else style="display: flex; flex-direction: column; height: 100%;">
                            <div class="perm-pane-header profile-header-container">
                                <div class="profile-header">
                                    <div class="profile-avatar">[[ getBranchInitials(selectedBranch.branch_name) ]]</div>
                                    <div class="profile-details">
                                        <h3>[[ selectedBranch.branch_name ]]</h3>
                                        <div class="profile-meta">
    <div class="meta-item">
        <svg class="meta-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 10.5 12 3l9 7.5"></path>
            <path d="M5 9.5V21h14V9.5"></path>
            <path d="M9 21v-6h6v6"></path>
        </svg>
        <span>Branch ID: [[ selectedBranch.branch_id ]]</span>
    </div>

    <div class="meta-item">
        <svg class="meta-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="8" r="3.2"></circle>
            <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"></path>
            <path d="M16.5 11.2a3 3 0 1 0-1.8-5.4"></path>
            <path d="M17.5 14.5a5.5 5.5 0 0 1 3.7 5.5"></path>
        </svg>
        <span>[[ selectedBranch.employees.filter(emp => emp.has_branch_user_role).length ]] Active User(s)</span>
    </div>
</div>
                                    </div>
                                </div>
                            </div>

                            <div class="perm-pane-content" style="position: relative;">
                                <div v-if="isUpdating" class="loading-overlay">Updating Access...</div>

                                <h4 style="margin: 0 0 16px 0; font-size: 14px; color: #57606a; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Add Employee Access
                                </h4>

                                <div class="employee-picker">
                                    <svg class="picker-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                    <input type="text"
                                           placeholder="Search employee by name, ID or user ID..."
                                           v-model="employeeSearch"
                                           @input="searchEmployees"
                                           @focus="showPicker = true">

                                    <div class="picker-dropdown" v-if="showPicker && employeeResults.length">
                                        <div v-for="emp in employeeResults" :key="emp.name" class="picker-item" @click="selectEmployee(emp)">
                                            <div class="picker-name">[[ emp.employee_name ]]</div>
                                            <div class="picker-meta">
                                                [[ emp.user_id.slice(0, 4) ]] • [[ emp.designation ]]
                                                <span v-if="emp.petty_cash_branch"> • Current Branch: [[ emp.branch_name ]]</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="picker-dropdown" v-else-if="showPicker && employeeSearch && !isSearching">
                                        <div class="picker-item">
                                            <div class="picker-meta">No eligible employee found.</div>
                                        </div>
                                    </div>
                                </div>

                                <h4 style="margin: 0 0 16px 0; font-size: 14px; color: #57606a; text-transform: uppercase; letter-spacing: 0.5px;">
                                    User Access List
                                </h4>

                                <div v-if="selectedBranch.employees.length">
                                    <div v-for="emp in selectedBranch.employees" :key="emp.name" class="assigned-employee">
                                        <div class="assigned-employee-info">
                                            <div class="assigned-name">[[ emp.employee_name ]]</div>
                                            <div class="assigned-meta">
                                                [[ emp.user_id.slice(0, 4) ]] • [[ emp.designation ]]
                                            </div>
                                        </div>

                                        <label class="perm-toggle" :class="{ 'is-updating': isUpdating }" title="Toggle Petty Cash Access">
                                            <input type="checkbox"
                                                   v-model="emp.has_branch_user_role"
                                                   @change="toggleRole(emp)">
                                            <span class="perm-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div class="perm-empty" v-else>
                                    No employee is currently assigned to this branch.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        PetiteVue.createApp({
            $delimiters: ['[[', ']]'],

            branchList: [],
            filteredBranches: [],
            branchSearch: "",
            selectedBranch: null,

            employeeSearch: "",
            employeeResults: [],
            showPicker: false,
            isSearching: false,

            isUpdating: false,
            isLoading: true,

            init() {
                this.loadBranches();

                $(document).on("click", (e) => {
                    if (!$(e.target).closest(".employee-picker").length) {
                        this.showPicker = false;
                    }
                });
            },

            getBranchInitials(name) {
                if (!name) return "B";
                const parts = name.trim().split(" ");
                if (parts.length > 1) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                }
                return parts[0].substring(0, 2).toUpperCase();
            },

            loadBranches() {
                this.isLoading = true;

                frappe.call({
                    method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.get_branch_access_data",
                    callback: (r) => {
                        this.branchList = r.message || [];
                        this.filterBranches();
                        this.isLoading = false;
                    }
                });
            },

            filterBranches() {
                const q = this.branchSearch.toLowerCase().trim();

                if (!q) {
                    this.filteredBranches = [...this.branchList];
                } else {
                    this.filteredBranches = this.branchList.filter(branch =>
                        branch.branch_name.toLowerCase().includes(q) ||
                        branch.branch_id.toLowerCase().includes(q)
                    );
                }
            },

            selectBranch(branch) {
                this.selectedBranch = branch;
                this.employeeSearch = "";
                this.employeeResults = [];
                this.showPicker = false;
            },

            searchEmployees() {
                clearTimeout(this.searchTimeout);
                this.isSearching = true;
                this.showPicker = true;

                this.searchTimeout = setTimeout(() => {
                    frappe.call({
                        method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.search_eligible_employees",
                        args: {
                            search_text: this.employeeSearch
                        },
                        callback: (r) => {
                            this.employeeResults = r.message || [];
                            this.isSearching = false;
                        }
                    });
                }, 300);
            },

            // selectEmployee(emp) {
            //     this.showPicker = false;
            //     this.employeeSearch = "";

            //     const already_added = this.selectedBranch.employees.some(
            //         row => row.name === emp.name
            //     );

            //     if (already_added) {
            //         frappe.show_alert({
            //             message: `${emp.employee_name} is already shown in this branch.`,
            //             indicator: "blue"
            //         }, 3);
            //         return;
            //     }

            //     this.selectedBranch.employees.push({
            //         name: emp.name,
            //         employee_name: emp.employee_name,
            //         designation: emp.designation,
            //         user_id: emp.user_id,
            //         petty_cash_branch: emp.petty_cash_branch || "",
            //         has_branch_user_role: emp.has_branch_user_role || false
            //     });
            // },

            selectEmployee(emp) {
                this.showPicker = false;
                this.employeeSearch = "";

                const already_added = this.selectedBranch.employees.some(
                    row => row.name === emp.name
                );

                if (already_added) {
                    frappe.show_alert({
                        message: `${emp.employee_name} is already shown in this branch.`,
                        indicator: "blue"
                    }, 3);
                    return;
                }

                const current_branch_id = emp.petty_cash_branch || "";
                const selected_branch_id = this.selectedBranch.branch_id;

                const existing_access_employee = this.selectedBranch.employees.find(
                    row => row.has_branch_user_role
                );

                const employee_has_other_branch =
                    current_branch_id && current_branch_id !== selected_branch_id;

                if (employee_has_other_branch && existing_access_employee) {
                    const current_branch_name = emp.branch_name || current_branch_id;
                    const target_branch_name = this.selectedBranch.branch_name;
                    const target_branch_id = this.selectedBranch.branch_id;
                    const old_branch_employee_name = existing_access_employee.employee_name;
                    const new_employee_name = emp.employee_name;

                    frappe.confirm(
                        `
                <strong>${new_employee_name} (${emp.user_id.slice(0, 4)})</strong> already has Petty Cash access for
                <strong>${current_branch_name} (${current_branch_id})</strong>.<br><br>
                <strong>${target_branch_name}  (${target_branch_id})</strong> already has Petty Cash access assigned to
                <strong>${old_branch_employee_name}  (${existing_access_employee.user_id.slice(0, 4)})</strong>.<br><br>
                Do you want to remove <strong>${old_branch_employee_name} (${existing_access_employee.user_id.slice(0, 4)})</strong> access from
                <strong>${target_branch_name} (${target_branch_id})</strong> and assign
                <strong>${new_employee_name} (${emp.user_id.slice(0, 4)})</strong> to <strong>${target_branch_name} (${target_branch_id})</strong>?<br><br>
                <strong>${new_employee_name} (${emp.user_id.slice(0, 4)})</strong> existing Petty Cash role will remain unchanged.
                Only their Petty Cash Branch will be changed.
            `,
                        () => {
                            this.reassignAndReplaceBranchEmployee(emp, existing_access_employee);
                        },
                        () => {
                            frappe.show_alert({
                                message: "No changes were made.",
                                indicator: "orange"
                            }, 3);
                        },
                        "Yes, Change and Replace",
                        "No"
                    );

                    return;
                }

                if (employee_has_other_branch) {
                    const current_branch_name = emp.branch_name || current_branch_id;
                    const new_branch_name = this.selectedBranch.branch_name;

                    frappe.confirm(
                        `
                <strong>${emp.employee_name} (${emp.user_id.slice(0, 4)})</strong> already has Petty Cash access for
                <strong>${current_branch_name} (${current_branch_id})</strong>.<br><br>
                Do you want to change their branch to
                <strong>${new_branch_name} (${selected_branch_id})</strong>?<br><br>
                Their existing Petty Cash role will remain unchanged.
                Only the Petty Cash Branch will be updated.
            `,
                        () => {
                            this.reassignEmployeeBranch(emp);
                        },
                        () => {
                            frappe.show_alert({
                                message: "No changes were made.",
                                indicator: "orange"
                            }, 3);
                        },
                        "Yes, Change Branch",
                        "No"
                    );

                    return;
                }

                if (existing_access_employee) {
                    const old_employee_name = existing_access_employee.employee_name;
                    const new_employee_name = emp.employee_name;
                    const branch_name = this.selectedBranch.branch_name;

                    frappe.confirm(
                        `
                <strong>${branch_name} (${selected_branch_id})</strong> already has Petty Cash access assigned to
                <strong>${old_employee_name} (${existing_access_employee.user_id.slice(0, 4)})</strong>.<br><br>
                Do you want to remove <strong>${old_employee_name} (${existing_access_employee.user_id.slice(0, 4)})</strong> access and assign
                this branch to <strong>${new_employee_name} (${emp.user_id.slice(0, 4)})</strong>?<br><br>
                The existing employee's Petty Cash Branch and Petty Cash role will be removed.
            `,
                        () => {
                            this.replaceBranchEmployee(emp, existing_access_employee);
                        },
                        () => {
                            frappe.show_alert({
                                message: "No changes were made.",
                                indicator: "orange"
                            }, 3);
                        },
                        "Yes, Replace Access",
                        "No"
                    );

                    return;
                }

                this.selectedBranch.employees.push({
                    name: emp.name,
                    employee_name: emp.employee_name,
                    designation: emp.designation,
                    user_id: emp.user_id,
                    petty_cash_branch: emp.petty_cash_branch || "",
                    has_branch_user_role: emp.has_branch_user_role || false
                });
            },

            reassignAndReplaceBranchEmployee(newEmp, oldEmp) {
                this.isUpdating = true;

                frappe.call({
                    method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.reassign_and_replace_branch_employee",
                    args: {
                        user_id: newEmp.user_id,
                        branch_id: this.selectedBranch.branch_id
                    },
                    callback: (r) => {
                        this.isUpdating = false;

                        if (r.message) {
                            this.selectedBranch.employees = this.selectedBranch.employees.filter(
                                row => row.name !== oldEmp.name
                            );

                            this.selectedBranch.employees.push({
                                name: newEmp.name,
                                employee_name: newEmp.employee_name,
                                designation: newEmp.designation,
                                user_id: newEmp.user_id,
                                petty_cash_branch: r.message.new_branch_id,
                                has_branch_user_role: newEmp.has_branch_user_role || false
                            });

                            frappe.show_alert({
                                message: `${oldEmp.employee_name}'s access was removed. ${newEmp.employee_name} moved from ${r.message.old_branch_name} to ${r.message.new_branch_name}.`,
                                indicator: "green"
                            }, 4);
                        }

                        this.loadBranches();
                    },
                    error: () => {
                        this.isUpdating = false;
                    }
                });
            },

            replaceBranchEmployee(newEmp, oldEmp) {
                this.isUpdating = true;

                frappe.call({
                    method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.replace_branch_employee",
                    args: {
                        user_id: newEmp.user_id,
                        branch_id: this.selectedBranch.branch_id
                    },
                    callback: (r) => {
                        this.isUpdating = false;

                        if (r.message) {
                            this.selectedBranch.employees = this.selectedBranch.employees.filter(
                                row => row.name !== oldEmp.name
                            );

                            this.selectedBranch.employees.push({
                                name: newEmp.name,
                                employee_name: newEmp.employee_name,
                                designation: newEmp.designation,
                                user_id: newEmp.user_id,
                                petty_cash_branch: r.message.branch_id,
                                has_branch_user_role: true
                            });

                            frappe.show_alert({
                                message: `${oldEmp.employee_name}'s access was removed. ${newEmp.employee_name} is now assigned to ${r.message.branch_name}.`,
                                indicator: "green"
                            }, 4);
                        }

                        this.loadBranches();
                    },
                    error: () => {
                        this.isUpdating = false;
                    }
                });
            },

            reassignEmployeeBranch(emp) {
                this.isUpdating = true;

                frappe.call({
                    method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.reassign_employee_branch",
                    args: {
                        user_id: emp.user_id,
                        branch_id: this.selectedBranch.branch_id
                    },
                    callback: (r) => {
                        this.isUpdating = false;

                        if (r.message) {
                            emp.petty_cash_branch = r.message.new_branch_id;
                            emp.branch_name = r.message.new_branch_name;

                            this.selectedBranch.employees.push({
                                name: emp.name,
                                employee_name: emp.employee_name,
                                designation: emp.designation,
                                user_id: emp.user_id,
                                petty_cash_branch: r.message.new_branch_id,
                                has_branch_user_role: emp.has_branch_user_role || false
                            });

                            frappe.show_alert({
                                message: `${emp.employee_name} moved from ${r.message.old_branch_name} to ${r.message.new_branch_name}.`,
                                indicator: "green"
                            }, 4);
                        }

                        this.loadBranches();
                    },
                    error: () => {
                        this.isUpdating = false;
                    }
                });
            },

            toggleRole(emp) {
                const enable = emp.has_branch_user_role;

                if (enable && !this.selectedBranch) {
                    emp.has_branch_user_role = false;
                    return;
                }

                this.isUpdating = true;

                frappe.call({
                    method: "sahayog.petty_cash_management.page.petty_cash_access_ma.petty_cash_access_ma.toggle_branch_user_role",
                    args: {
                        user_id: emp.user_id,
                        enable: enable,
                        branch_id: enable ? this.selectedBranch.branch_id : ""
                    },
                    callback: (r) => {
                        this.isUpdating = false;

                        if (r.message) {
                            const status = r.message.status;

                            const messageMap = {
                                added: "Petty Cash access added successfully",
                                removed: "Petty Cash access removed successfully",
                                already_present: "Petty Cash role is already assigned",
                                already_absent: "Petty Cash role is already removed"
                            };

                            const indicatorMap = {
                                added: "green",
                                removed: "orange",
                                already_present: "blue",
                                already_absent: "blue"
                            };

                            frappe.show_alert({
                                message: messageMap[status] || "Access updated successfully",
                                indicator: indicatorMap[status] || "green"
                            }, 3);
                        }

                        if (!enable) {
                            this.removeEmployeeFromBranch(emp);
                        }

                        this.loadBranches();
                    },
                    error: () => {
                        this.isUpdating = false;
                        emp.has_branch_user_role = !emp.has_branch_user_role;
                    }
                });
            },

            removeEmployeeFromBranch(emp) {
                this.selectedBranch.employees = this.selectedBranch.employees.filter(
                    row => row.name !== emp.name
                );

                if (!this.selectedBranch.employees.length) {
                    this.branchList = this.branchList.filter(
                        branch => branch.branch_id !== this.selectedBranch.branch_id
                    );
                    this.filterBranches();
                    this.selectedBranch = null;
                }
            },

            highlight(text, q) {
                if (!q || !text) return text;

                const searchVal = q.trim();
                if (!searchVal) return text;

                const regex = new RegExp(`(${searchVal})`, "gi");
                return text.replace(regex, '<mark class="search-highlight">$1</mark>');
            }
        }).mount('#perm-root');
    });
};