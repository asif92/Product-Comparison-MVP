// -------- Initial Search --------
// let lastQuery = ""; // store the original search query

// document.getElementById("searchBtn").addEventListener("click", () => {
//   document.getElementById("search_loader").classList.remove("hidden");
//   setTimeout(() => {
//     window.location.href = `./search-result.html`;
//   }, 2000);
// });

document.getElementById("searchForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const query = document.getElementById("searchInput").value.trim();

  if (!query) return alert("Please enter a product to compare!");

  document.getElementById("search_loader").classList.remove("hidden");
  setTimeout(() => {
    // Redirect to results page with query as URL parameter
    window.location.href = `/search-result.html?q=${encodeURIComponent(query)}`;
  }, 3000);

});

// -------- Frontend: Handle Search Result Page --------
// Get the "q" parameter from the URL
const params = new URLSearchParams(window.location.search);
const query = params.get("q");

if (!query) {
  document.getElementById("results").innerHTML = "<p>No query provided.</p>";
} else {
  document.getElementById("loading").textContent = `Comparing: ${query}...`;

    try {
    const res = await fetch("/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log("initial data", data);

    if (data.tablePart && data.analysisPart) {
      // Render table
      resultsDiv.innerHTML = `<div class="overflow-x-auto">${marked.parse(data.tablePart)}</div>`;

      const table = document.querySelector("#results table");
      const rows = table.querySelectorAll("tbody tr");

      // skip headers, only apply to product rows
      rows.forEach((row, i) => {

        if (i < 0 || row.id === "addAttributeRow") return; // just in case

        const productCells = Array.from(row.cells).slice(3); // product cols only
        productCells.forEach(td => {
          const raw = td.innerText.trim();
          td.innerHTML = buildScoreCellHTML(raw, 10); // start with default score
          td.setAttribute("data-raw", raw);
          td.setAttribute("data-score", 10);
        });
      });

      addAttributeRow();
      addEditButtons(1);
      addDeleteButtons();
      // addScoreEditButtons();
      addCompareDropdowns();
      recomputeScores(1);
      addColumnDeleteButtons();
      // deleteColumn();
      updateFooterTotals();

      appendNewSubColRow();

    }
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = "<p class='text-red-500'>⚠️ Error fetching results.</p>";
  }


}
