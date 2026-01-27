// Complete TTUM Maker - Single JS File for Frappe Page
// Place this in your ttum_maker.js file

frappe.pages["ttum-maker"].on_page_load = function (wrapper) {
  let me = this;
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "TTUM Maker",
    single_column: true,
  });

  me.page.main.html(`
<div class="ttum-maker-app">

  <!-- ================= CHAT MESSAGES AREA ================= -->
  <div id="chat-messages-area" class="chat-messages-area">
    
    <!-- Request Message -->
    <div id="request-message" class="chat-message request-msg hidden">
      <div class="chat-bubble-left">
        <div class="chat-avatar-left">→</div>
        <div class="chat-content">
          <div class="chat-timestamp" id="request-time"></div>
          <div class="chat-text">Request sent to TTUM service</div>
        </div>
      </div>
    </div>

    <!-- Progress Message -->
    <div id="progress-message" class="chat-message progress-msg hidden">
      <div class="chat-bubble-left">
        <div class="chat-avatar-left">⚡</div>
        <div class="chat-content">
          <div class="chat-timestamp" id="progress-time"></div>
          <div class="chat-text" id="progress-text">Processing Excel file...</div>
          <div class="typing-indicator hidden">
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Message - TRANSPARENT -->
    <div id="success-message" class="chat-message success-msg hidden">
      <div class="chat-response-transparent">
        <div class="chat-timestamp" id="success-time"></div>
        <div class="chat-text">
          <strong>Success!</strong> Files ready for download
        </div>
        <div class="file-count-chat">
          <i class="fa fa-file-alt"></i>
          <span id="success-file-count"></span>
        </div>
      </div>
      <div class="download-grid-chat" id="download-links-chat"></div>
      <button class="btn-chat-download-all hidden" id="zip-download-btn-chat">
        <i class="fa fa-download"></i> Download All as ZIP
      </button>
    </div>

    <!-- Error Message - TRANSPARENT -->
    <div id="error-message" class="chat-message error-msg hidden">
      <div class="chat-response-transparent">
        <div class="chat-timestamp" id="error-time"></div>
        <div class="chat-text-error" id="error-text"></div>
      </div>
    </div>

  </div>

  <!-- ================= INPUT ROW ================= -->
  <div class="input-container" id="input-container">
    <div class="input-card">
      <form id="ttum-form" class="chat-form-row">
        <div class="form-row-container">
          <!-- TTUM Type -->
          <div class="form-field-compact">
            <label class="field-label-compact">TTUM Type <span class="required">*</span></label>
            <select id="ttum-type" class="field-input-compact" required>
              <option value="">Select Type</option>
              <option value="ASSET LOAN">ASSET LOAN</option>
              <option value="INWARD">INWARD</option>
              <option value="EHOLO">EHOLO</option>
              <option value="EMSAAD">EMSAAD</option>
              <option value="PERSONAL LOAN">PERSONAL LOAN</option>
              <option value="SCHOOL AND PEON">SCHOOL AND PEON</option>
              <option value="TDA">TDA</option>
              <option value="SALARY">SALARY</option>
            </select>
          </div>

          <!-- File Upload -->
          <div class="form-field-compact file-upload-main">
            <label class="field-label-compact">Excel File <span class="required">*</span></label>
            <div class="file-upload-zone">
              <input type="file" id="excel-file" class="file-input-main" accept=".xlsx,.xls" required>
              <div class="file-upload-placeholder-main">
                <i class="fa fa-cloud-upload-alt"></i>
                <div class="upload-text">
                  <div class="upload-title">Drop Excel file here</div>
                  <div class="upload-subtitle">or click to browse (.xlsx, .xls)</div>
                </div>
                <div class="file-name-preview" id="file-name-preview"></div>
              </div>
            </div>
          </div>

          <!-- Split Mode -->
          <div class="form-field-compact">
            <label class="field-label-compact">Split Mode <span class="required">*</span></label>
            <select id="split-mode" class="field-input-compact">
              <option value="split">By Files</option>
              <option value="records">By Records</option>
            </select>
          </div>

          <!-- Split Number -->
          <div class="form-field-compact split-controls-compact">
            <div class="split-option-compact number-split">
              <label class="field-label-compact"># Files</label>
              <input type="number" id="number-split" class="field-input-compact" min="1" value="1" max="50">
            </div>
            <div class="split-option-compact number-records hidden">
              <label class="field-label-compact">Records/File</label>
              <input type="number" id="number-records" class="field-input-compact" min="1" value="12" max="10000">
            </div>
          </div>

          <!-- Generate Button -->
          <div class="form-field-compact generate-col">
            <button type="submit" class="btn-chat-generate" id="submit-btn">
              <span class="btn-text-chat">Generate TXT Files</span>
              <span class="btn-loader-chat hidden">
                <i class="fa fa-spinner fa-spin"></i>
                Processing...
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Old hidden containers -->
  <div id="progress-container" class="progress-section hidden"></div>
  <div id="results-container" class="results-section hidden"></div>
  <div id="error-container" class="alert alert-error hidden"></div>

</div>
`);

  applyCleanTransparentCSS();
  me.init_form();
};

function applyCleanTransparentCSS() {
  const css = `
/* ========================================
   CLEAN TRANSPARENT - NO BACKGROUNDS
======================================== */
.ttum-maker-app {
  min-height: 100vh;
  background: transparent;
  font-family: inherit;
  color: inherit;
  padding: 20px 0;
}

/* Chat Messages Area */
.ttum-maker-app .chat-messages-area {
  max-width: 800px;
  margin: 0 auto 100px;
  padding: 0 20px;
}

/* Chat Messages Animation */
.ttum-maker-app .chat-message {
  margin-bottom: 16px;
  opacity: 0;
  animation: chatSlideIn 0.3s ease forwards;
}

@keyframes chatSlideIn {
  to { opacity: 1; transform: translateY(0); }
}

/* Left Bubbles (Request/Progress) */
.ttum-maker-app .chat-bubble-left {
  display: flex;
  gap: 10px;
  max-width: 85%;
}

.ttum-maker-app .chat-avatar-left {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  background: var(--success-color, #10a37f);
  color: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

/* TRANSPARENT RESPONSES - NO BACKGROUND */
.ttum-maker-app .chat-response-transparent {
  padding: 8px 0;
  color: inherit;
}

.ttum-maker-app .chat-response-transparent .chat-timestamp {
  font-size: 11px;
  color: var(--gray-500, #6b7280);
  margin-bottom: 4px;
  opacity: 0.8;
}

[data-mode="dark"] .ttum-maker-app .chat-response-transparent .chat-timestamp,
body.dark .ttum-maker-app .chat-response-transparent .chat-timestamp {
  color: #b4b4bc;
}

.ttum-maker-app .chat-response-transparent .chat-text {
  font-size: 14px;
  line-height: 1.4;
  color: inherit;
  font-weight: 500;
  margin-bottom: 8px;
}

.ttum-maker-app .chat-response-transparent .chat-text-error {
  color: var(--danger-color, #ef4444) !important;
}

/* Typing Dots */
.ttum-maker-app .typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.ttum-maker-app .typing-dots {
  display: flex;
  gap: 2px;
  height: 4px;
}

.ttum-maker-app .typing-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--success-color, #10a37f);
  animation: typing 1.4s infinite ease-in-out;
}

.ttum-maker-app .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.ttum-maker-app .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-5px); opacity: 1; }
}

/* File count - Minimal */
.ttum-maker-app .file-count-chat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(16,163,127,0.1);
  color: var(--success-color, #10a37f);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}

/* Downloads */
.ttum-maker-app .download-grid-chat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 0 0;
}

.ttum-maker-app .download-item-chat {
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  cursor: pointer;
  font-size: 13px;
  color: inherit;
}

[data-mode="dark"] .ttum-maker-app .download-item-chat,
body.dark .ttum-maker-app .download-item-chat {
  background: rgba(255,255,255,0.1);
}

.ttum-maker-app .download-item-chat:hover {
  background: rgba(16,163,127,0.15);
  border-color: var(--success-color, #10a37f);
  transform: translateX(2px);
}

.ttum-maker-app .btn-chat-download-all {
  background: var(--gray-900, #202123);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  margin-top: 6px;
}

[data-mode="dark"] .ttum-maker-app .btn-chat-download-all,
body.dark .ttum-maker-app .btn-chat-download-all {
  background: #40414f;
}

.ttum-maker-app .btn-chat-download-all:hover {
  background: var(--gray-800, #343541);
  transform: translateY(-1px);
}

/* ================= INPUT FORM ================= */
.ttum-maker-app .input-container {
  max-width: 900px;
  margin: 40px auto 0;
  padding: 0 20px;
}

.ttum-maker-app .input-card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 28px;
  border: 1px solid rgba(255,255,255,0.3);
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

[data-mode="dark"] .ttum-maker-app .input-card,
body.dark .ttum-maker-app .input-card {
  background: rgba(52, 53, 65, 0.85);
  border-color: rgba(255,255,255,0.1);
}

.ttum-maker-app .form-row-container {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr auto;
  gap: 14px;
  align-items: end;
  max-width: 100%;
}

@media (max-width: 992px) {
  .ttum-maker-app .form-row-container {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .ttum-maker-app .generate-col {
    grid-column: 1 / -1;
    margin-top: 10px;
  }
}

/* Form Fields */
.ttum-maker-app .field-label-compact {
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-500, #6b7280);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

[data-mode="dark"] .ttum-maker-app .field-label-compact,
body.dark .ttum-maker-app .field-label-compact {
  color: #b4b4bc;
}

.ttum-maker-app .field-input-compact,
.ttum-maker-app select.field-input-compact {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--gray-300, #d1d5db);
  font-size: 14px;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
  height: 40px;
  transition: all 0.2s;
  color: var(--gray-900, #1f2937);
  appearance: none;
}

[data-mode="dark"] .ttum-maker-app .field-input-compact,
body.dark .ttum-maker-app .field-input-compact {
  background: rgba(255,255,255,0.1);
  border-color: var(--gray-600, #4b5563);
  color: #ececec;
}

.ttum-maker-app .field-input-compact:focus {
  outline: none;
  border-color: var(--success-color, #10a37f);
  box-shadow: 0 0 0 3px rgba(16,163,127,0.1);
  background: rgba(255,255,255,1);
}

/* File Upload */
.ttum-maker-app .file-upload-zone {
  position: relative;
  display: block;
  height: 40px;
}

.ttum-maker-app .file-input-main {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.ttum-maker-app .file-upload-placeholder-main {
  padding: 8px 12px;
  border-radius: 10px;
  border: 2px dashed var(--gray-300, #d1d5db);
  background: rgba(248,250,252,0.8);
  font-size: 12px;
  color: var(--gray-500, #6b7280);
  transition: all 0.2s;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

[data-mode="dark"] .ttum-maker-app .file-upload-placeholder-main,
body.dark .ttum-maker-app .file-upload-placeholder-main {
  background: rgba(64,65,79,0.8);
  border-color: var(--gray-600, #4b5563);
}

.ttum-maker-app .file-upload-placeholder-main.dragover {
  border-color: var(--success-color, #10a37f);
  background: rgba(16,163,127,0.08);
}

.ttum-maker-app .upload-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-700, #374151);
  margin-bottom: 0;
}

[data-mode="dark"] .ttum-maker-app .upload-title,
body.dark .ttum-maker-app .upload-title {
  color: #d1d5db;
}

.ttum-maker-app .upload-subtitle {
  font-size: 11px;
  color: var(--gray-500, #6b7280);
}

.ttum-maker-app .file-name-preview {
  font-size: 11px;
  color: var(--success-color, #10a37f);
  font-weight: 500;
  padding: 2px 6px;
  background: rgba(16,163,127,0.1);
  border-radius: 4px;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Generate Button */
.ttum-maker-app .btn-chat-generate {
  height: 40px;
  min-width: 140px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  background: var(--success-color, #10a37f);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
}

.ttum-maker-app .btn-chat-generate:hover:not(:disabled) {
  background: color-mix(in srgb, var(--success-color, #10a37f) 90%, black);
  transform: translateY(-1px);
}

.ttum-maker-app .btn-chat-generate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--gray-400, #9ca3af);
}

/* Hide old containers */
.progress-section, .results-section, .alert-error { display: none !important; }


/* ONLY FILE UPLOAD FIX - Add this to your existing CSS */
.ttum-maker-app .file-upload-main {
  min-height: 64px; /* Extra space for file preview */
}

.ttum-maker-app .file-upload-placeholder-main {
  min-height: 40px;
  padding: 8px 10px; /* Reduced padding */
  flex-direction: column; /* Stack vertically */
  align-items: flex-start; /* Left align */
  gap: 2px; /* Tight gap */
  overflow: hidden;
}

.ttum-maker-app .upload-text {
  flex: none; /* Don't grow */
  width: 100%;
  overflow: hidden;
}

.ttum-maker-app .upload-title {
  font-size: 11px; /* Smaller */
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin: 0;
}

.ttum-maker-app .upload-subtitle {
  font-size: 10px; /* Smaller */
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: none; /* Hide subtitle when file selected */
}

.ttum-maker-app .file-name-preview {
  font-size: 11px;
  color: var(--success-color, #10a37f);
  font-weight: 500;
  padding: 2px 6px;
  background: rgba(16,163,127,0.1);
  border-radius: 4px;
  max-width: 100%; /* Full width */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  box-sizing: border-box;
  display: none; /* Show only when file selected */
}

/* Show filename when file selected */
.ttum-maker-app .file-upload-zone.has-file .upload-subtitle {
  display: none;
}

.ttum-maker-app .file-upload-zone.has-file .file-name-preview {
  display: block;
}

.ttum-maker-app .file-upload-zone.has-file .upload-title {
  display: none;
}

.ttum-maker-app .file-upload-zone:not(.has-file) .file-name-preview {
  display: none;
}

/* Icon positioning */
.ttum-maker-app .file-upload-placeholder-main i {
  flex-shrink: 0;
  margin-right: 6px;
  opacity: 0.6;
}

/* Responsive grid adjustment */
@media (max-width: 992px) {
  .ttum-maker-app .form-row-container {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .ttum-maker-app .file-upload-main {
    order: 3; /* Move file upload last on mobile */
  }
  .ttum-maker-app .generate-col {
    order: 4;
    grid-column: unset;
  }
}

`;

  $("head style[data-ttum-maker]").remove();
  $("<style>").attr("data-ttum-maker", "true").text(css).appendTo("head");
}

frappe.pages["ttum-maker"].init_form = function () {
  const $form = $("#ttum-form");
  const $submitBtn = $("#submit-btn");
  const $btnText = $(".btn-text-chat");
  const $btnLoader = $(".btn-loader-chat");
  const $chatArea = $("#chat-messages-area");
  const $requestMsg = $("#request-message");
  const $progressMsg = $("#progress-message");
  const $successMsg = $("#success-message");
  const $errorMsg = $("#error-message");
  const $downloadLinksChat = $("#download-links-chat");
  const $fileZone = $(".file-upload-zone");
  const $fileNamePreview = $("#file-name-preview");
  const $typingIndicator = $(".typing-indicator");

  let processingTimeout;

  // File preview state management
// function updateFilePreview(filename) {
//   const $zone = $(".file-upload-zone");
//   if (filename) {
//     $zone.addClass("has-file");
//     $fileNamePreview.text(filename).show();
//   } else {
//     $zone.removeClass("has-file");
//     $fileNamePreview.hide();
//   }
// }

// Update the existing file change handlers:
// $("#excel-file").off("change").on("change", function() {
//   if (this.files[0]) {
//     updateFilePreview(this.files[0].name);
//   } else {
//     updateFilePreview(null);
//   }
// });

 // ⭐ ADD THIS FUNCTION (anywhere in init_form)
  function updateFilePreview(filename) {
    const $zone = $(".file-upload-zone");
    if (filename) {
      $zone.addClass("has-file");
      $fileNamePreview.text(filename).show();
    } else {
      $zone.removeClass("has-file");
      $fileNamePreview.hide();
    }
  }

  // ⭐ REPLACE your existing file change handler with this:
  $("#excel-file").off("change").on("change", function() {
    if (this.files[0]) {
      updateFilePreview(this.files[0].name);
    } else {
      updateFilePreview(null);
    }
  });

  // ⭐ REPLACE your existing drop handler with this:
  $fileZone.on("drop", function(e) {
    e.preventDefault(); 
    e.stopPropagation();
    $(this).find(".file-upload-placeholder-main").removeClass("dragover");
    
    const files = e.originalEvent.dataTransfer.files;
    if (files.length > 0) {
      $("#excel-file")[0].files = files;
      updateFilePreview(files[0].name);  // ⭐ USE updateFilePreview
    }
  });

  // Split mode toggle
  $("#split-mode").on("change", function () {
    const mode = $(this).val();
    $(".number-split").toggleClass("hidden", mode !== "split");
    $(".number-records").toggleClass("hidden", mode !== "records");
  }).trigger("change");

  // Drag & Drop File
  $fileZone.on("dragover dragenter", function(e) {
    e.preventDefault(); e.stopPropagation();
    $(this).find(".file-upload-placeholder-main").addClass("dragover");
  }).on("dragleave dragend", function(e) {
    e.preventDefault(); e.stopPropagation();
    $(this).find(".file-upload-placeholder-main").removeClass("dragover");
  }).on("drop", function(e) {
    e.preventDefault(); e.stopPropagation();
    $(this).find(".file-upload-placeholder-main").removeClass("dragover");
    const files = e.originalEvent.dataTransfer.files;
    if (files.length > 0) {
      $("#excel-file")[0].files = files;
      $fileNamePreview.text(files[0].name).show();
    }
  });

  $("#excel-file").on("change", function() {
    if (this.files[0]) {
      $fileNamePreview.text(this.files[0].name).show();
    }
  });

  $form.on("submit", async function (e) {
    e.preventDefault();
    resetChatUI();

    try {
      const validation = validateForm();
      if (!validation.isValid) {
        showChatError(validation.errors.join("<br>"));
        return;
      }

      showRequestMessage();
      $chatArea.scrollTop($chatArea[0].scrollHeight);
      
      $submitBtn.prop("disabled", true);
      $btnText.addClass("hidden");
      $btnLoader.removeClass("hidden");

      processingTimeout = setTimeout(() => {
        showLongProcessing();
        $chatArea.scrollTop($chatArea[0].scrollHeight);
      }, 2000);

      const result = await processExcelFile();
      clearTimeout(processingTimeout);
      showChatSuccess(result);
      $chatArea.scrollTop($chatArea[0].scrollHeight);
    } catch (error) {
      clearTimeout(processingTimeout);
      console.error("TTUM Error:", error);
      showChatError(error.message || "An unexpected error occurred");
      $chatArea.scrollTop($chatArea[0].scrollHeight);
    } finally {
      $submitBtn.prop("disabled", false);
      $btnText.removeClass("hidden");
      $btnLoader.addClass("hidden");
    }
  });

  function showLongProcessing() {
    const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    $("#progress-time").text(`Processing since ${now}`);
    $("#progress-text").text("Converting Excel to TXT format...");
    $typingIndicator.removeClass("hidden");
    $progressMsg.removeClass("hidden");
  }

  // All other functions remain exactly the same...
  async function processExcelFile() {
    const file = $("#excel-file")[0].files[0];
    const ttum = {
      ttumType: $("#ttum-type").val(),
      creationDate: new Date().toISOString().slice(0, 19),
      creatorName: frappe.session.user,
    };
    const splitMode = $("#split-mode").val();
    const numberSplit = parseInt($("#number-split").val());
    const numberRecords = parseInt($("#number-records").val());

    const formData = new FormData();
    formData.append("file", file);
    formData.append("ttum", JSON.stringify(ttum));
    formData.append("split", splitMode === "split" ? numberSplit : 0);
    formData.append("numberOfSplitRecords", splitMode === "records" ? numberRecords : 0);

    let response;
    try {
      response = await $.ajax({
        url: "/api/method/sahayog.sahayog.api.ttum.convert",
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
        headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
      });
    } catch (xhr) {
      let msg = "TTUM service is currently unreachable.";
      if (xhr?.responseJSON?.message?.error) msg = xhr.responseJSON.message.error;
      throw new Error(msg);
    }

    if (response.status_code !== 200) {
      let msg = "Unable to generate TTUM files.";
      if (response.message?.error) msg = response.message.error;
      throw new Error(msg);
    }

    return response.message;
  }

  function validateForm() {
    const errors = [];
    const ttumType = $("#ttum-type").val().trim();
    const fileInput = $("#excel-file")[0];
    const splitMode = $("#split-mode").val();
    const numberSplit = parseInt($("#number-split").val());
    const numberRecords = parseInt($("#number-records").val());

    if (!ttumType) errors.push("Please select TTUM Type");
    if (!fileInput.files?.[0]) errors.push("Please select an Excel file");
    if (isNaN(numberSplit) || numberSplit < 1) errors.push("Number of files must be valid positive number");
    if (splitMode === "records" && (isNaN(numberRecords) || numberRecords < 1)) {
      errors.push("Records per file must be valid positive number");
    }
    return { isValid: errors.length === 0, errors };
  }

  function showRequestMessage() {
    const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    $("#request-time").text(`Sent at ${now}`);
    $requestMsg.removeClass("hidden");
  }

  function showChatSuccess(data) {
    const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const totalFiles = data.splitDetails?.length || 0;
    const ttumId = data.ttumId;

    $("#success-time").text(`Completed at ${now}`);
    $("#success-file-count").text(`${totalFiles} file(s) generated`);

    $downloadLinksChat.empty();
    data.splitDetails.forEach((file, index) => {
      $downloadLinksChat.append(`
        <div class="download-item-chat" data-file="${file}">
          <i class="fa fa-file-alt"></i>
          <span>Part ${index + 1}: ${file}</span>
        </div>
      `);
    });

    $("#zip-download-btn-chat").removeClass("hidden").off("click").on("click", function() {
      if (ttumId) window.downloadAllZip(ttumId);
    });

    $successMsg.removeClass("hidden");
  }

  function showChatError(message) {
    const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    $("#error-time").text(`Error at ${now}`);
    $("#error-text").html(message);
    $errorMsg.removeClass("hidden");
  }

  function resetChatUI() {
    $("#request-message, #progress-message, #success-message, #error-message").addClass("hidden");
    $downloadLinksChat.empty();
    $("#zip-download-btn-chat").addClass("hidden");
    $typingIndicator.addClass("hidden");
  }

  window.downloadAllZip = function (ttumId) {
    if (!ttumId) {
      frappe.msgprint("TTUM ID not found for download");
      return;
    }
    const url = `/api/method/sahayog.sahayog.api.ttum.download_all?ttum_id=${ttumId}`;
    window.location.href = url;
  };

  console.log("logedin user is ", frappe.session.user);
};
