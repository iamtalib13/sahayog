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

  <!-- ================= HERO ================= -->
  <div class="hero-header">
    <div class="hero-content">
      <div class="hero-icon">📊</div>
      <h1 class="hero-title">TTUM Maker</h1>
      <p class="hero-subtitle">
        Transform Excel data into formatted TXT files with precision splitting
      </p>
    </div>
  </div>

  <div class="main-content">

    <!-- ============ GET EXISTING TTUM ============ -->
    <!--
    <div class="upload-form mb-4">
      <div class="form-grid">
        <div class="form-field">
          <label class="field-label">
            <i class="fa fa-history"></i>
            Get Existing TTUM <span class="required">*</span>
          </label>
          <input
            type="number"
            id="search-ttum-id"
            class="field-input"
            placeholder="Enter TTUM ID (e.g. 33)"
            min="1"
          />
        </div>

        <div class="form-field d-flex align-items-end">
          <button
            type="button"
            class="btn btn-primary"
            id="fetch-ttum-btn"
          >
            <i class="fa fa-search"></i>
            Get TTUM
          </button>
        </div>
      </div>
    </div>
    --!>

     
    <!-- ============ DIVIDER FEEL (VISUAL ONLY) ============ -->
    <!--
    <div class="text-center mb-4" style="opacity:0.6;font-weight:600;">
      — OR GENERATE NEW TTUM —
    </div>
     --!>

    <!-- ================= GENERATE FORM ================= -->
    <form id="ttum-form" class="upload-form">
      <div class="form-grid">

        <div class="form-field">
          <label class="field-label">
            <i class="field-icon icon-type"></i>
            TTUM Type <span class="required">*</span>
          </label>
          <select id="ttum-type" class="field-input" required>
            <option value="">Select TTUM Type</option>
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

        <div class="form-field full-width">
          <label class="field-label">
            <i class="field-icon icon-file"></i>
            Excel File <span class="required">*</span>
          </label>
          <div class="file-upload-wrapper">
            <input type="file" id="excel-file" class="field-input file-input" accept=".xlsx,.xls" required>
            <div class="file-upload-placeholder">
              <i class="fa fa-cloud-upload-alt"></i>
              <span>Choose Excel file (.xlsx, .xls)</span>
            </div>
          </div>
          <small class="field-help">
            Maximum 50MB. Supported formats: XLSX, XLS
          </small>
        </div>

        <div class="form-field">
          <label class="field-label">
            <i class="field-icon icon-split"></i>
            Split Mode <span class="required">*</span>
          </label>
          <select id="split-mode" class="field-input">
            <option value="split">Number of Files</option>
            <option value="records">Records per File</option>
          </select>
        </div>

        <div class="form-field split-controls">
          <div class="split-option number-split">
            <label class="field-label">Number of TXT Files</label>
            <input type="number" id="number-split" class="field-input" min="1" value="1" max="50">
          </div>
          <div class="split-option number-records hidden">
            <label class="field-label">Records per File</label>
            <input type="number" id="number-records" class="field-input" min="1" value="12" max="10000">
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-generate" id="submit-btn">
          <span class="btn-content">
            <i class="fa fa-magic"></i>
            <span class="btn-text">Generate TXT Files</span>
          </span>
          <span class="btn-loader hidden">
            <i class="fa fa-spinner fa-spin"></i>
            Processing...
          </span>
        </button>

        <button type="button" class="btn btn-secondary" id="reset-btn">
          <i class="fa fa-refresh"></i> Reset
        </button>
      </div>
    </form>

    <!-- ================= PROGRESS ================= -->
    <div id="progress-container" class="progress-section hidden">
      <div class="progress-header">
        <i class="fa fa-tasks"></i>
        <span>Processing Files</span>
      </div>
      <div class="progress-container">
        <div class="progress-track">
          <div id="progress-bar" class="progress-fill"></div>
          <div class="progress-indicator"></div>
        </div>
        <div class="progress-info">
          <span id="progress-text" class="progress-label">Preparing...</span>
          <span id="progress-percent" class="progress-percent">0%</span>
        </div>
      </div>
    </div>

    <!-- ================= RESULTS ================= -->
    <div id="results-container" class="results-section hidden">
      <div class="results-header">
        <i class="fa fa-check-circle text-success"></i>
        <h3>Files Ready for Download</h3>
      </div>
      <div id="download-links" class="download-grid"></div>
    </div>

    <div id="error-container" class="alert alert-error hidden"></div>

  </div>
</div>
`);

  
  applyPremiumCSS();
  me.init_form();
};

// Enhanced CSS with Glassmorphism + Modern Design
function applyPremiumCSS() {
  const css = `
/* ================================
   SCOPE: TTUM MAKER ONLY
================================ */
.ttum-maker-app {
  min-height: 100vh;
  background: #f4f6f9;
  padding: 24px 0;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1f2937;
}

/* ================================
   HEADER
================================ */
.ttum-maker-app .hero-header {
  text-align: center;
  margin-bottom: 32px;
}

.ttum-maker-app .hero-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.ttum-maker-app .hero-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}

.ttum-maker-app .hero-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-top: 6px;
}

/* ================================
   CARD
================================ */
.ttum-maker-app .upload-form {
  background: #ffffff;
  border-radius: 14px;
  padding: 32px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  border: 1px solid #e5e7eb;
}

/* ================================
   FORM GRID
================================ */
.ttum-maker-app .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.ttum-maker-app .form-field.full-width {
  grid-column: 1 / -1;
}

/* ================================
   LABELS
================================ */
.ttum-maker-app .field-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.ttum-maker-app .required {
  color: #dc2626;
}

/* ================================
   INPUTS
================================ */
.ttum-maker-app .field-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  background: #fff;
}

.ttum-maker-app .field-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
}

/* ================================
   SELECT (CUSTOM LOOK)
================================ */
.ttum-maker-app select.field-input {
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #6b7280 50%),
    linear-gradient(135deg, #6b7280 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 16px,
    calc(100% - 12px) 16px;
  background-size: 6px 6px;
  background-repeat: no-repeat;
  cursor: pointer;
}

/* ================================
   FILE UPLOAD
================================ */
.ttum-maker-app .file-upload-placeholder {
  padding: 16px;
  border-radius: 10px;
  border: 1px dashed #cbd5e1;
  background: #f9fafb;
  font-size: 14px;
  color: #6b7280;
}

.ttum-maker-app .file-input:hover + .file-upload-placeholder {
  border-color: #2563eb;
  background: #eff6ff;
}

/* ================================
   ACTION BUTTONS
================================ */
.ttum-maker-app .form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.ttum-maker-app .btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.ttum-maker-app .btn-primary {
  background: #2563eb;
  color: #ffffff;
}

.ttum-maker-app .btn-primary:hover {
  background: #1d4ed8;
}

.ttum-maker-app .btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

/* ================================
   PROGRESS
================================ */
.ttum-maker-app .progress-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.ttum-maker-app .progress-track {
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
}

.ttum-maker-app .progress-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 999px;
}

/* ================================
   RESULTS
================================ */
.ttum-maker-app .results-section {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 12px;
  padding: 24px;
}

.ttum-maker-app .download-link {
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid #d1fae5;
  background: #ffffff;
}

/* ================================
   ERROR
================================ */
.ttum-maker-app .alert-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

/* ================================
   RESPONSIVE
================================ */
@media (max-width: 768px) {
  .ttum-maker-app .form-grid {
    grid-template-columns: 1fr;
  }
}
`;

  $("head style[data-ttum-maker]").remove();
  $("<style>").attr("data-ttum-maker", "true").text(css).appendTo("head");
}

frappe.pages["ttum-maker"].init_form = function () {
  const $form = $("#ttum-form");
  const $submitBtn = $("#submit-btn");
  const $btnText = $(".btn-text");
  const $btnLoader = $(".btn-loader");
  const $progressContainer = $("#progress-container");
  const $progressBar = $("#progress-bar");
  const $progressText = $("#progress-text");
  const $resultsContainer = $("#results-container");
  const $downloadLinks = $("#download-links");
  const $errorContainer = $("#error-container");

  // Split mode toggle
  $("#split-mode")
    .on("change", function () {
      const mode = $(this).val();
      $(".number-split").toggleClass("hidden", mode !== "split");
      $(".number-records").toggleClass("hidden", mode !== "records");
    })
    .trigger("change");

  // Reset form
  $("#reset-btn").on("click", function () {
    $form[0].reset();
    hideAllSections();
    $("#split-mode").trigger("change");
  });



  $form.on("submit", async function (e) {
  e.preventDefault();
  resetResultsUI();

  try {
    resetResultsUI();
    clearErrors();
    const validation = validateForm();
    if (!validation.isValid) {
      showError(validation.errors.join("<br>"));
      return;
    }

    // showLoading(true);
    hideAllSections();

    const result = await processExcelFile();
    showResults(result); // ✅ ONLY called on success
  } catch (error) {
    console.error("TTUM Error:", error);
    // ❌ DO NOT show results here
  } finally {
    // showLoading(false);
  }
});


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
  formData.append(
    "numberOfSplitRecords",
    splitMode === "records" ? numberRecords : 0
  );

  let response;

  try {
    response = await $.ajax({
      url: "/api/method/sahayog.sahayog.api.ttum.convert",
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      headers: {
        "X-Frappe-CSRF-Token": frappe.csrf_token,
      },
    });
  } catch (xhr) {
    // 🔴 Network / 502 / 504 / server crash
    let msg = "Unexpected error occurred.";

    if (xhr?.responseJSON?.message?.error) {
      msg = "TTUM service is currently unreachable.";
    }

    showError(msg);
    throw new Error(msg); // ⛔ STOP FLOW
  }

  // 🔴 Business-level failure (status_code != 200)
  if (response.status_code !== 200) {
    let msg = "Unable to generate TTUM.";

    if (response.message?.error) {
      msg = "TTUM service is currently unreachable.";
    }

    showError(msg);
    throw new Error(msg); // ⛔ STOP FLOW
  }

  // ✅ SUCCESS ONLY
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
    if (isNaN(numberSplit) || numberSplit < 1)
      errors.push("Number of files must be valid positive number");
    if (
      splitMode === "records" &&
      (isNaN(numberRecords) || numberRecords < 1)
    ) {
      errors.push("Records per file must be valid positive number");
    }
    return { isValid: errors.length === 0, errors };
  }

  function showLoading(show) {
    $submitBtn.prop("disabled", show);
    $btnText.toggleClass("hidden", show);
    $btnLoader.toggleClass("hidden", !show);
    $progressContainer.toggleClass("hidden", !show);
  }

  function updateProgress(percent, text) {
    $progressBar.css("width", percent + "%").attr("aria-valuenow", percent);
    $progressText.text(text);
  }



function showResults(data) {

  const $results = $("#results-container");
  const $links = $("#download-links");

  // ===== HARD RESET =====
  $results.removeClass("hidden");
  $links.empty();
  $results.find(".file-count, .zip-download-btn").remove();

  const totalFiles = data.splitDetails?.length || 0;
  const ttumId = data.ttumId; // 🔥 THIS IS REQUIRED

  // ===== SUMMARY + ZIP =====
  const $summary = $(`
    <div class="file-count d-flex justify-content-between align-items-center mb-3">
      <span>
        <i class="fa fa-file-alt"></i>
        ${totalFiles} file(s) generated
      </span>
      <button class="btn btn-primary zip-download-btn">
        <i class="fa fa-download"></i> Download All (ZIP)
      </button>
    </div>
  `);

  // ✅ Attach click handler properly
  $summary.find(".zip-download-btn").on("click", function () {
    if (!ttumId) {
      frappe.msgprint("TTUM ID not found for ZIP download");
      return;
    }
    downloadAllZip(ttumId);
  });

  $results.find(".results-header").after($summary);

  // ===== FILE LIST =====
  data.splitDetails.forEach((file, index) => {
    $links.append(`
      <div class="download-item">
        <i class="fa fa-file-alt text-success"></i>
        <span>Part ${index + 1}: ${file}</span>
      </div>
    `);
  });
}

  function handleError(error) {
    console.error("TTUM Maker Error:", error);
    let message =
      error.message || "An error occurred while processing the file.";

    if (error._server_messages) {
      message = error._server_messages[0]?.message || message;
    }

    showError(message);
  }

  function showError(message) {
    $errorContainer.html(message).removeClass("hidden");
    frappe.msgprint({
      title: __("Error"),
      message: message,
      indicator: "red",
    });
  }

  function clearErrors() {
    $errorContainer.addClass("hidden").empty();
  }

  function hideAllSections() {
    $resultsContainer.addClass("hidden");
    $progressContainer.addClass("hidden");
    $downloadLinks.empty();
  }

  console.log("logedin user is ", frappe.session.user);


// ===============================
// ADDITION: DOWNLOAD ALL ZIP
// ===============================
// ===============================
// GLOBAL: Download ALL ZIP
// ===============================
window.downloadAllZip = function (ttumId) {
  if (!ttumId) {
    frappe.msgprint("TTUM ID not found for download");
    return;
  }

  const url =
    `/api/method/sahayog.sahayog.api.ttum.download_all?ttum_id=${ttumId}`;

  window.location.href = url;
};


function toggleFetchTtumLoading(isLoading) {
  const $btn = $("#fetch-ttum-btn");

  if (isLoading) {
    $btn.prop("disabled", true);
    $btn.data("original-html", $btn.html());
    $btn.html(`<i class="fa fa-spinner fa-spin"></i> Fetching...`);
  } else {
    $btn.prop("disabled", false);
    $btn.html($btn.data("original-html"));
  }
}



// ===============================
// FETCH EXISTING TTUM BY ID
// ===============================

$("#fetch-ttum-btn").on("click", async function () {
  const ttumId = $("#search-ttum-id").val();
  resetResultsUI(); 
  clearErrors();
  hideAllSections();
  $downloadLinks.empty();

  if (!ttumId) {
    showError("Please enter a TTUM ID");
    return;
  }

  toggleFetchTtumLoading(true); // ✅ correct loader

  try {
    const response = await $.ajax({
      url: "/api/method/sahayog.sahayog.api.ttum.get_ttum_by_id",
      method: "GET",
      data: { ttum_id: ttumId },
      headers: {
        "X-Frappe-CSRF-Token": frappe.csrf_token,
      },
    });

    if (response?.message?.error) {
      showError(response.message.error);
      return;
    }

    showResults(response.message);

  } catch (xhr) {
    let msg = "Unable to fetch TTUM.";

    if (xhr.status === 404) {
      msg = "Invalid TTUM ID";
    } else if (xhr.status === 204) {
      msg = "No files found for this TTUM ID";
    } else if (xhr.status >= 500) {
      msg = "TTUM service is currently unreachable";
    }

    showError(msg);
  } finally {
    toggleFetchTtumLoading(false); // ✅ restore button
  }
});

function resetResultsUI() {
  // Hide whole results section
  $("#results-container").addClass("hidden");

  // Remove all file cards
  $("#download-links").empty();

  // Remove any dynamically added summary rows / zip buttons
  $("#results-container")
    .find(".download-summary, .zip-download-btn, .file-count")
    .remove();
}
};
