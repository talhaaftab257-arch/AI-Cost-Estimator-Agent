/**
 * AeroCraft 3D: Intelligent Joinery Estimation Suite - Enhanced Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  let appState = {
    items: [], config: {}, apiKey: '', activeTab: 'editor', theme: 'light',
    selectedItemIndex: -1, rotationY: 35, exploded: false,
    auxiliary: { appliances: 0, delivery: 0, services: 0, contingency: 0 },
    discountPct: 0,
    clientDetails: { clientName: '', projectName: '', siteAddress: '', estimatorName: '', notes: '' }
  };
  let recalcTimer = null;
  function debouncedRecalc() { clearTimeout(recalcTimer); recalcTimer = setTimeout(() => recalculateQuote(), 450); }
  let lastDirectSubtotal = 0, lastAuxTotal = 0;

  // --- ELEMENT REFS ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const themeToggle = document.getElementById('theme-toggle');
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const dropZone = document.getElementById('drop-zone');
  const pdfInput = document.getElementById('pdf-input');
  const uploadBtn = document.getElementById('upload-btn');
  const demoBtn = document.getElementById('demo-btn');
  const uploadLoader = document.getElementById('upload-loader');
  const statTotalUnits = document.getElementById('stat-total-units');
  const statRoomsCount = document.getElementById('stat-rooms-count');
  const statGrandTotal = document.getElementById('stat-grand-total');
  const scheduleBody = document.getElementById('schedule-body');
  const addRowBtn = document.getElementById('add-row-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const tierButtons = document.querySelectorAll('.btn-tier');
  const cabinetCube = document.getElementById('cabinet-cube');
  const cabinet3dScene = document.getElementById('cabinet-3d-scene');
  const btnRotateLeft = document.getElementById('btn-rotate-left');
  const btnRotateRight = document.getElementById('btn-rotate-right');
  const btnExplode = document.getElementById('btn-explode');
  const visualizerDimensionsLabel = document.getElementById('visualizer-dimensions-label');
  const visualizerStatus = document.getElementById('visualizer-status');
  const cubeFrontDoor = document.getElementById('cube-front-door');
  const cubeDrawerGroup = document.getElementById('cube-drawer-group');
  const auxAppliancesInput = document.getElementById('aux-appliances');
  const auxDeliveryInput = document.getElementById('aux-delivery');
  const auxServicesInput = document.getElementById('aux-services');
  const auxContingencyInput = document.getElementById('aux-contingency');
  const discountPctInput = document.getElementById('discount-pct-input');
  const costCarcass = document.getElementById('cost-carcass');
  const costDoors = document.getElementById('cost-doors');
  const costBenchtops = document.getElementById('cost-benchtops');
  const costHardware = document.getElementById('cost-hardware');
  const costLabor = document.getElementById('cost-labor');
  const costDirectSubtotal = document.getElementById('cost-direct-subtotal');
  const costAllowancesSum = document.getElementById('cost-allowances-sum');
  const costOverhead = document.getElementById('cost-overhead');
  const costProfit = document.getElementById('cost-profit');
  const costTax = document.getElementById('cost-tax');
  const costGrandTotalSidebar = document.getElementById('cost-grand-total-sidebar');
  const pctOverheadSpan = document.getElementById('pct-overhead');
  const pctProfitSpan = document.getElementById('pct-profit');
  const pctTaxSpan = document.getElementById('pct-tax');
  const hoursCutVal = document.getElementById('hours-cut');
  const hoursAssembleVal = document.getElementById('hours-assemble');
  const hoursInstallVal = document.getElementById('hours-install');
  const hoursTotalVal = document.getElementById('hours-total');
  const chartBarsWrapper = document.getElementById('chart-bars-wrapper');
  const cfgLaborShop = document.getElementById('cfg-labor-shop');
  const cfgLaborInstall = document.getElementById('cfg-labor-install');
  const cfgMarginOverhead = document.getElementById('cfg-margin-overhead');
  const cfgMarginProfit = document.getElementById('cfg-margin-profit');
  const cfgMarginWastage = document.getElementById('cfg-margin-wastage');
  const cfgMarginTax = document.getElementById('cfg-margin-tax');
  const saveConfigBtn = document.getElementById('save-config-btn');
  const resetConfigBtn = document.getElementById('reset-config-btn');
  const apiKeyInput = document.getElementById('api-key-input');
  const toggleKeyVisibility = document.getElementById('toggle-key-visibility');
  const saveApiKeyBtn = document.getElementById('save-api-key-btn');
  const clearApiKeyBtn = document.getElementById('clear-api-key-btn');
  const proposalModal = document.getElementById('proposal-modal');
  const printProposalBtn = document.getElementById('print-proposal-btn');
  const printExecuteBtn = document.getElementById('print-execute-btn');
  const closeProposalBtn = document.getElementById('close-proposal-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const proposalItemsBody = document.getElementById('proposal-items-body');
  const proposalDateVal = document.getElementById('proposal-date-val');
  const proposalRefVal = document.getElementById('proposal-ref-val');
  const propSubtotal = document.getElementById('prop-subtotal');
  const propAllowances = document.getElementById('prop-allowances');
  const propMarkup = document.getElementById('prop-markup');
  const propTax = document.getElementById('prop-tax');
  const propGrandTotal = document.getElementById('prop-grand-total');
  const toastContainer = document.getElementById('toast-container');
  const saveProjectBtn = document.getElementById('save-project-btn');
  const downloadJsonBtn = document.getElementById('download-json-btn');
  const importJsonInput = document.getElementById('import-json-input');
  const clientDetailsToggle = document.getElementById('client-details-toggle');
  const clientDetailsBody = document.getElementById('client-details-body');
  const clientChevron = document.getElementById('client-chevron');
  const clientNameInput = document.getElementById('client-name');
  const projectNameInput = document.getElementById('project-name');
  const siteAddressInput = document.getElementById('site-address');
  const estimatorNameInput = document.getElementById('estimator-name');
  const projectNotesInput = document.getElementById('project-notes');
  const whatifToggle = document.getElementById('whatif-toggle');
  const whatifBody = document.getElementById('whatif-body');
  const whatifChevron = document.getElementById('whatif-chevron');
  const whatifSlider = document.getElementById('whatif-slider');
  const whatifPctLabel = document.getElementById('whatif-pct-label');
  const whatifResult = document.getElementById('whatif-result');
  const contingencyRow = document.getElementById('contingency-row');
  const pctContingency = document.getElementById('pct-contingency');
  const costContingency = document.getElementById('cost-contingency');
  const discountCostRow = document.getElementById('discount-cost-row');
  const pctDiscountDisplay = document.getElementById('pct-discount-display');
  const costDiscount = document.getElementById('cost-discount');

  // --- INIT ---
  async function initializeApp() {
    lucide.createIcons();
    appState.apiKey = localStorage.getItem('gemini_api_key') || '';
    if (appState.apiKey) { apiKeyInput.value = appState.apiKey; updateStatusBadge(true); }
    else { updateStatusBadge(false); }
    appState.theme = localStorage.getItem('app_theme') || 'light';
    if (appState.theme === 'dark') { document.body.classList.remove('light-theme'); document.body.classList.add('dark-theme'); }
    else { document.body.classList.add('light-theme'); document.body.classList.remove('dark-theme'); }
    update3DVisualizerRotation();
    await fetchPricingRates();
    restoreProject();
    setupEventHandlers();
    await recalculateQuote();
    renderTable();
  }

  async function fetchPricingRates() {
    try {
      const r = await fetch('/api/config'); if (!r.ok) throw new Error('Fail');
      appState.config = await r.json(); populateRatesForm();
    } catch (e) { console.error(e); alert('Cannot connect to AeroCraft server.'); }
  }

  function updateStatusBadge(isLive) {
    statusBadge.className = isLive ? 'status-badge live' : 'status-badge simulation';
    statusText.textContent = isLive ? 'Gemini AI Active' : 'Simulation Mode';
  }

  // --- SAVE / LOAD ---
  function saveProject() {
    const d = { items: appState.items, auxiliary: appState.auxiliary, discountPct: appState.discountPct, clientDetails: appState.clientDetails, savedAt: new Date().toISOString() };
    localStorage.setItem('ac3d_project', JSON.stringify(d));
  }

  function restoreProject() {
    const s = localStorage.getItem('ac3d_project'); if (!s) return;
    try {
      const d = JSON.parse(s);
      if (d.items && d.items.length > 0) { appState.items = d.items; appState.selectedItemIndex = 0; }
      if (d.auxiliary) {
        appState.auxiliary = { ...appState.auxiliary, ...d.auxiliary };
        auxAppliancesInput.value = appState.auxiliary.appliances;
        auxDeliveryInput.value = appState.auxiliary.delivery;
        auxServicesInput.value = appState.auxiliary.services;
        auxContingencyInput.value = appState.auxiliary.contingency || 0;
      }
      if (d.discountPct !== undefined) { appState.discountPct = d.discountPct; discountPctInput.value = d.discountPct; }
      if (d.clientDetails) {
        appState.clientDetails = { ...appState.clientDetails, ...d.clientDetails };
        clientNameInput.value = appState.clientDetails.clientName || '';
        projectNameInput.value = appState.clientDetails.projectName || '';
        siteAddressInput.value = appState.clientDetails.siteAddress || '';
        estimatorNameInput.value = appState.clientDetails.estimatorName || '';
        projectNotesInput.value = appState.clientDetails.notes || '';
      }
    } catch (e) { console.warn('Restore failed:', e); }
  }

  function downloadProjectJson() {
    const d = { items: appState.items, auxiliary: appState.auxiliary, discountPct: appState.discountPct, clientDetails: appState.clientDetails, exportedAt: new Date().toISOString() };
    const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(b); const a = document.createElement('a');
    a.href = u; a.download = `AeroCraft3D_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  }

  function importProjectJson(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (!d.items || !Array.isArray(d.items)) throw new Error('Invalid file');
        appState.items = d.items; appState.selectedItemIndex = d.items.length > 0 ? 0 : -1;
        if (d.auxiliary) { appState.auxiliary = { ...appState.auxiliary, ...d.auxiliary }; auxAppliancesInput.value = appState.auxiliary.appliances; auxDeliveryInput.value = appState.auxiliary.delivery; auxServicesInput.value = appState.auxiliary.services; auxContingencyInput.value = appState.auxiliary.contingency || 0; }
        if (d.discountPct !== undefined) { appState.discountPct = d.discountPct; discountPctInput.value = d.discountPct; }
        if (d.clientDetails) { appState.clientDetails = { ...appState.clientDetails, ...d.clientDetails }; clientNameInput.value = appState.clientDetails.clientName || ''; projectNameInput.value = appState.clientDetails.projectName || ''; siteAddressInput.value = appState.clientDetails.siteAddress || ''; estimatorNameInput.value = appState.clientDetails.estimatorName || ''; projectNotesInput.value = appState.clientDetails.notes || ''; }
        tierButtons.forEach(b => b.classList.remove('active'));
        renderTable(); recalculateQuote(); update3DVisualizerModel();
        showToast('Project imported successfully.');
      } catch (err) { alert('Invalid project file: ' + err.message); }
    };
    reader.readAsText(file);
  }

  // --- TOAST ---
  function showToast(message, undoCallback, duration) {
    duration = duration || 5000;
    const t = document.createElement('div'); t.className = 'toast';
    let h = '<span>' + message + '</span>';
    if (undoCallback) h += '<button class="toast-undo-btn">Undo</button>';
    t.innerHTML = h; toastContainer.appendChild(t);
    if (undoCallback) {
      t.querySelector('.toast-undo-btn').addEventListener('click', () => {
        undoCallback(); t.classList.add('toast-exit'); setTimeout(() => t.remove(), 300);
      });
    }
    setTimeout(() => { t.classList.add('toast-exit'); setTimeout(() => t.remove(), 300); }, duration);
  }

  // --- EVENT HANDLERS ---
  function setupEventHandlers() {
    tabButtons.forEach(btn => { btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-tab'); tabButtons.forEach(b => b.classList.remove('active')); tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active'); document.getElementById('tab-' + t).classList.add('active'); appState.activeTab = t;
    }); });
    themeToggle.addEventListener('click', () => {
      if (document.body.classList.contains('light-theme')) { document.body.classList.remove('light-theme'); document.body.classList.add('dark-theme'); appState.theme = 'dark'; }
      else { document.body.classList.add('light-theme'); document.body.classList.remove('dark-theme'); appState.theme = 'light'; }
      localStorage.setItem('app_theme', appState.theme);
    });
    btnRotateLeft.addEventListener('click', () => { appState.rotationY -= 15; update3DVisualizerRotation(); });
    btnRotateRight.addEventListener('click', () => { appState.rotationY += 15; update3DVisualizerRotation(); });
    btnExplode.addEventListener('click', () => {
      appState.exploded = !appState.exploded;
      if (appState.exploded) { cabinetCube.classList.add('exploded'); btnExplode.innerHTML = '<i data-lucide="fold-horizontal"></i> Collapse'; btnExplode.classList.add('btn-primary'); btnExplode.classList.remove('btn-secondary'); }
      else { cabinetCube.classList.remove('exploded'); btnExplode.innerHTML = '<i data-lucide="unfold-horizontal"></i> Explode View'; btnExplode.classList.remove('btn-primary'); btnExplode.classList.add('btn-secondary'); }
      lucide.createIcons();
    });
    tierButtons.forEach(btn => { btn.addEventListener('click', () => {
      tierButtons.forEach(b => b.classList.remove('active')); btn.classList.add('active'); applyMaterialPresetTier(btn.getAttribute('data-tier'));
    }); });
    [auxAppliancesInput, auxDeliveryInput, auxServicesInput, auxContingencyInput].forEach(input => {
      input.addEventListener('change', () => { appState.auxiliary.appliances = Number(auxAppliancesInput.value) || 0; appState.auxiliary.delivery = Number(auxDeliveryInput.value) || 0; appState.auxiliary.services = Number(auxServicesInput.value) || 0; appState.auxiliary.contingency = Number(auxContingencyInput.value) || 0; recalculateQuote(); });
    });
    discountPctInput.addEventListener('change', () => { appState.discountPct = Math.max(0, Math.min(100, Number(discountPctInput.value) || 0)); discountPctInput.value = appState.discountPct; recalculateQuote(); });
    dropZone.addEventListener('click', () => pdfInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type === 'application/pdf') processPdfUpload(e.dataTransfer.files[0]); else alert('Please drop a valid PDF.'); });
    pdfInput.addEventListener('change', () => { if (pdfInput.files.length > 0) processPdfUpload(pdfInput.files[0]); });
    uploadBtn.addEventListener('click', () => { if (pdfInput.files.length > 0) processPdfUpload(pdfInput.files[0]); else pdfInput.click(); });
    demoBtn.addEventListener('click', async () => {
      uploadLoader.classList.remove('hidden');
      setTimeout(async () => {
        try { const r = await fetch('/api/extract', { method: 'POST', body: createMockPdfFormData() }); if (!r.ok) throw new Error('Fail'); const res = await r.json(); appState.items = res.items; appState.selectedItemIndex = 0; tierButtons.forEach(b => b.classList.remove('active')); await recalculateQuote(); renderTable(); update3DVisualizerModel(); }
        catch (e) { console.error(e); alert('Error loading demo.'); }
        finally { uploadLoader.classList.add('hidden'); }
      }, 800);
    });
    addRowBtn.addEventListener('click', () => {
      const cm = Object.keys(appState.config.carcassMaterials || {})[0] || 'Standard Melamine (White)';
      const df = Object.keys(appState.config.doorFinishes || {})[0] || 'Matt Melamine';
      const hw = Object.keys(appState.config.hardware || {})[0] || 'Soft-Close Hinge';
      appState.items.push({ id: 'manual_' + Date.now(), room: appState.items.length > 0 ? appState.items[appState.items.length - 1].room : 'Kitchen', category: 'Base Cabinet', description: 'New Cabinet Unit', width: 600, height: 720, depth: 560, qty: 1, carcassMaterial: cm, doorFinish: df, benchtopMaterial: 'None', hardwareType: hw, drawerCount: 0 });
      appState.selectedItemIndex = appState.items.length - 1; tierButtons.forEach(b => b.classList.remove('active'));
      renderTable(); recalculateQuote(); update3DVisualizerModel();
    });
    clearAllBtn.addEventListener('click', () => { if (!confirm('Clear entire schedule?')) return; appState.items = []; appState.selectedItemIndex = -1; tierButtons.forEach(b => b.classList.remove('active')); renderTable(); recalculateQuote(); update3DVisualizerModel(); });
    saveProjectBtn.addEventListener('click', () => { saveProject(); showToast('Project saved to browser.'); });
    downloadJsonBtn.addEventListener('click', downloadProjectJson);
    importJsonInput.addEventListener('change', () => { if (importJsonInput.files.length > 0) importProjectJson(importJsonInput.files[0]); importJsonInput.value = ''; });
    clientDetailsToggle.addEventListener('click', () => {
      if (clientDetailsBody.classList.contains('collapsed')) { clientDetailsBody.classList.remove('collapsed'); clientDetailsBody.classList.add('expanded'); clientChevron.style.transform = 'rotate(180deg)'; }
      else { clientDetailsBody.classList.remove('expanded'); clientDetailsBody.classList.add('collapsed'); clientChevron.style.transform = 'rotate(0deg)'; }
    });
    [clientNameInput, projectNameInput, siteAddressInput, estimatorNameInput, projectNotesInput].forEach(inp => {
      inp.addEventListener('input', () => { appState.clientDetails.clientName = clientNameInput.value; appState.clientDetails.projectName = projectNameInput.value; appState.clientDetails.siteAddress = siteAddressInput.value; appState.clientDetails.estimatorName = estimatorNameInput.value; appState.clientDetails.notes = projectNotesInput.value; });
    });
    whatifToggle.addEventListener('click', () => { whatifBody.classList.toggle('hidden'); whatifChevron.style.transform = whatifBody.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)'; });
    whatifSlider.addEventListener('input', () => { whatifPctLabel.textContent = whatifSlider.value + '%'; updateWhatIfResult(Number(whatifSlider.value)); });
    saveConfigBtn.addEventListener('click', async () => {
      try { const r = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gatherPricingConfigFromForm()) }); if (!r.ok) throw new Error('Fail'); const d = await r.json(); appState.config = d.config; showToast('Pricing rates saved.'); recalculateQuote(); }
      catch (e) { console.error(e); alert('Error saving rates.'); }
    });
    resetConfigBtn.addEventListener('click', async () => { if (!confirm('Reset to defaults?')) return; await fetchPricingRates(); showToast('Config reset.'); recalculateQuote(); });
    saveApiKeyBtn.addEventListener('click', () => { const v = apiKeyInput.value.trim(); if (!v) { alert('Enter a valid key.'); return; } appState.apiKey = v; localStorage.setItem('gemini_api_key', v); updateStatusBadge(true); showToast('API Key saved.'); });
    clearApiKeyBtn.addEventListener('click', () => { appState.apiKey = ''; localStorage.removeItem('gemini_api_key'); apiKeyInput.value = ''; updateStatusBadge(false); showToast('Key removed.'); });
    toggleKeyVisibility.addEventListener('click', () => { apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password'; lucide.createIcons(); });
    printProposalBtn.addEventListener('click', () => { if (appState.items.length === 0) { alert('No items.'); return; } proposalDateVal.textContent = new Date().toISOString().split('T')[0]; proposalRefVal.textContent = 'AG-AC-' + Math.floor(100000 + Math.random() * 900000); populateProposalDocument(); proposalModal.classList.remove('hidden'); });
    closeProposalBtn.addEventListener('click', () => proposalModal.classList.add('hidden'));
    printExecuteBtn.addEventListener('click', () => window.print());
    exportCsvBtn.addEventListener('click', () => { if (appState.items.length === 0) return alert('Nothing to export.'); exportToCsv(); });
  }

  function applyMaterialPresetTier(tier) {
    if (appState.items.length === 0) return;
    appState.items.forEach(item => {
      if (tier === 'budget') { item.carcassMaterial = 'Standard Melamine (White)'; item.doorFinish = 'Matt Melamine'; if (item.benchtopMaterial !== 'None') item.benchtopMaterial = 'Laminate (Standard)'; }
      else if (tier === 'premium') { item.carcassMaterial = 'Standard Melamine (White)'; item.doorFinish = 'Thermolaminated (Vinyl Wrap)'; if (item.benchtopMaterial !== 'None') item.benchtopMaterial = 'Standard Quartz (20mm Stone)'; }
      else if (tier === 'luxury') { item.carcassMaterial = 'Black Melamine'; item.doorFinish = 'Natural Timber Veneer'; if (item.benchtopMaterial !== 'None') item.benchtopMaterial = 'Premium Quartz (40mm Stone)'; }
    });
    recalculateQuote(); renderTable(); update3DVisualizerModel();
  }

  // --- PDF ---
  async function processPdfUpload(file) {
    uploadLoader.classList.remove('hidden');
    const fd = new FormData(); fd.append('pdf', file);
    try {
      const hd = {}; if (appState.apiKey) hd['x-gemini-key'] = appState.apiKey;
      const r = await fetch('/api/extract', { method: 'POST', headers: hd, body: fd });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Failed'); }
      const res = await r.json(); updateStatusBadge(!res.simulation);
      appState.items = res.items; appState.selectedItemIndex = appState.items.length > 0 ? 0 : -1;
      tierButtons.forEach(b => b.classList.remove('active'));
      await recalculateQuote(); renderTable(); update3DVisualizerModel();
    } catch (e) { console.error(e); alert('PDF error: ' + e.message); }
    finally { uploadLoader.classList.add('hidden'); pdfInput.value = ''; }
  }

  function createMockPdfFormData() {
    const b = new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' });
    const fd = new FormData(); fd.append('pdf', b, 'mock.pdf'); return fd;
  }

  // --- RECALCULATE ---
  async function recalculateQuote() {
    if (appState.items.length === 0) {
      lastDirectSubtotal = 0; lastAuxTotal = 0;
      renderSummary({ carcassMaterial:0,doorMaterial:0,materialsTotal:0,benchtop:0,hardware:0,labor:0,directSubtotal:0,overhead:0,profit:0,discount:0,tax:0,finalPrice:0,auxiliary:{appliances:0,delivery:0,services:0,contingency:0,total:0},laborHours:{cutting:0,edging:0,assembly:0,install:0,total:0},discountPct:0 });
      renderCharts(null); updateWhatIfResult(Number(whatifSlider.value)); return;
    }
    try {
      const r = await fetch('/api/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: appState.items, rates: appState.config, auxiliary: { ...appState.auxiliary, discountPct: appState.discountPct } }) });
      if (!r.ok) throw new Error('Calc failed');
      const est = await r.json();
      appState.items = est.items;
      lastDirectSubtotal = est.totals.directSubtotal;
      lastAuxTotal = est.totals.auxiliary ? est.totals.auxiliary.total : 0;
      renderSummary(est.totals); renderCharts(est); updateRoomSubtotalHeaders(est.roomTotals); updateItemCostCells(); updateWhatIfResult(Number(whatifSlider.value));
      saveProject();
    } catch (e) { console.error(e); }
  }

  // --- TABLE ---
  function renderTable() {
    scheduleBody.innerHTML = '';
    if (appState.items.length === 0) { scheduleBody.appendChild(createEmptyPlaceholder()); statTotalUnits.textContent = '0'; statRoomsCount.textContent = '0'; lucide.createIcons(); return; }
    const grouped = {};
    appState.items.forEach((item, idx) => { const rm = item.room || 'General'; if (!grouped[rm]) grouped[rm] = []; grouped[rm].push({ item, originalIndex: idx }); });
    const rooms = Object.keys(grouped);
    rooms.forEach(roomName => {
      const hr = document.createElement('tr'); hr.className = 'room-group-header-row';
      hr.innerHTML = '<td colspan="14"><i data-lucide="map-pin" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;display:inline-block;"></i>' + roomName + ' Room<span class="room-subtotal-badge" id="room-subtotal-badge-' + roomName.replace(/\s+/g, '-') + '"></span></td>';
      scheduleBody.appendChild(hr);
      grouped[roomName].forEach(({ item, originalIndex }) => {
        const row = document.createElement('tr'); row.className = 'cabinet-data-row';
        if (originalIndex === appState.selectedItemIndex) row.classList.add('selected-cabinet-row');
        row.addEventListener('click', (e) => {
          if (['INPUT','SELECT','BUTTON'].includes(e.target.tagName) || e.target.closest('.row-delete-btn') || e.target.closest('.btn-duplicate')) return;
          appState.selectedItemIndex = originalIndex;
          document.querySelectorAll('.cabinet-data-row').forEach(r => r.classList.remove('selected-cabinet-row'));
          row.classList.add('selected-cabinet-row'); update3DVisualizerModel();
        });
        const ac = (el) => { const td = document.createElement('td'); td.appendChild(el); row.appendChild(td); };
        ac(createTextInput(item.room, 'room', originalIndex));
        ac(createSelectInput(['Base Cabinet','Wall Cabinet','Tall Cabinet','Drawer Unit','Benchtop','Splashback','Other'], item.category, 'category', originalIndex));
        ac(createTextInput(item.description, 'description', originalIndex));
        ac(createNumberInput(item.width, 'width', originalIndex, 50, 4000));
        ac(createNumberInput(item.height, 'height', originalIndex, 50, 3000));
        ac(createNumberInput(item.depth, 'depth', originalIndex, 50, 2000));
        ac(createNumberInput(item.qty, 'qty', originalIndex, 1, 50));
        ac(createSelectInput(Object.keys(appState.config.carcassMaterials || {}), item.carcassMaterial, 'carcassMaterial', originalIndex));
        ac(createSelectInput(Object.keys(appState.config.doorFinishes || {}), item.doorFinish, 'doorFinish', originalIndex));
        ac(createSelectInput(Object.keys(appState.config.benchtopMaterials || {}), item.benchtopMaterial, 'benchtopMaterial', originalIndex));
        ac(createSelectInput(Object.keys(appState.config.hardware || {}), item.hardwareType, 'hardwareType', originalIndex));
        // Unit cost
        const uc = document.createElement('td'); uc.className = 'item-cost-cell'; uc.id = 'unit-cost-' + originalIndex;
        uc.textContent = item.pricing ? '$' + (item.pricing.finalPrice / (item.qty || 1)).toFixed(2) : '-'; row.appendChild(uc);
        // Total cost
        const tc = document.createElement('td'); tc.className = 'item-cost-cell'; tc.id = 'total-cost-' + originalIndex;
        tc.textContent = item.pricing ? '$' + item.pricing.finalPrice.toFixed(2) : '-'; row.appendChild(tc);
        // Actions
        const atd = document.createElement('td'); atd.className = 'action-cell';
        const dupB = document.createElement('button'); dupB.className = 'btn-duplicate'; dupB.title = 'Duplicate'; dupB.innerHTML = '<i data-lucide="copy"></i>';
        dupB.addEventListener('click', (e) => { e.stopPropagation(); duplicateItem(originalIndex); });
        const delB = document.createElement('button'); delB.className = 'row-delete-btn'; delB.title = 'Delete'; delB.innerHTML = '<i data-lucide="trash-2"></i>';
        delB.addEventListener('click', (e) => { e.stopPropagation(); deleteItemWithUndo(originalIndex); });
        atd.appendChild(dupB); atd.appendChild(delB); row.appendChild(atd);
        scheduleBody.appendChild(row);
      });
    });
    statRoomsCount.textContent = rooms.length;
    statTotalUnits.textContent = appState.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    lucide.createIcons();
  }

  function updateItemCostCells() {
    appState.items.forEach((item, idx) => {
      const ue = document.getElementById('unit-cost-' + idx);
      const te = document.getElementById('total-cost-' + idx);
      if (ue && item.pricing) ue.textContent = '$' + (item.pricing.finalPrice / (item.qty || 1)).toFixed(2);
      if (te && item.pricing) te.textContent = '$' + item.pricing.finalPrice.toFixed(2);
    });
  }

  function updateRoomSubtotalHeaders(roomTotals) {
    if (!roomTotals) return;
    Object.keys(roomTotals).forEach(rm => {
      const b = document.getElementById('room-subtotal-badge-' + rm.replace(/\s+/g, '-'));
      if (b) b.textContent = ' \u2014 ' + roomTotals[rm].unitsCount + ' unit(s) \u2022 $' + roomTotals[rm].final.toLocaleString(undefined, {minimumFractionDigits:2});
    });
  }

  function duplicateItem(index) {
    const clone = JSON.parse(JSON.stringify(appState.items[index]));
    clone.id = 'dup_' + Date.now(); delete clone.pricing;
    appState.items.splice(index + 1, 0, clone);
    appState.selectedItemIndex = index + 1;
    tierButtons.forEach(b => b.classList.remove('active'));
    renderTable(); recalculateQuote(); update3DVisualizerModel();
    showToast('Row duplicated.');
  }

  function deleteItemWithUndo(index) {
    const deleted = appState.items.splice(index, 1)[0];
    const di = index;
    if (appState.selectedItemIndex === index) appState.selectedItemIndex = Math.max(0, appState.items.length - 1);
    else if (appState.selectedItemIndex > index) appState.selectedItemIndex--;
    if (appState.items.length === 0) appState.selectedItemIndex = -1;
    renderTable(); recalculateQuote(); update3DVisualizerModel();
    showToast('"' + deleted.description + '" deleted.', () => {
      appState.items.splice(di, 0, deleted); appState.selectedItemIndex = di;
      renderTable(); recalculateQuote(); update3DVisualizerModel();
    });
  }

  // --- INPUT FACTORIES ---
  function createTextInput(value, field, index) {
    const i = document.createElement('input'); i.type = 'text'; i.value = value || '';
    i.addEventListener('change', (e) => { appState.items[index][field] = e.target.value; tierButtons.forEach(b => b.classList.remove('active')); if (field === 'room') renderTable(); debouncedRecalc(); if (index === appState.selectedItemIndex) update3DVisualizerModel(); });
    return i;
  }
  function createNumberInput(value, field, index, min, max) {
    const i = document.createElement('input'); i.type = 'number'; i.value = value || 0; i.min = min; i.max = max;
    i.addEventListener('change', (e) => { let v = Number(e.target.value); v = Math.max(min, Math.min(max, v)); e.target.value = v; appState.items[index][field] = v; tierButtons.forEach(b => b.classList.remove('active')); debouncedRecalc(); if (index === appState.selectedItemIndex) update3DVisualizerModel(); });
    return i;
  }
  function createSelectInput(options, selectedVal, field, index) {
    const s = document.createElement('select');
    options.forEach(opt => { const o = document.createElement('option'); o.value = opt; o.textContent = opt; if (opt === selectedVal) o.selected = true; s.appendChild(o); });
    s.addEventListener('change', (e) => {
      appState.items[index][field] = e.target.value; tierButtons.forEach(b => b.classList.remove('active'));
      if (field === 'category') {
        if (e.target.value === 'Drawer Unit') { appState.items[index].drawerCount = 3; appState.items[index].hardwareType = 'Soft-Close Drawer Runner (pair)'; } else appState.items[index].drawerCount = 0;
        if (e.target.value === 'Benchtop' && appState.items[index].benchtopMaterial === 'None') appState.items[index].benchtopMaterial = Object.keys(appState.config.benchtopMaterials)[1] || 'Laminate (Standard)';
        renderTable();
      }
      debouncedRecalc(); if (index === appState.selectedItemIndex) update3DVisualizerModel();
    });
    return s;
  }
  function createEmptyPlaceholder() {
    const tr = document.createElement('tr'); tr.id = 'empty-row-placeholder';
    tr.innerHTML = '<td colspan="14" class="empty-placeholder-td"><i data-lucide="info" class="placeholder-icon"></i><p>No items loaded. Upload PDF, click "Load Demo Spec", or add manually.</p></td>';
    return tr;
  }

  // --- RENDER SUMMARY ---
  function renderSummary(totals) {
    const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    statGrandTotal.textContent = fmt(totals.finalPrice);
    costCarcass.textContent = fmt(totals.carcassMaterial); costDoors.textContent = fmt(totals.doorMaterial);
    costBenchtops.textContent = fmt(totals.benchtop); costHardware.textContent = fmt(totals.hardware);
    costLabor.textContent = fmt(totals.labor); costDirectSubtotal.textContent = fmt(totals.directSubtotal);
    const auxFlat = totals.auxiliary ? (totals.auxiliary.appliances + totals.auxiliary.delivery + totals.auxiliary.services) : 0;
    costAllowancesSum.textContent = fmt(auxFlat);
    if (totals.auxiliary && totals.auxiliary.contingency > 0) { contingencyRow.style.display = 'flex'; pctContingency.textContent = totals.auxiliary.contingencyPct || 0; costContingency.textContent = fmt(totals.auxiliary.contingency); } else { contingencyRow.style.display = 'none'; }
    if (totals.laborHours) { hoursCutVal.textContent = totals.laborHours.cutting + 'h'; hoursAssembleVal.textContent = totals.laborHours.assembly + 'h'; hoursInstallVal.textContent = totals.laborHours.install + 'h'; hoursTotalVal.textContent = totals.laborHours.total + 'h'; }
    const mg = appState.config.margins || { overhead: 15, profit: 20, tax: 10 };
    pctOverheadSpan.textContent = mg.overhead; pctProfitSpan.textContent = mg.profit; pctTaxSpan.textContent = mg.tax;
    costOverhead.textContent = fmt(totals.overhead); costProfit.textContent = fmt(totals.profit); costTax.textContent = fmt(totals.tax);
    const disc = totals.discount || 0;
    if (disc > 0) { discountCostRow.style.display = 'flex'; pctDiscountDisplay.textContent = totals.discountPct || appState.discountPct; costDiscount.textContent = '-' + fmt(disc); } else { discountCostRow.style.display = 'none'; }
    costGrandTotalSidebar.textContent = fmt(totals.finalPrice);
  }

  // --- WHAT-IF ---
  function updateWhatIfResult(simProfit) {
    if (lastDirectSubtotal === 0) { whatifResult.textContent = '$0.00'; return; }
    const mg = appState.config.margins || { overhead: 15, tax: 10 };
    const oh = lastDirectSubtotal * (mg.overhead / 100);
    const wo = lastDirectSubtotal + oh;
    const pr = wo * (simProfit / 100);
    const bd = wo + pr;
    const da = bd * (appState.discountPct / 100);
    const ad = bd - da;
    const tx = ad * (mg.tax / 100);
    whatifResult.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ad + tx + lastAuxTotal);
  }

  // --- CHARTS ---
  function renderCharts(estimate) {
    chartBarsWrapper.innerHTML = '';
    if (!estimate || !estimate.totals || estimate.totals.finalPrice === 0) { chartBarsWrapper.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px 0;">No data</p>'; return; }
    const t = estimate.totals, d = t.directSubtotal;
    [{name:'Carcass & Doors',val:t.materialsTotal},{name:'Benchtops',val:t.benchtop},{name:'Hardware',val:t.hardware},{name:'Labor',val:t.labor}].forEach(c => {
      if (c.val === 0) return; const pct = d > 0 ? ((c.val / d) * 100).toFixed(1) : 0;
      const el = document.createElement('div'); el.className = 'chart-item';
      el.innerHTML = '<div class="chart-label-row"><span>' + c.name + '</span><span>$' + c.val.toLocaleString() + ' (' + pct + '%)</span></div><div class="chart-bar-bg"><div class="chart-bar-fill" style="width:' + pct + '%"></div></div>';
      chartBarsWrapper.appendChild(el);
    });
  }

  // --- 3D VISUALIZER ---
  function update3DVisualizerRotation() { cabinet3dScene.style.transform = 'rotateX(-20deg) rotateY(' + appState.rotationY + 'deg)'; }
  function update3DVisualizerModel() {
    const idx = appState.selectedItemIndex;
    if (idx < 0 || idx >= appState.items.length) { visualizerStatus.textContent = 'Inactive'; visualizerDimensionsLabel.textContent = 'Select a cabinet row'; cabinetCube.classList.add('hidden'); return; }
    const item = appState.items[idx]; visualizerStatus.textContent = item.room + ' Unit';
    const w = Number(item.width) || 600, h = Number(item.height) || 720, d = Number(item.depth) || 560;
    visualizerDimensionsLabel.textContent = item.category + ': ' + w + 'W x ' + h + 'H x ' + d + 'D mm';
    cabinetCube.classList.remove('hidden');
    const sf = 0.08;
    cabinetCube.style.setProperty('--cab-w', Math.max(35, Math.min(130, w * sf)) + 'px');
    cabinetCube.style.setProperty('--cab-h', Math.max(40, Math.min(180, h * sf)) + 'px');
    cabinetCube.style.setProperty('--cab-d', Math.max(35, Math.min(130, d * sf)) + 'px');
    let cc = '#eaecef'; if (item.carcassMaterial.includes('Black')) cc = '#2d3748'; else if (item.carcassMaterial.includes('Plywood')) cc = '#d7ccc8';
    cabinetCube.style.setProperty('--carcass-face-color', cc);
    let dc = '#cfd8dc', db = '#78909c'; const fin = item.doorFinish;
    if (fin.includes('Polyurethane')) { dc = '#f43f5e'; db = '#be123c'; } else if (fin.includes('Veneer')) { dc = '#8d6e63'; db = '#5d4037'; } else if (fin.includes('Melamine')) { dc = '#eaeaea'; db = '#b0bec5'; } else if (fin.includes('Vinyl') || fin.includes('Thermolaminated')) { dc = '#06b6d4'; db = '#0891b2'; }
    cabinetCube.style.setProperty('--door-face-color', dc); cabinetCube.style.setProperty('--door-border-color', db);
    if (item.category === 'Drawer Unit') { cubeFrontDoor.classList.add('hidden'); cubeDrawerGroup.classList.remove('hidden'); }
    else if (item.category === 'Benchtop') { cubeFrontDoor.classList.add('hidden'); cubeDrawerGroup.classList.add('hidden'); }
    else { cubeFrontDoor.classList.remove('hidden'); cubeDrawerGroup.classList.add('hidden'); }
  }

  // --- CONFIG FORM ---
  function populateRatesForm() {
    if (!appState.config || !appState.config.carcassMaterials) return;
    const r = appState.config;
    const cc = document.getElementById('config-carcass-container'); cc.innerHTML = ''; Object.keys(r.carcassMaterials).forEach(k => cc.appendChild(createRateRow('carcassMaterials', k, r.carcassMaterials[k], '$')));
    const dc = document.getElementById('config-door-container'); dc.innerHTML = ''; Object.keys(r.doorFinishes).forEach(k => dc.appendChild(createRateRow('doorFinishes', k, r.doorFinishes[k], '$')));
    const bc = document.getElementById('config-benchtop-container'); bc.innerHTML = ''; Object.keys(r.benchtopMaterials).forEach(k => { if (k !== 'None') bc.appendChild(createRateRow('benchtopMaterials', k, r.benchtopMaterials[k], '$')); });
    const hc = document.getElementById('config-hardware-container'); hc.innerHTML = ''; Object.keys(r.hardware).forEach(k => hc.appendChild(createRateRow('hardware', k, r.hardware[k], '$')));
    cfgLaborShop.value = r.labor.hourlyRate; cfgLaborInstall.value = r.labor.installRate;
    cfgMarginOverhead.value = r.margins.overhead; cfgMarginProfit.value = r.margins.profit;
    cfgMarginWastage.value = r.margins.wastage !== undefined ? r.margins.wastage : 15; cfgMarginTax.value = r.margins.tax;
  }
  function createRateRow(cat, key, val, sym) {
    const d = document.createElement('div'); d.className = 'config-row-item';
    d.innerHTML = '<label>' + key + '</label><div class="input-with-symbol"><span class="symbol">' + sym + '</span><input type="number" data-category="' + cat + '" data-key="' + key + '" value="' + val + '" step="0.01" min="0"></div>';
    return d;
  }
  function gatherPricingConfigFromForm() {
    const u = { carcassMaterials: {}, doorFinishes: {}, benchtopMaterials: { 'None': 0 }, hardware: {},
      labor: { hourlyRate: Number(cfgLaborShop.value) || 0, installRate: Number(cfgLaborInstall.value) || 0 },
      margins: { overhead: Number(cfgMarginOverhead.value) || 0, profit: Number(cfgMarginProfit.value) || 0, wastage: Number(cfgMarginWastage.value) || 0, tax: Number(cfgMarginTax.value) || 0 } };
    document.querySelectorAll('.config-row-item input').forEach(inp => { const c = inp.getAttribute('data-category'), k = inp.getAttribute('data-key'); if (c && k) u[c][k] = Number(inp.value) || 0; });
    return u;
  }

  // --- PROPOSAL ---
  function populateProposalDocument() {
    document.getElementById('proposal-client-name').textContent = appState.clientDetails.clientName || 'Valued Customer';
    document.getElementById('proposal-site-address').textContent = appState.clientDetails.siteAddress || '';
    document.getElementById('proposal-project-scope').textContent = appState.clientDetails.projectName || 'Custom Kitchen & Laundry Joinery';
    document.getElementById('proposal-estimator-name').textContent = appState.clientDetails.estimatorName ? 'Estimator: ' + appState.clientDetails.estimatorName : '';
    const ns = document.getElementById('proposal-notes-section'), nt = document.getElementById('proposal-notes-text');
    if (appState.clientDetails.notes) { ns.style.display = 'block'; nt.textContent = appState.clientDetails.notes; } else { ns.style.display = 'none'; }
    proposalItemsBody.innerHTML = '';
    appState.items.forEach(item => {
      const row = document.createElement('tr'); const pv = item.pricing ? item.pricing.finalPrice : 0;
      row.innerHTML = '<td>' + (item.room || 'General') + '</td><td><strong>' + (item.description || item.category) + '</strong><br><span style="font-size:11px;color:#6b7280;">Carcass: ' + item.carcassMaterial + ' | Doors: ' + item.doorFinish + (item.benchtopMaterial !== 'None' ? ' | Bench: ' + item.benchtopMaterial : '') + '</span></td><td>' + item.width + 'W x ' + item.height + 'H x ' + item.depth + 'D</td><td>' + item.qty + '</td><td>' + item.doorFinish + '</td><td class="text-right">$' + pv.toLocaleString(undefined, {minimumFractionDigits:2}) + '</td>';
      proposalItemsBody.appendChild(row);
    });
    let cd = 0, cm = 0, cdi = 0, ct = 0, cg = 0;
    appState.items.forEach(it => { if (it.pricing && it.pricing.breakdown) { const b = it.pricing.breakdown; cd += b.directSubtotal; cm += b.overhead + b.profit; cdi += b.discount || 0; ct += b.tax; cg += it.pricing.finalPrice; } });
    const auxS = appState.auxiliary.appliances + appState.auxiliary.delivery + appState.auxiliary.services;
    const contAmt = lastDirectSubtotal * (appState.auxiliary.contingency / 100);
    const invG = cg + auxS + contAmt;
    propSubtotal.textContent = '$' + cd.toLocaleString(undefined, {minimumFractionDigits:2});
    propAllowances.textContent = '$' + (auxS + contAmt).toLocaleString(undefined, {minimumFractionDigits:2});
    propMarkup.textContent = '$' + cm.toLocaleString(undefined, {minimumFractionDigits:2});
    const pdr = document.getElementById('prop-discount-row'), pd = document.getElementById('prop-discount');
    if (cdi > 0) { pdr.style.display = 'flex'; pd.textContent = '-$' + cdi.toLocaleString(undefined, {minimumFractionDigits:2}); } else { pdr.style.display = 'none'; }
    propTax.textContent = '$' + ct.toLocaleString(undefined, {minimumFractionDigits:2});
    propGrandTotal.textContent = '$' + invG.toLocaleString(undefined, {minimumFractionDigits:2});
  }

  // --- CSV ---
  function exportToCsv() {
    let csv = 'data:text/csv;charset=utf-8,Room,Category,Description,Width,Height,Depth,Qty,Carcass,Door Finish,Benchtop,Hardware,Direct,Overhead,Profit,Discount,Tax,Total\r\n';
    appState.items.forEach(it => { const p = it.pricing || { breakdown: {} }; const b = p.breakdown || {};
      csv += [it.room,it.category,it.description,it.width,it.height,it.depth,it.qty,it.carcassMaterial,it.doorFinish,it.benchtopMaterial,it.hardwareType,b.directSubtotal||0,b.overhead||0,b.profit||0,b.discount||0,b.tax||0,p.finalPrice||0].map(v => '"' + v + '"').join(',') + '\r\n';
    });
    const a = document.createElement('a'); a.href = encodeURI(csv); a.download = 'AeroCraft_Estimate_' + Date.now() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // --- RUN ---
  initializeApp();
});
