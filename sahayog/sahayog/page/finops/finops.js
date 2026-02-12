frappe.pages['finops'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'FinOps - Finacle Operations',
		single_column: true
	});
	

	//  Load Petite Vue and then initialize the app
    frappe.require('/assets/sahayog/js/petite-vue.iife.js', () => {
		// frappe.require('/assets/sahayog/sahayog/page/finops/finops.css');

        const css = `
    /* PASTE YOUR FULL CSS CONTENT HERE */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
    --primary: #2E45CA;       /* Deep Indigo from image */
    --primary-hover: #1e3a8a;
    --accent: #6990DA;        /* Soft Blue from image */
    /*--bg-color: #F7F9FA; */      /* Off-white background */
    --text-main: #302F32;     /* Dark Charcoal */
    --text-light: #8b9bb4;
    --surface: #ffffff;
    --border: #e2e8f0;
    --success: #10b981;
    --error: #ef4444;
    --radius: 24px;
    --shadow: 0 25px 50px -12px rgba(46, 69, 202, 0.15);
    --bg-color:var(--success)
    max-width: 100vw;
}

#finops-app {
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-color);
    min-height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;

}

/* --- Main Card --- */
.converter-card {
    background: var(--surface);
    width: 100%;
    max-width: 900px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
    position: relative;
    transition: transform 0.3s ease;
}

.card-header {
    padding: 40px 40px 20px;
    text-align: center;
}

.app-title {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-main);
    letter-spacing: -0.5px;
    margin-bottom: 8px;
}

.app-subtitle {
    color: var(--text-light);
    font-size: 16px;
}

.card-body {
    padding: 20px 40px 50px;
}

/* --- Operation Tabs --- */
.tabs-container {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 40px;
    background: #f1f5f9;
    padding: 6px;
    border-radius: 16px;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
}

.tab-btn {
    padding: 10px 24px;
    border-radius: 12px;
    border: none;
    background: transparent;
    color: var(--text-light);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tab-btn.active {
    background: var(--surface);
    color: var(--primary);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.tab-btn:hover:not(.active) {
    color: var(--text-main);
}

/* --- Upload Zone (The "Hero" element) --- */
.upload-zone {
    border: 3px dashed var(--border);
    border-radius: 20px;
    padding: 60px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #fafbfc;
    position: relative;
}

.upload-zone:hover, .upload-zone.dragging {
    border-color: var(--primary);
    background: rgba(46, 69, 202, 0.02);
    transform: scale(1.005);
}

.upload-zone.has-file {
    border-style: solid;
    border-color: var(--success);
    background: #f0fdf4;
}

.zone-content {
    pointer-events: none; /* Let clicks pass to parent */
}

.icon-circle {
    width: 80px;
    height: 80px;
    background: #eff4ff;
    color: var(--primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
}

.upload-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 8px;
}

.upload-desc {
    color: var(--text-light);
    font-size: 14px;
}

.browse-btn {
    display: inline-block;
    margin-top: 20px;
    padding: 12px 28px;
    background: var(--primary);
    color: white;
    border-radius: 10px;
    font-weight: 600;
    pointer-events: auto; /* Re-enable clicks */
    transition: background 0.2s;
}

.browse-btn:hover {
    background: var(--primary-hover);
}

/* --- File Preview Item --- */
.file-preview {
    display: flex;
    align-items: center;
    background: var(--surface);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    margin-top: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    animation: slideUp 0.3s ease-out;
}

.file-icon {
    width: 48px;
    height: 48px;
    background: #e0f2fe;
    color: #0284c7;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-right: 16px;
}

.file-details {
    flex: 1;
}

.file-name {
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 4px;
}

.file-meta {
    font-size: 12px;
    color: var(--text-light);
    display: flex;
    gap: 10px;
}

.remove-file {
    padding: 8px;
    color: var(--text-light);
    cursor: pointer;
    transition: color 0.2s;
    background: none;
    border: none;
    font-size: 20px;
}

.remove-file:hover {
    color: var(--error);
}

/* --- Action Bar --- */
.action-bar {
    margin-top: 40px;
    display: flex;
    justify-content: center;
}

.process-btn {
    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
    color: white;
    border: none;
    padding: 18px 60px;
    border-radius: 100px; /* Pill shape */
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 10px 20px rgba(46, 69, 202, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 10px;
}

.process-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(46, 69, 202, 0.4);
}

.process-btn:disabled {
    background: #cbd5e1;
    box-shadow: none;
    cursor: not-allowed;
}

/* --- Animations --- */
@keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* --- Loader Overlay (Modern Blur) --- */
.loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border-radius: var(--radius);
}

.spinner {
    width: 60px;
    height: 60px;
    border: 4px solid #e2e8f0;
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* --- Result State --- */
.result-state {
    text-align: center;
    padding: 40px 0;
    animation: slideUp 0.4s ease-out;
}

.result-icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    margin: 0 auto 24px;
}

.result-icon.success { background: #dcfce7; color: #16a34a; }
.result-icon.error { background: #fee2e2; color: #dc2626; }

.download-link {
    display: inline-block;
    margin-top: 20px;
    padding: 14px 32px;
    background: var(--text-main);
    color: white;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    transition: transform 0.2s;
}

.download-link:hover { transform: translateY(-2px); }

.page-head {
    display: none;
    z-index: 6;
    position: sticky;
    top: var(--navbar-height);
    background: var(--bg-color);
    margin-bottom: 5px;
    transition: .5s top;
}

.container page-body{
    margin: 0px;
    max-width: 100vw;
}
.body {
    background-image: 
        radial-gradient(at 0% 0%, rgba(105, 144, 218, 0.1) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(46, 69, 202, 0.1) 0px, transparent 50%);
}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
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

            // async process() {
            //     if (!this.isValid) return;
            //     this.loading = true;
                
            //     try {
            //         // 1. Upload File
            //         const fileData = new FormData();
            //         fileData.append('file', this.file);
                    
            //         // Note: In real usage, you'd use frappe.upload_file or similar
            //         // Simulating API call structure for clarity
            //         const doc = await frappe.call({
            //             method: 'frappe.client.attach_file',
            //             args: { file: this.file }
            //         });

            //         // 2. Call Finacle API
            //         // const apiMethods = {
            //         //     'loan_account': 'sahayog.api.finacle.create_loan_account',
            //         //     'loan_disbursement': 'sahayog.api.finacle.process_loan_disbursement',
            //         //     'cif_creation': 'sahayog.api.finacle.create_cif'
            //         // };
            //         // Corrected API Paths to match your file structure
            //         const apiMethods = {
            //             'loan_account': 'sahayog.sahayog.page.finops.finops.create_loan_account',
            //             'loan_disbursement': 'sahayog.sahayog.page.finops.finops.process_loan_disbursement',
            //             'cif_creation': 'sahayog.sahayog.page.finops.finops.create_cif'
            //         };

            //         const response = await frappe.call({
            //             method: apiMethods[this.selectedOp],
            //             args: {
            //                 file_url: doc.message.file_url,
            //                 operation_type: this.selectedOp
            //             }
            //         });

            //         this.handleSuccess(response.message);

            //     } catch (err) {
            //         this.result = {
            //             type: 'error',
            //             title: 'Conversion Failed',
            //             message: 'We encountered an error communicating with Finacle. Please check your file format.'
            //         };
            //         console.error(err);
            //     } finally {
            //         this.loading = false;
            //     }
            // },

            async process() {
                if (!this.isValid) return;
                this.loading = true;
                this.result = null; // Clear previous results

                try {
                    // 1. Upload File
                    const fd = new FormData();
                    fd.append("file", this.file, this.file.name);
                    fd.append("is_private", 0);
                    fd.append("folder", "Home");

                    const up = await fetch("/api/method/upload_file", {
                        method: "POST",
                        headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
                        body: fd
                    });

                    const upJson = await up.json();
                    if (!upJson.message || !upJson.message.file_url) {
                        throw new Error(upJson.exception || "File upload failed");
                    }

                    const file_url = upJson.message.file_url;

                    // 2. Call Backend API
                    const apiMethods = {
                        loan_account: "sahayog.sahayog.page.finops.finops.create_loan_account",
                        loan_disbursement: "sahayog.sahayog.page.finops.finops.process_loan_disbursement",
                        cif_creation: "sahayog.sahayog.page.finops.finops.create_cif"
                    };

                    const r = await frappe.call({
                        method: apiMethods[this.selectedOp],
                        args: { file_url, operation_type: this.selectedOp }
                    });

                    // LOG FULL RESPONSE FOR DEBUGGING
                    console.log("Finacle Response:", r.message);

                    // 3. Handle Response based on Status
                    if (r.message && r.message.status === "SUCCESS") {
                        this.handleSuccess(r.message);
                    } else {
                        // Handle Logic Failure (Finacle Error / Partial Failure)
                        const errorMsg = r.message?.message || "Operation failed without a specific error message.";
                        throw new Error(errorMsg);
                    }

                } catch (err) {
                    console.error("FinOps Processing Error:", err);
                    
                    this.result = {
                        type: "error",
                        title: "Operation Failed",
                        message: err.message || "An unexpected error occurred."
                    };
                } finally {
                    this.loading = false;
                }
            },

            handleSuccess(data) {
                // Only generate CSV if we have data to show
                let downloadUrl = null;
                let filename = null;

                if (data.data && data.data.length > 0) {
                    const csvContent = this.jsonToCsv(data.data);
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    downloadUrl = URL.createObjectURL(blob);
                    filename = `finops_${this.selectedOp}_${Date.now()}.csv`;
                }

                this.result = {
                    type: 'success',
                    title: 'Operation Successful',
                    message: data.message || 'Your operation has been processed successfully.',
                    downloadUrl: downloadUrl,
                    filename: filename
                };
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
