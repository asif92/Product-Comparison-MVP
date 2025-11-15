document.addEventListener('DOMContentLoaded', function () {
  var inputs = Array.from(document.querySelectorAll('input[name="query"]'));
  var placeholders = [
    'Nike trail running shoes',
    'Running shoes under $150',
    'Trail running shoes under 300 grams'
  ];
  var currentIndex = 0;
  var intervalId = null;

  function rotatePlaceholders() {
    // Clear placeholders before starting
    inputs.forEach(input => input.placeholder = "");

    var currentPlaceholder = placeholders[currentIndex];
    currentIndex = (currentIndex + 1) % placeholders.length;

    // Start the typing animation (applies to all inputs)
    animateText(currentPlaceholder);
  }

  function animateText(text) {
    var index = 0;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    intervalId = setInterval(function () {
      index++;
      // Update all inputs with the substring
      inputs.forEach(input => {
        input.placeholder = text.substring(0, index);
      });

      if (index > text.length) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 70); // ms between animation steps
  }

  // Call on load and rotate every 3s
  rotatePlaceholders();
  setInterval(rotatePlaceholders, 3000);
});

// overlay script
const overlay = document.getElementById('overlay');

function showOverlay() {
  overlay.classList.remove('opacity-0', 'pointer-events-none');
  overlay.classList.add('opacity-100');
  overlay.setAttribute('aria-hidden', 'false');
  // prevent body scroll while overlay open
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}


function hideOverlay() {
  // fade out
  overlay.classList.remove('opacity-100');
  overlay.classList.add('opacity-0');
  overlay.setAttribute('aria-hidden', 'true');
  // restore pointer events after the transition ends
  setTimeout(() => {
  overlay.classList.add('pointer-events-none');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  }, 260);
}

// close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideOverlay();
});


    let allProducts = [];


     function stripScorePrefix(text) {
        // Remove existing "N – " prefix if present
        const m = text.match(/^\s*\d{1,2}\s*[–-]\s*/);
        return m ? text.slice(m[0].length).trim() : text.trim();
      }

      function extractNumeric(raw) {
        // Pull the first number; drop commas. Works for "$1,299", "16 GB", "1.25 kg", "14-inch", "90Hz"
        const cleaned = raw.replace(/,/g, '');
        const m = cleaned.match(/-?\d+(\.\d+)?/);
        return m ? parseFloat(m[0]) : null;
      }

      // Helper: reuse existing extractor (you already have this above)
      function getNumeric(raw) {
        const n = extractNumeric(String(raw ?? ""));
        return n === null ? NaN : n;
      }

      function buildImportanceCellHTML(value) {
        return `
          <input 
            type="number" 
            class="importance-input "
            value="${value}" 
            min="0" max="10"
            oninput="handleImportanceChange(this)" 
            onblur="finalizeImportance(this)"
          />
        `;
      }

      // Build the innerHTML for a product cell consistently
      function buildScoreCellHTML(rawValue, scoreValue) {
        return `
          <div class="flex">
            <input 
              type="text" 
              class="raw-value ml-2"
              value="${rawValue || "-"}" 
            />

            <input 
              type="number" 
              class="score-input  ml-2"
              value="${scoreValue || 0}" 
              min="0" max="10"
              oninput="handleScoreChange(this)" 
              onblur="finalizeScore(this)"
            />
          </div>
        `;
      }


      function handleScoreChange(input) {
        const td = input.closest("td");
        if (!td) return;

        let val = input.value.trim();
        if (val === "") {
          td.setAttribute("data-score", "0");
          updateFooterTotals();
          return;
        }

        let newScore = parseInt(val, 10);
        if (isNaN(newScore)) newScore = 0;
        if (newScore > 10) newScore = 10;

        td.setAttribute("data-score", newScore);
        updateFooterTotals();
      }
      function finalizeScore(input) {
        let val = parseInt(input.value, 10);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 10) val = 10;
        input.value = val;
      }

      function handleImportanceChange(input) {
        // Allow empty while typing
        const td = input.closest("td");
        if (!td) return;

        let val = input.value.trim();
        if (val === "") {
          td.setAttribute("data-importance", "0"); 
          updateFooterTotals();
          return;
        }

        let newImportance = parseInt(val, 10);
        if (isNaN(newImportance)) newImportance = 0;
        if (newImportance > 10) newImportance = 10;

        td.setAttribute("data-importance", newImportance);
        updateFooterTotals();
      }

      function finalizeImportance(input) {
        // Only fix value when user leaves the field
        let val = parseInt(input.value, 10);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 10) val = 10;
        input.value = val;
      }

function recomputeScores(startingIndex = 2) {
  const table = document.querySelector("#results table");
  if (!table) return;

  const rows = table.querySelectorAll("tr");
  rows.forEach((row, i) => {
    if (i < startingIndex || row.id === "addAttributeRow") return;

    // fresh score per row
    let finalScore = 10;  

    const compareType = row.cells[2]?.querySelector("select")?.value || "higher";

    const productCells = Array.from(row.cells).slice(3);

    const pairs = productCells.map(td => {
      const raw = td.dataset.raw || "";
      const numeric = getNumeric(raw);
      return { td, raw, numeric };
    });

    const numericList = pairs.filter(p => Number.isFinite(p.numeric)).map(p => p.numeric);

    if (numericList.length === 0) {
      pairs.forEach(p => {
        p.td.innerHTML = buildScoreCellHTML(p.raw, finalScore);
        p.td.dataset.raw = p.raw;
        p.td.dataset.score = finalScore;
      });
      return;
    }

    const uniqueSorted = Array.from(new Set(numericList)).sort((a, b) =>
      compareType === "lower" ? a - b : b - a
    );
    const M = uniqueSorted.length;

    pairs.forEach(p => {
      if (Number.isFinite(p.numeric)) {
        if (M === 1) {
          finalScore = 10;
        } else {
          const rankIndex = uniqueSorted.indexOf(p.numeric);
          finalScore = Math.round(10 - (rankIndex * 9) / (M - 1));
          finalScore = Math.max(1, Math.min(10, finalScore));
        }
      }

      p.td.innerHTML = buildScoreCellHTML(p.raw, finalScore);
      p.td.dataset.raw = p.raw;
      p.td.dataset.score = finalScore;
    });
  });

  updateFooterTotals();
}




// Delegated click handler for score editing + saving (single global listener)
document.addEventListener("click", (e) => {
  // Show input when clicking score text
  if (e.target.classList && e.target.classList.contains("score-text")) {
    const td = e.target.closest("td");
    if (!td) return;
    const editSpan = td.querySelector(".edit-score");
    if (!editSpan) return;

    // hide score text, show editor
    e.target.classList.add("hidden");
    editSpan.classList.remove("hidden");

    const input = editSpan.querySelector(".score-input");
    // if score was "-" (non-numeric), default to 1 for the input
    const currentText = e.target.innerText.trim();
    if (currentText === "-" || !input.value) {
      input.value = td.getAttribute("data-score") && Number(td.getAttribute("data-score")) > 0
        ? td.getAttribute("data-score")
        : 1;
    }
    input.focus();
    return;
  }

  // Save button click (works for both numeric and previously non-numeric)
  if (e.target.classList && e.target.classList.contains("save-score")) {
    const td = e.target.closest("td");
    if (!td) return;
    const input = td.querySelector(".score-input");
    let newScore = parseInt(input.value, 10);
    if (isNaN(newScore) || newScore < 1) newScore = 1;
    if (newScore > 10) newScore = 10;

    const rawValue = td.getAttribute("data-raw") || td.innerText.split("–")[0].trim().replace(/<[^>]+>/g, "").trim();

    // rebuild cell HTML and attributes
    td.innerHTML = buildScoreCellHTML(rawValue, String(newScore), newScore);
    td.setAttribute("data-raw", rawValue);
    td.setAttribute("data-score", newScore);

    updateFooterTotals();
    return;
  }
});
function addScoreEditButtons() {
  const table = document.querySelector("#results table");
  if (!table) return;

  const rows = table.querySelectorAll("tr");
  rows.forEach((row, i) => {
    if (i === 0 || row.id === "addAttributeRow") return;

    const productCells = Array.from(row.cells).slice(3); // skip Attribute/Importance/How-to-Compare
    productCells.forEach(td => {
      const scoreSpan = td.querySelector(".score-text");
      const editSpan = td.querySelector(".edit-score");
      const input = td.querySelector(".score-input");
      const saveBtn = td.querySelector(".save-score");

      if (!scoreSpan || !editSpan || !input || !saveBtn) return;

      // Show input when clicking score
      scoreSpan.addEventListener("click", () => {
        scoreSpan.classList.add("hidden");
        editSpan.classList.remove("hidden");
      });

      // Save on tick
      saveBtn.addEventListener("click", () => {
        let newScore = parseInt(input.value, 10);
        if (isNaN(newScore) || newScore < 1) newScore = 1;
        if (newScore > 10) newScore = 10;

        // Get the raw value from before the "–"
        const oldRaw = td.querySelector(".score-text") 
          ? td.innerHTML.split("–")[0].trim()
          : "";

        // Clean any leftover HTML tags
        const rawValue = oldRaw.replace(/<[^>]+>/g, "").trim();

        // Rebuild cell with value on left and new score on right
        td.innerHTML = `
          ${rawValue} – 
          <span class="score-text">${newScore}</span>
          <span class="edit-score hidden">
            <input type="number" class="score-input border px-1 py-0.5 rounded text-md text-center" value="${newScore}" min="1" max="10" />
            <button class="save-score">✔️</button>
          </span>
        `;

        // Update data-score attribute for footer calculation
        td.setAttribute("data-score", newScore);

        // addScoreEditButtons(); // rebind events
        updateFooterTotals();  // ✅ recalc footer totals after edit
      });
    });
  });
}

function addStyledTooltipsToTableHeader() {
  const table = document.querySelector("#results table");
  if (!table) return;

  const thead = table.querySelector("thead");
  if (!thead) return;

  const headers = thead.querySelectorAll("th");
  const tooltips = [
    "Add features that are important to you, i.e. Amazon reviews, Battery life, etc.",
    "How important is this feature to you?",
    "Is a higher or lower score more desireable, i.e. lower price, higher battery life, etc."
  ];

  headers.forEach((th, index) => {
    if (index < 3 && !th.querySelector(".tooltip-container")) {
      const text = th.textContent.trim();

      th.innerHTML = `
        <div class="relative group tooltip-container inline-block cursor-help">
          <span>${text}</span>

          <!-- Tooltip Box -->
          <div class="w-[150px] tooltip absolute left-1/2 transform -translate-x-1/2 mt-2 hidden group-hover:block bg-[#452993] text-white text-[10px] rounded-[5px] py-1.5 px-3 z-50 shadow-lg">
            ${tooltips[index]}
            <div class="tooltip-arrow absolute left-1/2 -translate-x-1/2 top-0 -mt-1 w-2 h-2 bg-[#452993] rotate-45"></div>
          </div>
        </div>
      `;
    }
  });
}

const resultsDiv = document.getElementById("results");
let lastQuery = "";

// Reusable search function
async function handleSearch(queryInputId, mode) {
  const queryInput = document.getElementById(queryInputId);
  const query = queryInput.value.trim();

  if (!query) {
    resultsDiv.innerHTML = "<p class='text-red-500'>⚠️ Please enter a product to search.</p>";
    return;
  }

  lastQuery = query;

  if (mode === "loader") {
    document.getElementById("search_loader").classList.remove("hidden");
  }

  if (mode === "overlay") {
    showOverlay();
  }
  
  try {
    const res = await fetch("/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    console.log("initial data", data);
    allProducts = data.products;   // store all products

    document.getElementById("search_loader").classList.remove("hidden");
    hideOverlay();
    document.getElementById("search-form-section").classList.add("hidden");
    document.getElementById("search-result-section").classList.remove("hidden");

    // Update both query input fields with the searched term
    document.getElementById("queryInput").value = query;
    document.getElementById("queryInput2").value = query;

    if (data.tablePart && data.analysisPart) {
      resultsDiv.innerHTML = `<div class="overflow-x-auto">${marked.parse(data.tablePart)}</div>`;

      const table = document.querySelector("#results table");
      const rows = table.querySelectorAll("tbody tr");

      rows.forEach((row, i) => {
        if (i < 0 || row.id === "addAttributeRow") return;

        const productCells = Array.from(row.cells).slice(3);
        productCells.forEach(td => {
          const raw = td.innerText.trim();
          td.innerHTML = buildScoreCellHTML(raw, 10);
          td.setAttribute("data-raw", raw);
          td.setAttribute("data-score", 10);
        });
      });

      addAttributeRow();
      addEditButtons(1);
      addDeleteButtons();
      addCompareDropdowns();
      recomputeScores(1);
      addColumnDeleteButtons();
      updateFooterTotals();
      appendNewSubColRow({ products: allProducts });
      addStyledTooltipsToTableHeader();
    }
    document.getElementById("surveyButtonContainer").classList.remove("hidden"); // ✅ show survey button



  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = "<p class='text-red-500'>⚠️ Error fetching results.</p>";
  }
}

// Attach event listeners for both inputs
const queryInput = document.getElementById('queryInput');
const queryInput2 = document.getElementById('queryInput2');

document.getElementById("searchBtn").addEventListener("click", () => handleSearch("queryInput", "loader"));
document.getElementById("searchBtn2").addEventListener("click", () => handleSearch("queryInput2", "overlay"));

function addCompareDropdowns() {
  const table = document.querySelector("#results table");
  const tbody = table.querySelector("tbody");

  for (let row of tbody.rows) {
    const compareCell = row.cells[2];
    if (!compareCell) continue;

    // Only modify if not already initialized
    if (!compareCell.querySelector(".compare-select")) {
      const currentValue = compareCell.textContent.trim();

      compareCell.innerHTML = `
        <div class="flex space-y-1">
          <div class="custom-select-wrapper">
            <select class="compare-select" onchange="handleCompareChange(this)">
              <option value="higher" ${/higher/i.test(currentValue) ? "selected" : ""}>Higher is better</option>
              <option value="lower" ${/lower/i.test(currentValue) ? "selected" : ""}>Lower is better</option>
            </select>
          </div>
          <input 
            type="number" 
            class="score-input ml-2"
            value="10" 
            min="0" max="10"
            oninput="handleScoreChange(this)" 
            onblur="finalizeScore(this)"
          />
        </div>
      `;
    }
  }

  // Recompute when dropdowns change
  document.querySelectorAll(".compare-select, .score-input").forEach(sel => {
    sel.addEventListener("change", () => {
      recomputeScores();
    });
  });
}

function handleCompareChange(selectElement) {
  const container = selectElement.closest('.flex');
  const scoreInput = container.querySelector('.score-input');
  
  if (selectElement.value === 'higher') {
    scoreInput.value = 10;
  } else if (selectElement.value === 'lower') {
    scoreInput.value = 1;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.compare-select').forEach(select => {
    handleCompareChange(select);
  });
});

document.addEventListener("change", (e) => {
  if (e.target && e.target.classList.contains("compare-select")) {
    recomputeScores();
  }
});

// -------- add delete button -------- 
function addDeleteButtons() {
  const table = document.querySelector("#results table");
  if (!table) return;

  table.querySelectorAll("tr").forEach((row, i) => {
    if (i === 0 || row.id === "addAttributeRow") return;

    const cell = row.cells[0]; // attribute column
    if (!cell) return;

    // Ensure delete button exists
    if (!cell.querySelector(".delete-attr")) {
      const delBtn = document.createElement("button");
      delBtn.className = "delete-attr";
      // delBtn.textContent = "❌";

      const img = document.createElement("img");
      img.src = "./delete-icon.png";
      img.alt = "delete icon";
      img.className = "w-[24px] h-[24px] mr-[10px] inline-block";
      delBtn.appendChild(img);

      
      cell.prepend(delBtn);
    }

    // Ensure attribute text is in <span class="attr-name">
    if (!cell.querySelector(".attr-name")) {
      // Get text without icons
      let text = cell.innerText.replace("❌", "").replace("✏️", "").trim();

      // Rebuild the cell with only delete button + clean span
      const del = cell.querySelector(".delete-attr");
      cell.innerHTML = "";
      if (del) cell.appendChild(del);

      const span = document.createElement("span");
      span.className = "attr-name";
      span.textContent = text;
      cell.appendChild(span);
    }
  });
}

function addColumnDeleteButtons() {
  const table = document.querySelector("#results table");
  const firstRow = table.querySelector("thead tr"); // top header row

  // Start from 3rd index (skip Attribute, Importance, How to Compare)
  for (let i = 3; i < firstRow.cells.length; i++) {
    const th = firstRow.cells[i];

    // Avoid adding twice
    if (!th.querySelector(".col-delete-btn")) {
      const btn = document.createElement("button");
      // btn.textContent = "❌";
      btn.className = "col-delete-btn float-right";
      btn.style.cursor = "pointer";

      const img = document.createElement("img");
      img.src = "./delete-icon.png";
      img.alt = "delete icon";
      img.className = "w-[24px] h-[24px] mr-[10px] inline-block";
      btn.appendChild(img);

      btn.addEventListener("click", () => {
        deleteColumn(i);
      });

      th.appendChild(btn);
    }
  }
}

function deleteColumn(colIndex) {
  const table = document.querySelector("#results table");

  // Loop through all rows (thead + tbody + tfoot if any)
  for (let row of table.rows) {
    if (row.cells[colIndex]) {
      row.deleteCell(colIndex);
    }
  }
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-attr")) {
    console.log('delete-attr clicked');
    const row = e.target.closest("tr");
    if (row) row.remove();
    updateFooterTotals();
  }
});

// -------- Add New Product --------
document.getElementById("addProductSearchBtn").addEventListener("click", async () => {
  const newProduct = document.getElementById("newProductInput").value.trim();
  if (!newProduct) return alert("Enter product name!");

  const table = document.querySelector("#results table");
  if (!table) return alert("Please run a search first.");

  // Build attribute list from the first column of the table
  const attributes = [];
  table.querySelectorAll("tr").forEach((row, i) => {
    if (i > 0) attributes.push(row.cells[0].innerText.trim()); // skip header row
  });
  // document.getElementById("innderSearchLoader").classList.remove("hidden");
  // document.getElementById("addProductSection").classList.add("hidden");
    showOverlay();

  try {
    const res = await fetch("/addProduct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newProduct,
        existingAttributes: attributes,
        originalQuery: lastQuery,
      }),
    });

    const data = await res.json();

    if (!data || !data.products || !data.products[0] || !data.values) {
      console.error("Bad addProduct payload:", data);
      return alert("❌ Error adding new product");
    }

    const productInfo = data.products[0]; // extract the new product
    // document.getElementById("innderSearchLoader").classList.add("hidden");
      hideOverlay();

    allProducts.push(productInfo);

    const rows = table.querySelectorAll("tr");
    rows.forEach((row, i) => {
      if (i === 0) {
        // Header row → add product name
        const th = document.createElement("th");
        th.textContent = productInfo.name;
        row.appendChild(th);
      } else if (row.id !== "addAttributeRow") {

        const nameEl = row.querySelector(".attr-name");
        const cleanAttrName = nameEl ? nameEl.innerText.trim() : row.cells[0].innerText.trim();

        const td = document.createElement("td");

        const apiKey = Object.keys(data.values).find(
          k => k.replace(/[❌➕]/g, "").trim().toLowerCase() === cleanAttrName.toLowerCase()
        );

        const rawVal = apiKey ? data.values[apiKey] : "";

        td.innerHTML = buildScoreCellHTML(rawVal, 10);
        td.setAttribute("data-raw", rawVal);
        td.setAttribute("data-score", 10);
        row.appendChild(td);
      }
    });


    // After appending new product column
    addDeleteButtons();
    addColumnDeleteButtons();
    addAttributeRow();
    addEditButtons(1);
    recomputeScores();
    updateFooterTotals();
    appendNewSubColRow({ products: allProducts });

    document.getElementById("newProductInput").value = "";

  } catch (err) {
    console.error(err);
    alert("❌ Error adding new product");
  }
});

function appendNewSubColRow(data) {
  const table = document.querySelector("#results table");
  const thead = table.querySelector("thead");
  if (!table || !thead) return;

  // Remove old second row if it exists
  if (thead.rows.length > 1) {
    thead.deleteRow(1);
  }

  
  // Create fresh second header row
  const secondRow = document.createElement("tr");

  // Add 3 empty cells for Attribute, Importance, How to Compare
  secondRow.innerHTML = "<th></th><th></th><th></th>";

  // Determine how many product columns exist
  const productCount = thead.rows[0].cells.length - 3;
  console.log('productCount for sub-headers:', productCount);
  console.log('data for sub-headers:', data);
  // Build sub-headers dynamically
  for (let i = 0; i < productCount; i++) {
    const product = data.products?.[i];
    console.log('product for sub-header:', product);
    const imageHTML = product
      ? `
        <a href="${product.productUrl}" target="_blank">
          <img src="${product.imageUrl}" alt="${product.name}" 
            class="w-[126px] h-[76px] object-contain rounded-md border mx-auto" />
        </a>
      `
      : `<span class="text-gray-500 italic">No Image</span>`;

    const th = document.createElement("th");
    th.innerHTML = `
      <div class="flex flex-row items-end justify-between space-y-1">
        <div>${imageHTML}</div>

        <!-- Label + Tooltip -->
        <div class="relative group cursor-help tooltip-container">
          <span class="text-sm font-medium text-gray-700">Score (0–10)</span>

          <!-- Tooltip box -->
          <div class="tooltip absolute left-1/2 transform -translate-x-1/2 mt-2 hidden group-hover:block bg-[#452993] text-white text-[10px] rounded-[5px] py-1.5 px-3 z-50 shadow-lg w-[150px]">
            If you dissagree with how our AI scores this product, manually enter your score as needed.
            <div class="tooltip-arrow absolute left-1/2 -translate-x-1/2 top-0 -mt-1 w-2 h-2 bg-[#452993] rotate-45"></div>
          </div>
        </div>
      </div>
    `;
    secondRow.appendChild(th);
  }

  // Append the new second header row
  thead.appendChild(secondRow);
}



// -------- Add Attribute Row --------
function addAttributeRow() {
  const table = document.querySelector("#results table");
  if (!table) return;


  const row = table.insertRow(-1); // append at end
  row.id = "addAttributeRow";

  const cell = row.insertCell(0);
  console.log('table.rows[0].cells');
  console.log(table.rows[0].cells.length);

  // Initial state: just "Add Attribute" button
  cell.innerHTML = `
      <div class="flex items-center flex-col gap-2">
        <input id="newAttributeInput" type="text"
          placeholder="Enter new attribute..."
          class="p-2 rounded-lg shadow-[0_0_4px_0_#00000040] focus-within:ring-2 focus-within:ring-indigo-500 transition-all" />
        <button id="addAttributeBtn" class="bg-[#000000] w-full text-white px-[20px] py-[10px] AeonikRegular font-normal text-[15px] px-6 py-3 transition-all rounded-full flex items-center justify-center cursor-pointer">
          <img src="./add-icon.png" alt="add icon" class="w-[24px] h-[24px] mr-[10px]" />
          Add Features
        </button>
        <p id="innerAttrLoader" class="text-[#555555] hidden">⏳ Searching...</p>
      </div>
  `;
  updateFooterTotals();
}

// -------- Handle Add Attribute Action --------
document.addEventListener("click", async (e) => {
  if (e.target.id === "addAttributeBtn") {
    const newAttr = document.getElementById("newAttributeInput").value.trim();
    if (!newAttr) return alert("Enter an attribute!");

    const table = document.querySelector("#results table");
    if (!table) return;

    // ✅ Collect clean product names (strip ❌ and trim)
    const headerCells = table.rows[0].cells;
    const products = [];
    for (let i = 3; i < headerCells.length; i++) {
      const name = headerCells[i].innerText.replace("❌", "").trim();
      products.push(name);
    }

    // Show loader
    // document.getElementById("innerAttrLoader").classList.remove("hidden");
    showOverlay();

    try {
      const res = await fetch("/addAttribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newAttribute: newAttr,
          existingProducts: products,
          originalQuery: lastQuery,
        }),
      });

      const data = await res.json();
      hideOverlay();
      // Insert new row above the "add attribute" row
      const addRow = document.getElementById("addAttributeRow");
      const newRow = table.insertRow(addRow.rowIndex);

      // Attribute cell with delete button
      const attrCell = newRow.insertCell(0);
      attrCell.innerHTML = `
        <button class="mr-[10px]">
          <img src="./delete-icon.png" alt="delete icon" class="delete-attr w-[24px] h-[24px] inline-block" />
        </button>
        <span class="attr-name">${data.attribute}</span>
      `;

      // Importance input
      const impCell = newRow.insertCell(1);
      impCell.innerHTML = `
        <input type="number" value="${data.importance ?? 5}" min="1" max="10" class="w-16 border rounded p-1" />
      `;


      // How to Compare dropdown
      const howCell = newRow.insertCell(2);
      howCell.innerHTML = `
        <div class="flex space-y-1">
          <div class="custom-select-wrapper">
            <select class="compare-select" onchange="handleCompareChange(this)">
            <option value="higher" ${data.howToCompare === "Higher is better" ? "selected" : ""}>Higher is better</option>
            <option value="lower" ${data.howToCompare === "Lower is better" ? "selected" : ""}>Lower is better</option>
            </select>
          </div>
          <input 
            type="number" 
            class="score-input ml-2"
            value="10" 
            min="0" max="10"
            oninput="handleScoreChange(this)" 
            onblur="finalizeScore(this)"
          />
        </div>

        `;

      // ✅ Fill product values with correct mapping
      products.forEach(p => {
        const raw = data.values[p] ?? ""; // get exact match
        const td = newRow.insertCell(-1);
        td.innerHTML = buildScoreCellHTML(raw, "");
        td.dataset.raw = raw;
        td.dataset.score = "";
      });

      // Attach listener to dropdowns so score updates when changed
      newRow.querySelectorAll(".compare-select").forEach(sel => {
        sel.addEventListener("change", () => {
          recomputeScores();
        });
      });
      

      
      // Restore UI
      document.getElementById("newAttributeInput").classList.remove("hidden");
      document.getElementById("addAttributeBtn").classList.remove("hidden");
      document.getElementById("innerAttrLoader").classList.add("hidden");
      document.getElementById("newAttributeInput").value = "";

      // Re-append controls
      addAttributeRow();
      addEditButtons(2);
      recomputeScores();
      updateFooterTotals();

    } catch (err) {
      console.error(err);
      alert("❌ Error adding attribute");
      addAttributeRow(); // restore UI even if error
    }
  }
});


// -------- Add Edit Buttons --------
function addEditButtons(startingIndex = 1) {
  const table = document.querySelector("#results table");
  if (!table) return;

  table.querySelectorAll("tr").forEach((row, i) => {
    // ⛔ Skip both header rows + Add Attribute row
    if (i < startingIndex || row.id === "addAttributeRow") return;

    // Attribute cell (index 0)
    const attrCell = row.cells[0];
    if (attrCell) {
      if (!attrCell.querySelector(".attr-name")) {
        const text = attrCell.innerText.replace("❌", "").replace("✏️", "").trim();
        attrCell.innerHTML = `
          <button class="mr-[10px]">
            <img src="./delete-icon.png" alt="delete icon" class="delete-attr w-[24px] h-[24px] inline-block" />
          </button>
          <span class="attr-name">${text}</span>
        `;
      }
    }

    // Importance cell (index 1)
    const impCell = row.cells[1];
    if (impCell) {
      let currentVal = "5"; // default

      const existingInput = impCell.querySelector("input");
      if (existingInput) {
        currentVal = existingInput.value.trim() || "5";
      } else if (impCell.getAttribute("data-importance")) {
        currentVal = impCell.getAttribute("data-importance");
      } else if (impCell.innerText.trim() !== "") {
        currentVal = impCell.innerText.replace("✏️", "").trim();
      }

      impCell.innerHTML = buildImportanceCellHTML(currentVal);
      impCell.setAttribute("data-importance", currentVal);
    }
  });
}


// Start editing ATTRIBUTE (only swaps .attr-name span)
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-attr")) {
    const cell = e.target.closest("td");
    const span = cell.querySelector(".attr-name");
    const current = (span?.innerText || "").trim();

    const input = document.createElement("input");
    input.type = "text";
    input.value = current;
    input.className = "edit-input-attr border px-1 py-0.5 rounded text-sm w-auto";

    span.replaceWith(input);
    e.target.classList.add("hidden");

    let save = cell.querySelector(".save-attr");
    if (!save) {
      save = document.createElement("button");
      save.className = "save-attr ml-2 text-green-600 hover:text-green-800";
      save.textContent = "✔️";
      input.after(save);
    } else {
      save.classList.remove("hidden");
    }
    input.focus();
  }
});

// Save ATTRIBUTE
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("save-attr")) {
    const cell = e.target.closest("td");
    const input = cell.querySelector(".edit-input-attr");
    const newVal = (input?.value || "").trim();

    const span = document.createElement("span");
    span.className = "attr-name";
    span.textContent = newVal || ""; // allow empty if needed
    input.replaceWith(span);

    e.target.classList.add("hidden");
    const editBtn = cell.querySelector(".edit-attr");
    if (editBtn) editBtn.classList.remove("hidden");
  }
});

// Start editing IMPORTANCE (only swaps .importance-text span)
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-importance")) {
    const cell = e.target.closest("td");
    const span = cell.querySelector(".importance-text") || (() => {
      const s = document.createElement("span");
      s.className = "importance-text";
      s.textContent = cell.innerText.replace("✏️","").trim();
      cell.innerHTML = "";
      cell.appendChild(s);
      return s;
    })();

    const current = span.innerText.trim();
    const input = document.createElement("input");
    input.type = "number";
    input.value = current;
    input.min = "0";        
    input.max = "10";       
    input.maxLength = 2;    
    input.className = "edit-input-importance border px-1 py-0.5 rounded text-md text-center";

    // Prevent typing > 2 digits
    input.addEventListener("input", () => {
      if (input.value.length > 2) {
        input.value = input.value.slice(0, 2);
      }
    });

    span.replaceWith(input);
    e.target.classList.add("hidden");

    let save = cell.querySelector(".save-importance");
    if (!save) {
      save = document.createElement("button");
      save.className = "save-importance ml-2 text-green-600 hover:text-green-800";
      save.textContent = "✔️";
      input.after(save);
    } else {
      save.classList.remove("hidden");
    }
    input.focus();
  }
});

// Save IMPORTANCE
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("save-importance")) {
    const cell = e.target.closest("td");
    const input = cell.querySelector(".edit-input-importance");
    let newVal = input?.value.trim();

    // ✅ Validation
    if (!/^\d{1,2}$/.test(newVal) || Number(newVal) < 0 || Number(newVal) > 10) {
      alert("Please enter a number between 0 and 10 (max 2 digits).");
      input.focus();
      return;
    }

    const span = document.createElement("span");
    span.className = "importance-text";
    span.textContent = newVal;
    input.replaceWith(span);

    e.target.classList.add("hidden");
    const editBtn = cell.querySelector(".edit-importance");
    if (editBtn) editBtn.classList.remove("hidden");
  }
});

// ------------------------------------
// -------- Update Footer Totals --------
function updateFooterTotals() {
  const table = document.querySelector("#results table");
  if (!table) return;

  // Remove old footer if exists
  const oldFoot = table.querySelector("tfoot");
  if (oldFoot) oldFoot.remove();

  const tfoot = table.createTFoot();
  const row = tfoot.insertRow(0);

  // First 3 cols (Attribute, Importance, How-to-Compare) left empty
  for (let i = 0; i < 3; i++) {
    row.insertCell(i).textContent = "";
  }

  // Collect product scores
  const headerCells = table.rows[0].cells;
  const productCount = headerCells.length - 3; // products start from col 3
  const totals = new Array(productCount).fill(0);

  // Loop attributes (skip header + addAttributeRow)
  for (let i = 1; i < table.rows.length; i++) {
    const r = table.rows[i];
    if (r.id === "addAttributeRow") continue;

    // const importance = parseFloat(r.cells[1]?.innerText.trim()) || 0;
    const impCell = r.cells[1];
    let importance = 0;
    if (impCell) {
      const input = impCell.querySelector("input");
      if (input) {
        importance = parseFloat(input.value) || 0;
      } else {
        importance = parseFloat(impCell.getAttribute("data-importance")) || 0;
      }
    }

    for (let j = 0; j < productCount; j++) {
      const td = r.cells[j + 3];
      if (!td) continue;
      const score = parseFloat(td.getAttribute("data-score")) || 0;
      totals[j] += importance * score;
    }
  }

  // Render totals beneath each product column
  for (let j = 0; j < productCount; j++) {
    const td = row.insertCell(j + 3);
    td.textContent = totals[j].toFixed(2); // show 2 decimal places
    td.className = "font-bold text-left";
  }
}


