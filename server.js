const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { DEFAULT_RATES, generateFullEstimate } = require('./estimator');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer memory storage (we don't need to persist uploaded files permanently)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path to store custom rates
const configPath = path.join(__dirname, 'config.json');

// Ensure config.json exists with defaults
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_RATES, null, 2), 'utf-8');
}

/**
 * Helper to get Gemini API client
 * Checks .env first, then request headers (which allows setting it in client UI)
 */
function getGeminiClient(req) {
  let apiKey = process.env.GEMINI_API_KEY;
  
  // Also check header in case the user specified it in the UI settings
  if (req.headers['x-gemini-key']) {
    apiKey = req.headers['x-gemini-key'];
  }
  
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  
  return new GoogleGenerativeAI(apiKey);
}

// GET pricing configuration
app.get('/api/config', (req, res) => {
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read pricing configuration', details: err.message });
  }
});

// POST pricing configuration
app.post('/api/config', (req, res) => {
  try {
    const newRates = req.body;
    // Validate schema basic structure
    if (!newRates.carcassMaterials || !newRates.doorFinishes || !newRates.benchtopMaterials || !newRates.hardware || !newRates.labor || !newRates.margins) {
      return res.status(400).json({ error: 'Invalid configuration structure' });
    }
    fs.writeFileSync(configPath, JSON.stringify(newRates, null, 2), 'utf-8');
    res.json({ message: 'Configuration saved successfully', config: newRates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save pricing configuration', details: err.message });
  }
});

// POST calculate estimate manually (for UI edits)
app.post('/api/estimate', (req, res) => {
  try {
    const { items, rates, auxiliary } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    
    // Read stored rates if none provided
    let pricingRates = rates;
    if (!pricingRates) {
      const data = fs.readFileSync(configPath, 'utf-8');
      pricingRates = JSON.parse(data);
    }

    const estimate = generateFullEstimate(items, pricingRates, auxiliary);
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: 'Estimation calculation failed', details: err.message });
  }
});

// POST upload PDF and extract joinery items
app.post('/api/extract', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Check for Gemini client
    const genAI = getGeminiClient(req);
    
    if (!genAI) {
      // Fallback/Simulation Mode: return mock items
      console.log('Gemini API key not found. Running in simulation mode.');
      const simulatedItems = generateSimulatedItemsFromText(req.file.originalname || '');
      return res.json({
        simulation: true,
        message: "Running in Simulation Mode. To use live AI extraction, provide a Gemini API Key in the settings panel or .env file.",
        items: simulatedItems
      });
    }

    // Extract raw text from PDF
    let pdfText = '';
    try {
      const data = await pdfParse(req.file.buffer);
      pdfText = data.text;
    } catch (parseErr) {
      return res.status(400).json({ error: 'Failed to parse PDF file. Ensure it is not encrypted or corrupted.', details: parseErr.message });
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ error: 'The PDF appears to have no extractable text. Scanned images are not supported yet.' });
    }

    // Call Gemini API
    // Using gemini-1.5-flash as the standard fast text model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const systemPrompt = `You are a specialist joinery estimator. Your task is to analyze the text extracted from a joinery specification, cabinet schedule, or kitchen design PDF document, and extract all cabinet and joinery units into a structured JSON array.
    
    Extract details for each cabinet or joinery item:
    - room: Name of the room (e.g., "Kitchen", "Laundry", "Pantry", "Bathroom Vanity")
    - category: The type of cabinet (strictly one of: "Base Cabinet", "Wall Cabinet", "Tall Cabinet", "Drawer Unit", "Benchtop", "Splashback", "Other")
    - description: Concise details (e.g. "Double door cabinet", "3 Drawer set", "Pantry unit with shelves")
    - width: Width of the unit in mm (integer, default to 600 if not found)
    - height: Height of the unit in mm (integer, default to 720 for base, 600 for wall, 2200 for tall if not found)
    - depth: Depth of the unit in mm (integer, default to 560 for base, 320 for wall, 580 for tall if not found)
    - qty: Quantity of this unit (integer, default to 1)
    - carcassMaterial: Standard melamine carcass type (default "Standard Melamine (White)")
    - doorFinish: Door or front finish (default "Matt Melamine")
    - benchtopMaterial: Benchtop material (default "None", or select standard if mentioned like "Laminate (Standard)" or "Standard Quartz (20mm Stone)")
    - hardwareType: Default hardware (default "Soft-Close Hinge", or "Soft-Close Drawer Runner (pair)" if category is "Drawer Unit")
    - drawerCount: Number of drawers if this is a drawer unit (default 0, or 3 if drawer unit)

    The raw text extracted from the PDF is:
    -----
    ${pdfText}
    -----
    
    You must output a JSON object containing exactly one key: "items" which is an array of the extracted joinery objects matching the schema. Do not output anything else than JSON. If no joinery items are found, return an empty array for "items".`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (jsonErr) {
      console.error("Gemini response is not valid JSON:", responseText);
      return res.status(500).json({ error: "Failed to parse Gemini structured JSON output", rawResponse: responseText });
    }

    res.json({
      simulation: false,
      items: parsedData.items || []
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal server error during PDF extraction', details: err.message });
  }
});

/**
 * Generate sensible mock items by scanning text keywords or returning default kitchen/laundry layout
 */
function generateSimulatedItemsFromText(text) {
  const normalized = text.toLowerCase();
  
  // Default fallback items (highly detailed kitchen + laundry quote)
  const defaultItems = [
    {
      id: "sim_1",
      room: "Kitchen",
      category: "Base Cabinet",
      description: "Sink Base Cabinet 2-Door",
      width: 900,
      height: 720,
      depth: 560,
      qty: 1,
      carcassMaterial: "HMR Melamine (High Moisture Resistant)",
      doorFinish: "Satin Polyurethane (Painted MDF)",
      benchtopMaterial: "None",
      hardwareType: "Soft-Close Hinge",
      drawerCount: 0
    },
    {
      id: "sim_2",
      room: "Kitchen",
      category: "Drawer Unit",
      description: "Standard 3-Drawer Cabinet",
      width: 600,
      height: 720,
      depth: 560,
      qty: 1,
      carcassMaterial: "Standard Melamine (White)",
      doorFinish: "Satin Polyurethane (Painted MDF)",
      benchtopMaterial: "None",
      hardwareType: "Soft-Close Drawer Runner (pair)",
      drawerCount: 3
    },
    {
      id: "sim_3",
      room: "Kitchen",
      category: "Tall Cabinet",
      description: "Pantry with Adjustable Shelves",
      width: 900,
      height: 2200,
      depth: 580,
      qty: 1,
      carcassMaterial: "Standard Melamine (White)",
      doorFinish: "Satin Polyurethane (Painted MDF)",
      benchtopMaterial: "None",
      hardwareType: "Soft-Close Hinge",
      drawerCount: 0
    },
    {
      id: "sim_4",
      room: "Kitchen",
      category: "Wall Cabinet",
      description: "Overhead Cabinets 2-Door",
      width: 900,
      height: 600,
      depth: 320,
      qty: 2,
      carcassMaterial: "Standard Melamine (White)",
      doorFinish: "Satin Polyurethane (Painted MDF)",
      benchtopMaterial: "None",
      hardwareType: "Soft-Close Hinge",
      drawerCount: 0
    },
    {
      id: "sim_5",
      room: "Kitchen",
      category: "Benchtop",
      description: "Engineered Stone Benchtop with sink cutout",
      width: 2400,
      height: 40,
      depth: 600,
      qty: 1,
      carcassMaterial: "Standard Melamine (White)",
      doorFinish: "Matt Melamine",
      benchtopMaterial: "Standard Quartz (20mm Stone)",
      hardwareType: "Standard Hinge",
      drawerCount: 0
    },
    {
      id: "sim_6",
      room: "Laundry",
      category: "Base Cabinet",
      description: "Washing Machine & Broom Base",
      width: 800,
      height: 720,
      depth: 560,
      qty: 1,
      carcassMaterial: "HMR Melamine (High Moisture Resistant)",
      doorFinish: "Matt Melamine",
      benchtopMaterial: "None",
      hardwareType: "Standard Hinge",
      drawerCount: 0
    },
    {
      id: "sim_7",
      room: "Laundry",
      category: "Benchtop",
      description: "Laminate Benchtop over Washer/Dryer",
      width: 1600,
      height: 38,
      depth: 600,
      qty: 1,
      carcassMaterial: "Standard Melamine (White)",
      doorFinish: "Matt Melamine",
      benchtopMaterial: "Laminate (Standard)",
      hardwareType: "Standard Hinge",
      drawerCount: 0
    }
  ];

  // Adjust mock items based on keywords detected in PDF text
  if (normalized.includes('kitchen') && !normalized.includes('laundry')) {
    return defaultItems.filter(item => item.room === "Kitchen");
  }
  if (normalized.includes('laundry') && !normalized.includes('kitchen')) {
    return defaultItems.filter(item => item.room === "Laundry");
  }
  
  return defaultItems;
}

app.listen(PORT, () => {
  console.log(`Joinery Estimator Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} in your web browser`);
});
