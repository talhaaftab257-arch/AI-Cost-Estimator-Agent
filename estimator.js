/**
 * AeroCraft 3D: Intelligent Joinery Estimation Suite - Core Engine
 */

const DEFAULT_RATES = {
  carcassMaterials: {
    "Standard Melamine (White)": 25.00,
    "HMR Melamine (High Moisture Resistant)": 35.00,
    "Black Melamine": 40.00,
    "Birch Plywood": 55.00
  },
  doorFinishes: {
    "Matt Melamine": 45.00,
    "Textured Melamine": 55.00,
    "Thermolaminated (Vinyl Wrap)": 85.00,
    "Satin Polyurethane (Painted MDF)": 140.00,
    "Gloss Polyurethane (Painted MDF)": 160.00,
    "Natural Timber Veneer": 190.00
  },
  benchtopMaterials: {
    "None": 0.00,
    "Laminate (Standard)": 120.00,
    "Acrylic Solid Surface": 450.00,
    "Standard Quartz (20mm Stone)": 650.00,
    "Premium Quartz (40mm Stone)": 950.00,
    "Natural Marble/Granite": 1400.00
  },
  hardware: {
    "Standard Hinge": 8.00,
    "Soft-Close Hinge": 15.00,
    "Standard Drawer Runner (pair)": 25.00,
    "Soft-Close Drawer Runner (pair)": 50.00,
    "Push-to-Open Runner (pair)": 60.00,
    "Standard Handle": 7.00,
    "Designer Handle": 18.00,
    "Integrated Gola Profile (per m)": 35.00
  },
  labor: {
    "hourlyRate": 75.00,
    "installRate": 85.00
  },
  margins: {
    "overhead": 15.00,
    "profit": 20.00,
    "tax": 10.00,
    "wastage": 15.00
  }
};

function estimateItem(item, rates = DEFAULT_RATES) {
  const W = Number(item.width) || 0;
  const H = Number(item.height) || 0;
  const D = Number(item.depth) || 0;
  const Qty = Number(item.qty) || 1;
  const category = (item.category || '').toLowerCase();

  const wM = W / 1000;
  const hM = H / 1000;
  const dM = D / 1000;

  const wastagePct = Number(rates.margins.wastage !== undefined ? rates.margins.wastage : 15);
  const wastageCoeff = 1 + (wastagePct / 100);

  // Size complexity factor — scales labor with actual cabinet panel face area
  const faceAreaSqM = wM * hM;
  const baseReferenceArea = 0.432; // 600W x 720H reference
  const complexityFactor = Math.max(0.5, Math.min(3.0, faceAreaSqM / baseReferenceArea));

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
  const carcassMaterialCost = carcassAreaSqM * carcassUnitPriceSqM * Qty * wastageCoeff;

  // 2. Door/Front Material Area — splashbacks use door finish for surface costing
  let doorAreaSqM = wM * hM;
  if (category.includes('open shelf') || category.includes('void') || category === 'benchtop') {
    doorAreaSqM = 0;
  }

  const doorFin = item.doorFinish || "Matt Melamine";
  const doorUnitPriceSqM = rates.doorFinishes[doorFin] || rates.doorFinishes["Matt Melamine"] || 0;
  const doorMaterialCost = doorAreaSqM * doorUnitPriceSqM * Qty * wastageCoeff;

  // 3. Benchtop — FIX: applied to ANY item with benchtopMaterial set (not None)
  let benchtopCost = 0;
  const benchtopMat = item.benchtopMaterial || "None";
  if (benchtopMat !== "None") {
    const benchUnitPriceLM = rates.benchtopMaterials[benchtopMat] || 0;
    benchtopCost = wM * benchUnitPriceLM * Qty;
  }

  // 4. Hardware
  let hardwareCost = 0;
  let hingeCount = 0;
  let runnerCount = 0;
  let handleCount = 0;

  const hardwareType = item.hardwareType || "Soft-Close Hinge";
  const hingePrice = rates.hardware[hardwareType.includes('Hinge') ? hardwareType : "Soft-Close Hinge"] || 15.00;
  const runnerPrice = rates.hardware[hardwareType.includes('Runner') ? hardwareType : "Soft-Close Drawer Runner (pair)"] || 50.00;
  const handlePrice = rates.hardware["Standard Handle"] || 7.00;

  if (category.includes('drawer')) {
    const numDrawers = item.drawerCount || 3;
    runnerCount = numDrawers;
    handleCount = numDrawers;
  } else if (category === 'benchtop' || category === 'splashback') {
    hingeCount = 0; runnerCount = 0; handleCount = 0;
  } else {
    const numDoors = W > 600 ? 2 : 1;
    hingeCount = numDoors * (H > 1600 ? 4 : (H > 1000 ? 3 : 2));
    handleCount = numDoors;
  }

  hardwareCost = ((hingeCount * hingePrice) + (runnerCount * runnerPrice) + (handleCount * handlePrice)) * Qty;

  // 5. Labor Hour Splits — scaled by complexity factor
  let cuttingHours = 0.3;
  let edgingHours = 0.2;
  let assemblyHours = 0.5;
  let installHours = 0.5;

  if (category.includes('tall') || category.includes('pantry')) {
    cuttingHours = 0.8; edgingHours = 0.6; assemblyHours = 1.6; installHours = 1.5;
  } else if (category.includes('drawer')) {
    cuttingHours = 0.7; edgingHours = 0.5; assemblyHours = 1.3; installHours = 1.0;
  } else if (category.includes('wall') || category.includes('overhead')) {
    cuttingHours = 0.4; edgingHours = 0.3; assemblyHours = 0.8; installHours = 1.2;
  } else if (category.includes('base') || category.includes('vanity')) {
    cuttingHours = 0.4; edgingHours = 0.3; assemblyHours = 0.8; installHours = 1.0;
  } else if (category === 'benchtop') {
    cuttingHours = 0.2; edgingHours = 0.1; assemblyHours = 0.2; installHours = 1.5;
  } else if (category === 'splashback') {
    cuttingHours = 0.1; edgingHours = 0.0; assemblyHours = 0.1; installHours = 1.0;
  }

  // Scale shop hours by complexity; install scales mildly
  const sCutting = cuttingHours * complexityFactor;
  const sEdging = edgingHours * complexityFactor;
  const sAssembly = assemblyHours * complexityFactor;
  const sInstall = installHours * (1 + (complexityFactor - 1) * 0.6);

  const laborShopRate = rates.labor.hourlyRate || 75.00;
  const laborSiteRate = rates.labor.installRate || 85.00;

  const shopHours = (sCutting + sEdging + sAssembly) * Qty;
  const siteHours = sInstall * Qty;
  const totalLaborCost = (shopHours * laborShopRate) + (siteHours * laborSiteRate);

  const subtotalDirectCosts = carcassMaterialCost + doorMaterialCost + benchtopCost + hardwareCost + totalLaborCost;

  return {
    dimensions: `${W}W x ${H}H x ${D}D`,
    qty: Qty,
    complexityFactor: parseFloat(complexityFactor.toFixed(2)),
    breakdown: {
      carcassMaterial: parseFloat(carcassMaterialCost.toFixed(2)),
      doorMaterial: parseFloat(doorMaterialCost.toFixed(2)),
      benchtop: parseFloat(benchtopCost.toFixed(2)),
      hardware: parseFloat(hardwareCost.toFixed(2)),
      labor: parseFloat(totalLaborCost.toFixed(2)),
      laborHours: {
        cutting: parseFloat((sCutting * Qty).toFixed(2)),
        edging: parseFloat((sEdging * Qty).toFixed(2)),
        assembly: parseFloat((sAssembly * Qty).toFixed(2)),
        install: parseFloat((sInstall * Qty).toFixed(2))
      },
      directSubtotal: parseFloat(subtotalDirectCosts.toFixed(2))
    }
  };
}

function generateFullEstimate(items, rates = DEFAULT_RATES, auxiliary = {}) {
  const auxAppliances = Number(auxiliary.appliances) || 0;
  const auxDelivery = Number(auxiliary.delivery) || 0;
  const auxServices = Number(auxiliary.services) || 0;
  const contingencyPct = Number(auxiliary.contingency) || 0;
  const discountPct = Number(auxiliary.discountPct) || 0;

  const detailedItems = items.map((item, index) => {
    const est = estimateItem(item, rates);
    const directSubtotal = est.breakdown.directSubtotal;

    const overheadPct = (rates.margins.overhead || 15) / 100;
    const overheadCost = directSubtotal * overheadPct;
    const subtotalWithOverhead = directSubtotal + overheadCost;

    const profitPct = (rates.margins.profit || 20) / 100;
    const profitCost = subtotalWithOverhead * profitPct;
    const priceBeforeDiscount = subtotalWithOverhead + profitCost;

    const discountAmount = priceBeforeDiscount * (discountPct / 100);
    const priceAfterDiscount = priceBeforeDiscount - discountAmount;

    const taxPct = (rates.margins.tax || 10) / 100;
    const taxCost = priceAfterDiscount * taxPct;
    const finalPrice = priceAfterDiscount + taxCost;

    est.breakdown.overhead = parseFloat(overheadCost.toFixed(2));
    est.breakdown.profit = parseFloat(profitCost.toFixed(2));
    est.breakdown.discount = parseFloat(discountAmount.toFixed(2));
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

  let totalCarcass = 0, totalDoors = 0, totalBenchtop = 0, totalHardware = 0;
  let totalLabor = 0, totalDirect = 0, totalOverhead = 0, totalProfit = 0;
  let totalDiscount = 0, totalTax = 0, totalFinal = 0;
  let hoursCutting = 0, hoursEdging = 0, hoursAssembly = 0, hoursInstall = 0;
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
    totalDiscount += br.discount;
    totalTax += br.tax;
    totalFinal += item.pricing.finalPrice;
    hoursCutting += br.laborHours.cutting;
    hoursEdging += br.laborHours.edging;
    hoursAssembly += br.laborHours.assembly;
    hoursInstall += br.laborHours.install;

    const room = item.room || 'General';
    if (!roomTotals[room]) {
      roomTotals[room] = { materials: 0, hardware: 0, benchtop: 0, labor: 0, subtotal: 0, final: 0, unitsCount: 0 };
    }
    roomTotals[room].materials += br.carcassMaterial + br.doorMaterial;
    roomTotals[room].hardware += br.hardware;
    roomTotals[room].benchtop += br.benchtop;
    roomTotals[room].labor += br.labor;
    roomTotals[room].subtotal += br.directSubtotal;
    roomTotals[room].final += item.pricing.finalPrice;
    roomTotals[room].unitsCount += item.qty;
  });

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

  const contingencyAmount = totalDirect * (contingencyPct / 100);
  const flatAuxTotal = auxAppliances + auxDelivery + auxServices + contingencyAmount;
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
    discount: parseFloat(totalDiscount.toFixed(2)),
    tax: parseFloat(totalTax.toFixed(2)),
    auxiliary: {
      appliances: auxAppliances,
      delivery: auxDelivery,
      services: auxServices,
      contingency: parseFloat(contingencyAmount.toFixed(2)),
      contingencyPct: contingencyPct,
      total: parseFloat(flatAuxTotal.toFixed(2))
    },
    discountPct: discountPct,
    laborHours: {
      cutting: parseFloat(hoursCutting.toFixed(2)),
      edging: parseFloat(hoursEdging.toFixed(2)),
      assembly: parseFloat(hoursAssembly.toFixed(2)),
      install: parseFloat(hoursInstall.toFixed(2)),
      total: parseFloat((hoursCutting + hoursEdging + hoursAssembly + hoursInstall).toFixed(2))
    },
    finalPrice: parseFloat(finalPriceWithAux.toFixed(2))
  };

  return { items: detailedItems, totals, roomTotals, rates };
}

module.exports = { DEFAULT_RATES, estimateItem, generateFullEstimate };
