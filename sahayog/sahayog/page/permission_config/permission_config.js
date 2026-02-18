frappe.pages['permission-config'].on_page_load = function(wrapper) { 
    let page = frappe.ui.make_app_page({ 
        parent: wrapper, 
        title: 'Permission Configuration', 
        single_column: true 
    }); 
 
    frappe.require('/assets/sahayog/js/petite-vue.iife.js', () => { 
        page.main.html(` 
            <style>
                .permission-container {
                    display: flex;
                    min-height: calc(100vh - 100px);
                    background: #f5f7fa;
                }
                
                .sidebar {
                    width: 350px;
                    background: white;
                    border-right: 1px solid #e2e8f0;
                    padding: 24px;
                    overflow-y: auto;
                    flex-shrink: 0;
                }
                
                .main-content {
                    flex: 1;
                    padding: 24px;
                    overflow-y: auto;
                }
                
                .filter-section {
                    margin-bottom: 24px;
                }
                
                .filter-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .select-all {
                    font-size: 11px;
                    color: #3b82f6;
                    cursor: pointer;
                    font-weight: 500;
                    user-select: none;
                }
                
                .select-all:hover {
                    color: #2563eb;
                }
                
                .checkbox-group {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                
                .checkbox-item {
                    display: flex;
                    align-items: center;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 6px 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    user-select: none;
                }
                
                .checkbox-item:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                }
                
                .checkbox-item.selected {
                    background: #dbeafe;
                    border-color: #3b82f6;
                }
                
                .checkbox-item input[type="checkbox"] {
                    margin: 0 6px 0 0;
                    cursor: pointer;
                }
                
                .checkbox-item label {
                    font-size: 13px;
                    color: #374151;
                    cursor: pointer;
                    margin: 0;
                }
                
                .divider {
                    height: 1px;
                    background: #e2e8f0;
                    margin: 20px 0;
                }
                
                .filter-header {
                    font-size: 15px;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #e2e8f0;
                }
            </style>
            
            <div id="app" v-scope @vue:mounted="init()"> 
                <div class="permission-container">
                    <div class="sidebar">
                        <div class="filter-header">Filter Options</div>
                        
                        <!-- Zone Filter -->
                        <div class="filter-section">
                            <div class="filter-label">
                                Zone
                                <span class="select-all" @click="toggleAllZone()">
                                    [[ allZoneSelected ? 'Deselect All' : 'Select All' ]]
                                </span>
                            </div>
                            <div class="checkbox-group">
                                <div v-for="zone in zones" 
                                     :key="zone.value"
                                     class="checkbox-item"
                                     :class="{ selected: selectedZones.includes(zone.value) }"
                                     @click="toggleZone(zone.value)">
                                    <input type="checkbox" 
                                           :checked="selectedZones.includes(zone.value)"
                                           @click.stop="toggleZone(zone.value)">
                                    <label>[[ zone.label ]]</label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Region Filter -->
                        <div class="filter-section">
                            <div class="filter-label">
                                Region
                                <span class="select-all" @click="toggleAllRegion()">
                                    [[ allRegionSelected ? 'Deselect All' : 'Select All' ]]
                                </span>
                            </div>
                            <div class="checkbox-group">
                                <div v-for="region in regions" 
                                     :key="region.value"
                                     class="checkbox-item"
                                     :class="{ selected: selectedRegions.includes(region.value) }"
                                     @click="toggleRegion(region.value)">
                                    <input type="checkbox" 
                                           :checked="selectedRegions.includes(region.value)"
                                           @click.stop="toggleRegion(region.value)">
                                    <label>[[ region.label ]]</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <!-- State Filter -->
                        <div class="filter-section">
                            <div class="filter-label">
                                State
                                <span class="select-all" @click="toggleAllState()">
                                    [[ allStateSelected ? 'Deselect All' : 'Select All' ]]
                                </span>
                            </div>
                            <div class="checkbox-group">
                                <div v-for="state in states" 
                                     :key="state.value"
                                     class="checkbox-item"
                                     :class="{ selected: selectedStates.includes(state.value) }"
                                     @click="toggleState(state.value)">
                                    <input type="checkbox" 
                                           :checked="selectedStates.includes(state.value)"
                                           @click.stop="toggleState(state.value)">
                                    <label>[[ state.label ]]</label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- District Filter -->
                        <div class="filter-section">
                            <div class="filter-label">
                                District
                                <span class="select-all" @click="toggleAllDistrict()">
                                    [[ allDistrictSelected ? 'Deselect All' : 'Select All' ]]
                                </span>
                            </div>
                            <div class="checkbox-group">
                                <div v-for="district in districts" 
                                     :key="district.value"
                                     class="checkbox-item"
                                     :class="{ selected: selectedDistricts.includes(district.value) }"
                                     @click="toggleDistrict(district.value)">
                                    <input type="checkbox" 
                                           :checked="selectedDistricts.includes(district.value)"
                                           @click.stop="toggleDistrict(district.value)">
                                    <label>[[ district.label ]]</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <!-- Product Filter -->
                        <div class="filter-section">
                            <div class="filter-label">
                                Product
                                <span class="select-all" @click="toggleAllProduct()">
                                    [[ allProductSelected ? 'Deselect All' : 'Select All' ]]
                                </span>
                            </div>
                            <div class="checkbox-group">
                                <div v-for="product in products" 
                                     :key="product.value"
                                     class="checkbox-item"
                                     :class="{ selected: selectedProducts.includes(product.value) }"
                                     @click="toggleProduct(product.value)">
                                    <input type="checkbox" 
                                           :checked="selectedProducts.includes(product.value)"
                                           @click.stop="toggleProduct(product.value)">
                                    <label>[[ product.label ]]</label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Source Filter -->
                        <div class="filter-section">
                            <div class="filter-label">
                                Source
                                <span class="select-all" @click="toggleAllSource()">
                                    [[ allSourceSelected ? 'Deselect All' : 'Select All' ]]
                                </span>
                            </div>
                            <div class="checkbox-group">
                                <div v-for="source in sources" 
                                     :key="source.value"
                                     class="checkbox-item"
                                     :class="{ selected: selectedSources.includes(source.value) }"
                                     @click="toggleSource(source.value)">
                                    <input type="checkbox" 
                                           :checked="selectedSources.includes(source.value)"
                                           @click.stop="toggleSource(source.value)">
                                    <label>[[ source.label ]]</label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Sol ID Filter -->
                        <div class="filter-section">
                            <div class="filter-label">
                                Sol ID
                                <span class="select-all" @click="toggleAllSol()">
                                    [[ allSolSelected ? 'Deselect All' : 'Select All' ]]
                                </span>
                            </div>
                            <div class="checkbox-group">
                                <div v-for="sol in sols" 
                                     :key="sol.value"
                                     class="checkbox-item"
                                     :class="{ selected: selectedSols.includes(sol.value) }"
                                     @click="toggleSol(sol.value)">
                                    <input type="checkbox" 
                                           :checked="selectedSols.includes(sol.value)"
                                           @click.stop="toggleSol(sol.value)">
                                    <label>[[ sol.label ]]</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="main-content">
                        <h3>Main Content Area</h3>
                        <p>Selected Filters:</p>
                        <div style="background: white; padding: 20px; border-radius: 8px;">
                            <p><strong>Zones:</strong> [[ selectedZones.join(', ') || 'None' ]]</p>
                            <p><strong>Regions:</strong> [[ selectedRegions.join(', ') || 'None' ]]</p>
                            <p><strong>States:</strong> [[ selectedStates.join(', ') || 'None' ]]</p>
                            <p><strong>Districts:</strong> [[ selectedDistricts.join(', ') || 'None' ]]</p>
                            <p><strong>Products:</strong> [[ selectedProducts.join(', ') || 'None' ]]</p>
                            <p><strong>Sources:</strong> [[ selectedSources.join(', ') || 'None' ]]</p>
                            <p><strong>Sol IDs:</strong> [[ selectedSols.join(', ') || 'None' ]]</p>
                        </div>
                    </div>
                </div>
            </div> 
        `); 
 
        // Fetch field options from DocType
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'DocType',
                name: 'Report Preference'
            },
            callback: function(r) {
                if (r.message) {
                    let meta = r.message;
                    initApp(meta);
                }
            }
        });
        
        function initApp(meta) {
            // Helper function to parse options from child doctypes
            function getOptionsFromChildDoctype(childDoctype) {
                let options = [];
                frappe.model.with_doctype(childDoctype, function() {
                    let child_meta = frappe.get_meta(childDoctype);
                    // Assuming child doctypes have a 'value' or similar field
                    // You may need to adjust this based on actual structure
                    options.push({ value: childDoctype, label: childDoctype });
                });
                return options;
            }
            
            PetiteVue.createApp({ 
                $delimiters: ['[[', ']]'], 
                
                // Data arrays
                zones: [
                    { value: 'Zone 1', label: '1' },
                    { value: 'Zone 2', label: '2' },
                    { value: 'Zone 3', label: '3' },
                    { value: 'Zone 4', label: '4' },
                    { value: 'Zone 5', label: '5' },
                    { value: 'Zone 6', label: '6' }
                ],
                regions: [
                    { value: 'Region 1', label: '1' },
                    { value: 'Region 2', label: '2' },
                    { value: 'Region 3', label: '3' },
                    { value: 'Region 4', label: '4' }
                ],
                states: [],
                districts: [],
                products: [],
                sources: [],
                sols: [],
                
                // Selected values
                selectedZones: [],
                selectedRegions: [],
                selectedStates: [],
                selectedDistricts: [],
                selectedProducts: [],
                selectedSources: [],
                selectedSols: [],
                
                // Computed properties for "Select All" state
                get allZoneSelected() {
                    return this.selectedZones.length === this.zones.length;
                },
                get allRegionSelected() {
                    return this.selectedRegions.length === this.regions.length;
                },
                get allStateSelected() {
                    return this.selectedStates.length === this.states.length;
                },
                get allDistrictSelected() {
                    return this.selectedDistricts.length === this.districts.length;
                },
                get allProductSelected() {
                    return this.selectedProducts.length === this.products.length;
                },
                get allSourceSelected() {
                    return this.selectedSources.length === this.sources.length;
                },
                get allSolSelected() {
                    return this.selectedSols.length === this.sols.length;
                },
                
                // Toggle individual items
                toggleZone(value) {
                    this.toggleItem(this.selectedZones, value);
                },
                toggleRegion(value) {
                    this.toggleItem(this.selectedRegions, value);
                },
                toggleState(value) {
                    this.toggleItem(this.selectedStates, value);
                },
                toggleDistrict(value) {
                    this.toggleItem(this.selectedDistricts, value);
                },
                toggleProduct(value) {
                    this.toggleItem(this.selectedProducts, value);
                },
                toggleSource(value) {
                    this.toggleItem(this.selectedSources, value);
                },
                toggleSol(value) {
                    this.toggleItem(this.selectedSols, value);
                },
                
                // Toggle all items
                toggleAllZone() {
                    this.toggleAll(this.selectedZones, this.zones, this.allZoneSelected);
                },
                toggleAllRegion() {
                    this.toggleAll(this.selectedRegions, this.regions, this.allRegionSelected);
                },
                toggleAllState() {
                    this.toggleAll(this.selectedStates, this.states, this.allStateSelected);
                },
                toggleAllDistrict() {
                    this.toggleAll(this.selectedDistricts, this.districts, this.allDistrictSelected);
                },
                toggleAllProduct() {
                    this.toggleAll(this.selectedProducts, this.products, this.allProductSelected);
                },
                toggleAllSource() {
                    this.toggleAll(this.selectedSources, this.sources, this.allSourceSelected);
                },
                toggleAllSol() {
                    this.toggleAll(this.selectedSols, this.sols, this.allSolSelected);
                },
                
                // Helper methods
                toggleItem(array, value) {
                    const index = array.indexOf(value);
                    if (index > -1) {
                        array.splice(index, 1);
                    } else {
                        array.push(value);
                    }
                },
                
                toggleAll(selectedArray, allArray, isAllSelected) {
                    if (isAllSelected) {
                        selectedArray.length = 0;
                    } else {
                        selectedArray.length = 0;
                        allArray.forEach(item => selectedArray.push(item.value));
                    }
                },
                
                // Load options from child doctypes
                loadOptions() {
                    // Load State options
                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: {
                            doctype: 'State Items',
                            fields: ['name', 'state'],
                            limit_page_length: 0
                        },
                        callback: (r) => {
                            if (r.message) {
                                this.states = r.message.map(item => ({
                                    value: item.state || item.name,
                                    label: item.state || item.name
                                }));
                            }
                        }
                    });
                    
                    // Load District options
                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: {
                            doctype: 'District Items',
                            fields: ['name', 'district'],
                            limit_page_length: 0
                        },
                        callback: (r) => {
                            if (r.message) {
                                this.districts = r.message.map(item => ({
                                    value: item.district || item.name,
                                    label: item.district || item.name
                                }));
                            }
                        }
                    });
                    
                    // Load Product options
                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: {
                            doctype: 'Product Items',
                            fields: ['name', 'product'],
                            limit_page_length: 0
                        },
                        callback: (r) => {
                            if (r.message) {
                                this.products = r.message.map(item => ({
                                    value: item.product || item.name,
                                    label: item.product || item.name
                                }));
                            }
                        }
                    });
                    
                    // Load Source options
                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: {
                            doctype: 'Source Items',
                            fields: ['name', 'source'],
                            limit_page_length: 0
                        },
                        callback: (r) => {
                            if (r.message) {
                                this.sources = r.message.map(item => ({
                                    value: item.source || item.name,
                                    label: item.source || item.name
                                }));
                            }
                        }
                    });
                    
                    // Load Sol ID options
                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: {
                            doctype: 'Sol Items',
                            fields: ['name', 'sol_id'],
                            limit_page_length: 0
                        },
                        callback: (r) => {
                            if (r.message) {
                                this.sols = r.message.map(item => ({
                                    value: item.sol_id || item.name,
                                    label: item.sol_id || item.name
                                }));
                            }
                        }
                    });
                },
                
                init() { 
                    console.log('Permission Config initialized'); 
                    this.loadOptions();
                    frappe.show_alert({ 
                        message: 'Permission Config loaded', 
                        indicator: 'blue' 
                    }, 2); 
                } 
            }).mount('#app'); 
        }
    }); 
};
