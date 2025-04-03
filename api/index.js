import express from "express";
import cors from "cors";
import multer from "multer";
import XLSX from "xlsx";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3004;
const app = express();

app.use(cors());

const upload = multer();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("server is working");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    const cleanedData = JSON.stringify(json);

    const prompt = `You are a helpful assistant. Extract the following sections from the provided CONTEXT and return a JSON object .so your response should always start with "{":

    1. **Reference Number**: Extract the reference number from the context.
    2. **Customer Name**: Extract the customer name from the context.
    3. **Location**: Extract the location from the context.

    4. **Solution BOQ (Investment plan)**: Provide as a complete JSON array with the fields:
       - Item
       - Qty
       - Unit Price
       - Total Cost (Rs.)
       - Total Tax (Rs.): NBT
       - Total Cost Social Security Levy (Rs.)
       - Total Tax (Rs.): 18% VAT
       - Total Cost with Taxes (Rs.)

    5. **Optional Items**: Provide as a complete valid JSON array with the same fields as above.

    6. **Terms & Conditions**: List them as individual points. If nested, maintain the structure. If not found, return null.

    Ensure that:
    - All rows are included, even if they have empty or missing values (use "null" for missing values).
    - Exclude headers or non-relevant fields.
    - Do not change the format or value of any data.
    - If no data is found for a section, return an empty array or null as appropriate.

    **CONTEXT:**
    ${cleanedData}

    Please provide your response as a valid JSON object only. Do not include any markdown, text formatting, or extra characters. The response should be in plain JSON format without any surrounding backticks or language identifiers.the response format is given below

  
    {
      "referenceNumber": "<Reference Number>",
      "customerName": "<Customer Name>",
      "designation": "<Designation>",
      "companyName": "<Company Name>",
      "requirements": "<Requirements>",
      "Address": "<Address>",
      "location": "<Location>",
      "ProjectScope": [summary of project scope],
      "solutionBOQ": [...],
      "optionalItems": [...],
      "termsAndConditions": [delivery period,terms of payment,validity of the offer,waranty,presventive and corrective maintenance,maintainance window,falicily requirements,complementary services,other remarks],
    }

    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const assistantResponse = response.choices[0].message.content;

    res.json(assistantResponse);
  } catch (error) {
    console.error("Error processing file:", error);
    res
      .status(500)
      .send(
        "Error processing file. Please check your file format and API setup."
      );
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
