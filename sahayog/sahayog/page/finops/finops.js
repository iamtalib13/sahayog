frappe.pages['finops'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'FinOps - Finacle Operations',
		single_column: true
	});
	

	//  Load Petite Vue and then initialize the app
    frappe.require('/assets/your_app/js/petite-vue.iife.js', () => {
		frappe.require('/assets/sahayog/sahayog/page/finops/finops.css');
        page.main.html(`
            

             <div id="finops-app" v-scope @vue:mounted="init()">
                
                <div class="converter-card">
                    <!-- Loading State -->
                    <div v-if="loading" class="loading-overlay">
                        <div class="spinner"></div>
                        <h3 style="color: var(--text-main); margin: 0;">Processing Finacle Operation</h3>
                        <p style="color: var(--text-light); margin-top: 8px;">Please wait while we secure your data...</p>
                    </div>

                    <div class="card-header">
                        <h1 class="app-title">FinOps</h1>
                        <p class="app-subtitle">Securely process Excel files for Finacle banking operations</p>
                    </div>

                    <div class="card-body">
                        
                        <!-- 1. Tabs for Operation Selection -->
                        <div v-if="!result" class="tabs-container">
                            <button 
                                v-for="op in operations" 
                                :key="op.id"
                                class="tab-btn" 
                                :class="{ active: selectedOp === op.id }"
                                @click="selectedOp = op.id">
                                [[ op.label ]]
                            </button>
                        </div>

                        <!-- 2. Main Upload Area -->
                        <div v-if="!result">
                            <input type="file" ref="fileInput" class="hidden-file-input" 
                                   style="display:none" accept=".xlsx,.xls,.csv" @change="handleFile">

                            <!-- Empty State -->
                            <div v-if="!file" 
                                 class="upload-zone" 
                                 :class="{ dragging: isDragging }"
                                 @click="$refs.fileInput.click()"
                                 @dragover.prevent="isDragging = true"
                                 @dragleave.prevent="isDragging = false"
                                 @drop.prevent="handleDrop">
                                
                                <div class="zone-content">
                                    <div class="icon-circle">☁️</div>
                                    <div class="upload-title">Drop your Excel file here</div>
                                    <div class="upload-desc">Supports .xlsx, .xls, .csv</div>
                                    <span class="browse-btn">Browse Files</span>
                                </div>
                            </div>

                            <!-- File Selected State -->
                            <div v-else class="file-preview">
                                <div class="file-icon">📊</div>
                                <div class="file-details">
                                    <div class="file-name">[[ file.name ]]</div>
                                    <div class="file-meta">
                                        <span>[[ formatSize(file.size) ]]</span>
                                        <span style="color: #cbd5e1">•</span>
                                        <span style="text-transform: uppercase">[[ selectedOpLabel ]]</span>
                                    </div>
                                </div>
                                <button class="remove-file" @click="clearFile">×</button>
                            </div>

                            <!-- Action Button -->
                            <div class="action-bar">
                                <button class="process-btn" 
                                        :disabled="!isValid" 
                                        @click="process">
                                    <span>Start Conversion</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>

                        <!-- 3. Result State -->
                        <div v-if="result" class="result-state">
                            <div class="result-icon" :class="result.type">
                                [[ result.type === 'success' ? '✓' : '✕' ]]
                            </div>
                            <h2 style="font-size: 24px; margin-bottom: 10px;">[[ result.title ]]</h2>
                            <p style="color: var(--text-light); max-width: 400px; margin: 0 auto 30px;">
                                [[ result.message ]]
                            </p>
                            
                            <div v-if="result.type === 'success'">
                                <a :href="result.downloadUrl" :download="result.filename" class="download-link">
                                    Download Result File
                                </a>
                            </div>

                            <button @click="reset" style="margin-top: 30px; border: none; background: none; color: var(--text-light); cursor: pointer; text-decoration: underline;">
                                Process another file
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        `);

       PetiteVue.createApp({
            $delimiters: ['[[', ']]'],
            
            // State
            loading: false,
            isDragging: false,
            selectedOp: 'loan_account',
            file: null,
            result: null,

            // Data
            operations: [
                { id: 'loan_account', label: 'Loan Account' },
                { id: 'loan_disbursement', label: 'Disbursement' },
                { id: 'cif_creation', label: 'CIF Creation' }
            ],

            // Computed
            get isValid() {
                return this.selectedOp && this.file;
            },

            get selectedOpLabel() {
                const op = this.operations.find(o => o.id === this.selectedOp);
                return op ? op.label : '';
            },

            // Methods
            init() {
                console.log('FinOps Loaded');
            },

            handleFile(e) {
                const f = e.target.files[0];
                this.validate(f);
            },

            handleDrop(e) {
                this.isDragging = false;
                const f = e.dataTransfer.files[0];
                this.validate(f);
            },

            validate(f) {
                if (!f) return;
                const ext = f.name.split('.').pop().toLowerCase();
                if (!['xlsx', 'xls', 'csv'].includes(ext)) {
                    frappe.show_alert({message: 'Only Excel files allowed', indicator: 'red'});
                    return;
                }
                this.file = f;
            },

            clearFile() {
                this.file = null;
                this.$refs.fileInput.value = '';
            },

            formatSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            },

            async process() {
                if (!this.isValid) return;
                this.loading = true;
                
                try {
                    // 1. Upload File
                    const fileData = new FormData();
                    fileData.append('file', this.file);
                    
                    // Note: In real usage, you'd use frappe.upload_file or similar
                    // Simulating API call structure for clarity
                    const doc = await frappe.call({
                        method: 'frappe.client.attach_file',
                        args: { file: this.file }
                    });

                    // 2. Call Finacle API
                    const apiMethods = {
                        'loan_account': 'sahayog.api.finacle.create_loan_account',
                        'loan_disbursement': 'sahayog.api.finacle.process_loan_disbursement',
                        'cif_creation': 'sahayog.api.finacle.create_cif'
                    };

                    const response = await frappe.call({
                        method: apiMethods[this.selectedOp],
                        args: {
                            file_url: doc.message.file_url,
                            operation_type: this.selectedOp
                        }
                    });

                    this.handleSuccess(response.message);

                } catch (err) {
                    this.result = {
                        type: 'error',
                        title: 'Conversion Failed',
                        message: 'We encountered an error communicating with Finacle. Please check your file format.'
                    };
                    console.error(err);
                } finally {
                    this.loading = false;
                }
            },

            handleSuccess(data) {
                // Generate CSV blob
                const csvContent = this.jsonToCsv(data.data || data);
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                
                this.result = {
                    type: 'success',
                    title: 'File Processed Successfully',
                    message: 'Your data has been converted and processed securely.',
                    downloadUrl: url,
                    filename: `finops_result_${Date.now()}.csv`
                };
            },

            jsonToCsv(items) {
                if (!items || !items.length) return '';
                const keys = Object.keys(items[0]);
                const csv = [
                    keys.join(','),
                    ...items.map(row => keys.map(k => `"${row[k]}"`).join(','))
                ].join('\n');
                return csv;
            },

            reset() {
                this.file = null;
                this.result = null;
                this.loading = false;
                this.selectedOp = 'loan_account'; // Reset to default
            }

        }).mount('#finops-app');
    });
}; 
