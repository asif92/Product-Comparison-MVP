
import 'dotenv/config';  // ✅ loads .env automatically

import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 2222;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Serve static frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// API route for product comparison
app.post("/compare", async (req, res) => {
  const { query } = req.body;

  try {
    const prompt = `
You are a smart product comparison assistant.  
    The user is searching for: "${query}".

    Your task:
    1. Select at least **3 real products** (brand + specific model) that match the intent.
       - Do NOT use placeholders like "Product A/B/C".

    2. For each product, include:
       - productName: The brand + model
       - imageUrl: A valid direct image link (from the web)
       - productUrl: The official or trusted reference/product page where you fetch complete attributes information (Amazon, official site, etc.)

    3. Build a **Markdown table** comparing the top 5 most important attributes.  
       Columns:
       - Attribute
       - Importance (1–10)
       - How to Compare
       - Then one column per product (real product names).  
       Each cell under a product column should contain **only raw values** (e.g., "16 GB", "$999", "1.2 kg").

    4. After the table, provide a short **Analysis** paragraph (3–5 sentences) summarizing which is best.

    ⚠️ IMPORTANT: Return valid JSON with the following structure:
    {
      "tablePart": "<the markdown table only>",
      "analysisPart": "<the analysis paragraph only>",
      "products": [
        {
          "name": "Apple MacBook Air M3",
          "imageUrl": <a valid direct image link from the web>,
          "productUrl": <product reference link where you fetch complete attribute>
        },
        {
          "name": "Dell XPS 13",
          "imageUrl": <a valid direct image link from the web>,
          "productUrl": <product reference link where you fetch complete attribute>
        }
      ]
    }    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" } // ensures valid JSON
    });

    const responseJson = JSON.parse(completion.choices[0].message.content);

    // ✅ Safety check: Only keep top 5 rows from the markdown table
    if (responseJson.tablePart) {
      const lines = responseJson.tablePart.split("\n");
      const header = lines[0];     // | Attribute | Importance | ...
      const divider = lines[1];    // |-----------|------------
      const rows = lines.slice(2); // rest of rows

      // Keep only top 5 attributes
      const trimmedRows = rows.slice(0, 5);

      responseJson.tablePart = [header, divider, ...trimmedRows].join("\n");
    }

    res.json(responseJson);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong!" });
  }
});

// -------- API: Add New Product Column + Updated Analysis --------
app.post("/addProduct", async (req, res) => {
  const { newProduct, existingAttributes, originalQuery } = req.body;

const prompt = `
You are a product comparison assistant.

Context:
- Original query: "${originalQuery}"
- New input: "${newProduct}"

Goal:
1. Identify a **real, specific product model** for the new input.

2. Based on:
${JSON.stringify(existingAttributes)}

   Return **raw values only** for each attribute (no commentary or units change).

3. Provide:
   - "name": The exact product name (Brand + Model)
   - "imageUrl": A direct image URL (must end in .jpg, .png, .webp, etc.)
   - "productUrl": A trusted product page (Amazon, BestBuy, official site, etc.)

4. Write a new analysis paragraph considering ALL products together.

STRICT JSON OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Brand Model Year",
      "imageUrl": "<direct image URL>",
      "productUrl": "<product page link>"
    }
  ],
  "values": {
    "<Attribute>": "<Raw Value Only>",
    "..."
  },
  "analysis": "Updated analysis paragraph..."
}
`;


  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw);

    // Ensure attributes exist
    const safeValues = {};
    for (const attr of existingAttributes) {
      safeValues[attr] =
        parsed.values && typeof parsed.values[attr] === "string"
          ? parsed.values[attr]
          : "";
    }

  res.json({
    products: parsed.products || [],
    values: safeValues,
    analysis: parsed.analysis || "",
  });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch product column" });
  }
});

// -------- API: Add New Attribute --------
app.post("/addAttribute", async (req, res) => {
  const { newAttribute, existingProducts, originalQuery } = req.body;

  const prompt = `
You are a product comparison assistant.

Context:
- Original query: "${originalQuery}"
- New attribute requested: "${newAttribute}"
- Existing products: ${JSON.stringify(existingProducts)}

Goal:
1. For "${newAttribute}", provide:
   - "Importance (1–10)" rating of how critical this attribute is for decision making.
   - "How to Compare" — short guidance (e.g. "Higher is better", "Lower is better", "Aluminum > Plastic").
   - Values for each product in the list.

2. If an attribute does not apply to a product, leave its value blank.

STRICT OUTPUT FORMAT (JSON only):
{
  "attribute": "${newAttribute}",
  "importance": "number 1–10",
  "howToCompare": "short guidance",
  "values": {
    "Product 1": "value",
    "Product 2": "value",
    "Product 3": "value",
    ...
  }
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch attribute row" });
  }
});




app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});