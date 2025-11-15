async function searchProducts() {
    const query = document.getElementById("queryInput").value;
    if (!query) return alert("Please enter a product query!");
    
    const response = await fetch("/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
    });
    
    const data = await response.json();
    document.getElementById("results").innerText = data.result;
}
