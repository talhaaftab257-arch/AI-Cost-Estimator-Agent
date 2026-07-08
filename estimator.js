/**
 * AeroCraft 3D: Intelligent Joinery Estimation Suite - Core Engine
 */

const DEFAULT_RATES = {
  carcassMaterials: {
    "Standard Melamine (White)": 25.00, // per sqm
    "HMR Melamine (High Moisture Resistant)": 35.00,
    "Black Melamine": 40.00,
    "Birch Plywood": 55.00
  },
  doorFinishes: {
    "Matt Melamine": 45.00, // per sqm
    "Textured Melamine": 55.00,
    "Thermolaminated (Vinyl Wrap)": 85.00,
    "Satin Polyurethane (Painted MDF)": 140.00,
    "Gloss Polyurethane (Painted MDF)": 160.00,
    "Natural Timber Veneer": 190.00
  },
  benchtopMaterials: {
    "None": 0.00,
    "Laminate (Standard)": 120.00, // per linear meter
    "Acrylic Solid Surface": 450.00,
    "Standard Quartz (20mm Stone)": 650.00,
    "Premium Quartz (40mm Stone)": 950.00,
    "Natural Marble/Granite": 1400.00
  },
  hardware: {
    "Standard Hinge": 8.00, // per piece
    "Soft-Close Hinge": 15.00,
    "Standard Drawer Runner (pair)": 25.00,
    "Soft-Close Drawer Runner (pair)": 50.00,
    "Push-to-Open Runner (pair)": 60.00,
    "Standard Handle": 7.00,
    "Designer Handle": 18.00,
    "Integrated Gola Profile (per m)": 35.00
  },
  labor: {
    "hourlyRate": 75.00, // shop rate
    "installRate": 85.00 // installer rate
  },
  margins: {
    "overhead": 15.00, // % markup
    "profit": 20.00,   // % markup
    "tax": 10.00,      // % GST/VAT
    "wastage": 15.00   // % panel offcut wastage
  }
};

/**
 * Estimate the cost of a single joinery item with advanced labor splits and panel wastage factors
 */
function estimateItem(item, rates = DEFAULT_RATES) {
  const W = Number(item.width) || 0; // mm
  const H = Number(item.height) || 0; // mm
  const D = Number(item.depth) || 0; // mm
  const Qty = Number(item.qty) || 1;
  const category = (item.category || '').toLowerCase();

  // Convert dimensions to meters
  const wM = W / 1000;
  const hM = H / 1000;
  const dM = D / 1000;

  // Wastage multiplier (e.g. 15% wastage -> 1.15 multiplier)
  const wastagePct = Number(rates.margins.wastage !== undefined ? rates.margins.wastage : 15);
  const wastageCoeff = 1 + (wastagePct / 100);

  // 1. Carcass Material Area
  let carcassAreaSqM = 0;
  let shelfCount = 0;

  if (category.includes('wall') || category.includes('overhead')) {
    shelfCount = 2;
  } else if (category.includes('tall') || category.includes('pantry') || category.includes('wardrobe')) {
    shelfCount = 4;
  } else if (category.includes('base') || category.includes('sink') || category.includes('vanity')) {
    shelfCount = 1;
  } else if (category.includes('drawer')) {
    shelfCount = 1;
  }

  const sidesArea = 2 * (hM * dM);
  const topBottomArea = 2 * (wM * dM);
  const backArea = wM * hM;
  const shelvesArea = shelfCount * (wM * dM);

  carcassAreaSqM = sidesArea + topBottomArea + backArea + shelvesArea;
  
  if (category === 'benchtop' || category === 'splashback') {
    carcassAreaSqM = 0;
  }

  const carcassMat = item.carcassMaterial || "Standard Melamine (White)";
  const carcassUnitPriceSqM = rates.carcassMaterials[carcassMat] || rates.carcassMaterials["Standard Melamine (White)"] || 0;
  
  // Apply wastage factor to carcass sheet calculation
  const carcassMaterialCost = carcassAreaSqM * carcassUnitPriceSqM * Qty * wastageCoeff;

  // 2. Door/Front Material Area
  let doorAreaSqM = wM * hM;
  if (category === 'benchtop' || category === 'splashback' || category.includes('open shelf') || category.includes('void')) {
    doorAreaSqM = 0;
  }

  const doorFin = item.doorFinish || "Matt Melamine";
  const doorUnitPriceSqM = rates.doorFinishes[doorFin] || rates.doorFinishes["Matt Melamine"] || 0;
  
  // Apply wastage factor to doors panel calculation
  const doorMaterialCost = doorAreaSqM * doorUnitPriceSqM * Qty * wastageCoeff;

  // 3. Benchtop linear length
  let benchtopCost = 0;
  const benchtopMat = item.benchtopMaterial || "None";
  if (benchtopMat !== "None" && (category.includes('benchtop') || item.includesBenchtop)) {
    const benchUnitPriceLM = rates.benchtopMaterials[benchtopMat] || 0;
    benchtopCost = wM * benchUnitPriceLM * Qty;
  }

  // 4. Hardware
  let hardwareCost = 0;
  let hingeCount = 0;
  let runnerCount = 0;
  let handleCount = 0;

  const hardwareType = item.hardwareType || "Soft-Close Hinge";
  const hingePrice = rates.hardware["Soft-Close Hinge"] || 15.00;
  const runnerPrice = rates.hardware[hardwareType.includes('Runner') ? hardwareType : "Soft-Close Drawer Runner (pair)"] || 50.00;
  const handlePrice = rates.hardware["Standard Handle"] || 7.00;

  if (category.includes('drawer')) {
    const numDrawers = item.drawerCount || 3;
    runnerCount = numDrawers;
    handleCount = numDrawers;
  } else if (category === 'benchtop' || category === 'splashback') {
    hingeCount = 0;
    runnerCount = 0;
    handleCount = 0;
  } else {
    const numDoors = W > 600 ? 2 : 1;
    hingeCount = numDoors * (H > 1600 ? 4 : (H > 1000 ? 3 : 2));
    handleCount = numDoors;
  }

  const hingeCostVal = hingeCount * hingePrice;
  const runnerCostVal = runnerCount * runnerPrice;
  const handleCostVal = handleCount * handlePrice;
  
  hardwareCost = (hingeCostVal + runnerCostVal + handleCostVal) * Qty;

  // 5. Labor Hour Splits
  let cuttingHours = 0.3;
  let edgingHours = 0.2;
  let assemblyHours = 0.5;
  let installHours = 0.5;

  if (category.includes('tall') || category.includes('pantry')) {
    cuttingHours = 0.8;
    edgingHours = 0.6;
    assemblyHours = 1.6;
    installHours = 1.5;
  } else if (category.includes('drawer')) {
    cuttingHours = 0.7;
    edgingHours = 0.5;
    assemblyHours = 1.3;
    installHours = 1.0;
  } else if (category.includes('wall') || category.includes('overhead')) {
    cuttingHours = 0.4;
    edgingHours = 0.3;
    assemblyHours = 0.8;
    installHours = 1.2;
  } else if (category.includes('base') || category.includes('vanity')) {
    cuttingHours = 0.4;
    edgingHours = 0.3;
    assemblyHours = 0.8;
    installHours = 1.0;
  } else if (category === 'benchtop') {
    cuttingHours = 0.2;
    edgingHours = 0.1;
    assemblyHours = 0.2;
    installHours = 1.5;
  } else if (category === 'splashback') {
    cuttingHours = 0.1;
    edgingHours = 0.0;
    assemblyHours = 0.1;
    installHours = 1.0;
  }

  const laborShopRate = rates.labor.hourlyRate || 75.00;
  const laborSiteRate = rates.labor.installRate || 85.00;

  const shopHours = (cuttingHours + edgingHours + assemblyHours) * Qty;
  const siteHours = installHours * Qty;

  const shopLaborCost = shopHours * laborShopRate;
  const installLaborCost = siteHours * laborSiteRate;
  const totalLaborCost = shopLaborCost + installLaborCost;

  // Direct Cost Subtotal
  const subtotalDirectCosts = carcassMaterialCost + doorMaterialCost + benchtopCost + hardwareCost + totalLaborCost;

  return {
    dimensions: `${W}W x ${H}H x ${D}D`,
    qty: Qty,
    breakdown: {
      carcassMaterial: parseFloat(carcassMaterialCost.toFixed(2)),
      doorMaterial: parseFloat(doorMaterialCost.toFixed(2)),
      benchtop: parseFloat(benchtopCost.toFixed(2)),
      hardware: parseFloat(hardwareCost.toFixed(2)),
      labor: parseFloat(totalLaborCost.toFixed(2)),
      laborHours: {
        cutting: parseFloat((cuttingHours * Qty).toFixed(2)),
        edging: parseFloat((edgingHours * Qty).toFixed(2)),
        assembly: parseFloat((assemblyHours * Qty).toFixed(2)),
        install: parseFloat((installHours * Qty).toFixed(2))
      },
      directSubtotal: parseFloat(subtotalDirectCosts.toFixed(2))
    }
  };
}

/**
 * Run a full estimation on a list of joinery items, incorporating auxiliary project costs
 */
function generateFullEstimate(items, rates = DEFAULT_RATES, auxiliary = {}) {
  const auxAppliances = Number(auxiliary.appliances) || 0;
  const auxDelivery = Number(auxiliary.delivery) || 0;
  const auxServices = Number(auxiliary.services) || 0;

  const detailedItems = items.map((item, index) => {
    const est = estimateItem(item, rates);
    
    // Apply overhead, profit and tax markups to item
    const directSubtotal = est.breakdown.directSubtotal;
    const overheadPct = (rates.margins.overhead || 15) / 100;
    const overheadCost = directSubtotal * overheadPct;
    const subtotalWithOverhead = directSubtotal + overheadCost;
    const profitPct = (rates.margins.profit || 20) / 100;
    const profitCost = subtotalWithOverhead * profitPct;
    const priceBeforeTax = subtotalWithOverhead + profitCost;
    const taxPct = (rates.margins.tax || 10) / 100;
    const taxCost = priceBeforeTax * taxPct;
    const finalPrice = priceBeforeTax + taxCost;

    // Attach prices
    est.breakdown.overhead = parseFloat(overheadCost.toFixed(2));
    est.breakdown.profit = parseFloat(profitCost.toFixed(2));
    est.breakdown.tax = parseFloat(taxCost.toFixed(2));
    est.finalPrice = parseFloat(finalPrice.toFixed(2));

    return {
      id: item.id || `item_${index + 1}`,
      room: item.room || 'General',
      category: item.category || 'Base Cabinet',
      description: item.description || `Cabinet ${index + 1}`,
      width: Number(item.width) || 600,
      height: Number(item.height) || 720,
      depth: Number(item.depth) || 560,
      qty: Number(item.qty) || 1,
      carcassMaterial: item.carcassMaterial || "Standard Melamine (White)",
      doorFinish: item.doorFinish || "Matt Melamine",
      benchtopMaterial: item.benchtopMaterial || "None",
      hardwareType: item.hardwareType || "Soft-Close Hinge",
      drawerCount: item.drawerCount || 0,
      pricing: est
    };
  });

  // Roll up totals
  let totalCarcass = 0;
  let totalDoors = 0;
  let totalBenchtop = 0;
  let totalHardware = 0;
  let totalLabor = 0;
  let totalDirect = 0;
  let totalOverhead = 0;
  let totalProfit = 0;
  let totalTax = 0;
  let totalFinal = 0;

  // Hours
  let hoursCutting = 0;
  let hoursEdging = 0;
  let hoursAssembly = 0;
  let hoursInstall = 0;

  const roomTotals = {};

  detailedItems.forEach(item => {
    const br = item.pricing.breakdown;
    totalCarcass += br.carcassMaterial;
    totalDoors += br.doorMaterial;
    totalBenchtop += br.benchtop;
    totalHardware += br.hardware;
    totalLabor += br.labor;
    totalDirect += br.directSubtotal;
    totalOverhead += br.overhead;
    totalProfit += br.profit;
    totalTax += br.tax;
    totalFinal += item.pricing.finalPrice;

    hoursCutting += br.laborHours.cutting;
    hoursEdging += br.laborHours.edging;
    hoursAssembly += br.laborHours.assembly;
    hoursInstall += br.laborHours.install;

    const room = item.room || 'General';
    if (!roomTotals[room]) {
      roomTotals[room] = {
        materials: 0,
        hardware: 0,
        benchtop: 0,
        labor: 0,
        subtotal: 0,
        final: 0,
        unitsCount: 0
      };
    }
    roomTotals[room].materials += br.carcassMaterial + br.doorMaterial;
    roomTotals[room].hardware += br.hardware;
    roomTotals[room].benchtop += br.benchtop;
    roomTotals[room].labor += br.labor;
    roomTotals[room].subtotal += br.directSubtotal;
    roomTotals[room].final += item.pricing.finalPrice;
    roomTotals[room].unitsCount += item.qty;
  });

  // Round room totals
  Object.keys(roomTotals).forEach(room => {
    const r = roomTotals[room];
    roomTotals[room] = {
      materials: parseFloat(r.materials.toFixed(2)),
      hardware: parseFloat(r.hardware.toFixed(2)),
      benchtop: parseFloat(r.benchtop.toFixed(2)),
      labor: parseFloat(r.labor.toFixed(2)),
      subtotal: parseFloat(r.subtotal.toFixed(2)),
      final: parseFloat(r.final.toFixed(2)),
      unitsCount: r.unitsCount
    };
  });

  const flatAuxTotal = auxAppliances + auxDelivery + auxServices;
  const finalPriceWithAux = totalFinal + flatAuxTotal;

  const totals = {
    carcassMaterial: parseFloat(totalCarcass.toFixed(2)),
    doorMaterial: parseFloat(totalDoors.toFixed(2)),
    materialsTotal: parseFloat((totalCarcass + totalDoors).toFixed(2)),
    benchtop: parseFloat(totalBenchtop.toFixed(2)),
    hardware: parseFloat(totalHardware.toFixed(2)),
    labor: parseFloat(totalLabor.toFixed(2)),
    directSubtotal: parseFloat(totalDirect.toFixed(2)),
    overhead: parseFloat(totalOverhead.toFixed(2)),
    profit: parseFloat(totalProfit.toFixed(2)),
    tax: parseFloat(totalTax.toFixed(2)),
    
    auxiliary: {
      appliances: auxAppliances,
      delivery: auxDelivery,
      services: auxServices,
      total: flatAuxTotal
    },

    laborHours: {
      cutting: parseFloat(hoursCutting.toFixed(2)),
      edging: parseFloat(hoursEdging.toFixed(2)),
      assembly: parseFloat(hoursAssembly.toFixed(2)),
      install: parseFloat(hoursInstall.toFixed(2)),
      total: parseFloat((hoursCutting + hoursEdging + hoursAssembly + hoursInstall).toFixed(2))
    },
    
    finalPrice: parseFloat(finalPriceWithAux.toFixed(2))
  };

  return {
    items: detailedItems,
    totals,
    roomTotals,
    rates
  };
}

module.exports = {
  DEFAULT_RATES,
  estimateItem,
  generateFullEstimate
};
