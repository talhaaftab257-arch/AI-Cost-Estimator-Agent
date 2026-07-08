/**
 * AeroCraft 3D: Intelligent Joinery Estimation Suite
 * Controller Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- APPLICATION STATE ---
  let appState = {
    items: [],       // Current joinery items
    config: {},      // Pricing rates configuration
    apiKey: '',      // Gemini API Key
    activeTab: 'editor',
    theme: 'light',
    selectedItemIndex: -1, 
    rotationY: 35,
    exploded: false, // 3D Exploded View toggle state
    auxiliary: {
      appliances: 0,
      delivery: 0,
      services: 0
    }
  };

  // --- HTML ELEMENT REFERENCES ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const themeToggle = document.getElementById('theme-toggle');
  
  // Status Badge
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  
  // Upload & Extraction
  const dropZone = document.getElementById('drop-zone');
  const pdfInput = document.getElementById('pdf-input');
  const uploadBtn = document.getElementById('upload-btn');
  const demoBtn = document.getElementById('demo-btn');
  const uploadLoader = document.getElementById('upload-loader');
  
  // Quick Stats
  const statTotalUnits = document.getElementById('stat-total-units');
  const statRoomsCount = document.getElementById('stat-rooms-count');
  const statGrandTotal = document.getElementById('stat-grand-total');
  
  // Table & Presets
  const scheduleTable = document.getElementById('schedule-table');
  const scheduleBody = document.getElementById('schedule-body');
  const addRowBtn = document.getElementById('add-row-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const tierButtons = document.querySelectorAll('.btn-tier');
  
  // 3D Cabinet Visualizer
  const cabinetCube = document.getElementById('cabinet-cube');
  const cabinet3dScene = document.getElementById('cabinet-3d-scene');
  const btnRotateLeft = document.getElementById('btn-rotate-left');
  const btnRotateRight = document.getElementById('btn-rotate-right');
  const btnExplode = document.getElementById('btn-explode');
  const visualizerDimensionsLabel = document.getElementById('visualizer-dimensions-label');
  const visualizerStatus = document.getElementById('visualizer-status');
  const cubeFrontDoor = document.getElementById('cube-front-door');
  const cubeDrawerGroup = document.getElementById('cube-drawer-group');

  // Allowance Inputs
  const auxAppliancesInput = document.getElementById('aux-appliances');
  const auxDeliveryInput = document.getElementById('aux-delivery');
  const auxServicesInput = document.getElementById('aux-services');
  
  // Cost Summary Sidebar
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

  // Labor Hour splits
  const hoursCutVal = document.getElementById('hours-cut');
  const hoursAssembleVal = document.getElementById('hours-assemble');
  const hoursInstallVal = document.getElementById('hours-install');
  const hoursTotalVal = document.getElementById('hours-total');
  
  // Charts
  const chartBarsWrapper = document.getElementById('chart-bars-wrapper');
  
  // Config Tab Inputs
  const configCarcassContainer = document.getElementById('config-carcass-container');
  const configDoorContainer = document.getElementById('config-door-container');
  const configBenchtopContainer = document.getElementById('config-benchtop-container');
  const configHardwareContainer = document.getElementById('config-hardware-container');
  const cfgLaborShop = document.getElementById('cfg-labor-shop');
  const cfgLaborInstall = document.getElementById('cfg-labor-install');
  const cfgMarginOverhead = document.getElementById('cfg-margin-overhead');
  const cfgMarginProfit = document.getElementById('cfg-margin-profit');
  const cfgMarginWastage = document.getElementById('cfg-margin-wastage');
  const cfgMarginTax = document.getElementById('cfg-margin-tax');
  const saveConfigBtn = document.getElementById('save-config-btn');
  const resetConfigBtn = document.getElementById('reset-config-btn');
  
  // API Key settings
  const apiKeyInput = document.getElementById('api-key-input');
  const toggleKeyVisibility = document.getElementById('toggle-key-visibility');
  const saveApiKeyBtn = document.getElementById('save-api-key-btn');
  const clearApiKeyBtn = document.getElementById('clear-api-key-btn');
  
  // Proposal Modal
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

  // --- INITIALIZATION ---
  async function initializeApp() {
    lucide.createIcons();
    
    appState.apiKey = localStorage.getItem('gemini_api_key') || '';
    if (appState.apiKey) {
      apiKeyInput.value = appState.apiKey;
      updateStatusBadge(true);
    } else {
      updateStatusBadge(false);
    }
    
    appState.theme = localStorage.getItem('app_theme') || 'light';
    if (appState.theme === 'dark') {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }

    update3DVisualizerRotation();
    await fetchPricingRates();
    setupEventHandlers();

    await recalculateQuote();
    renderTable();
  }

  async function fetchPricingRates() {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to load configuration');
      appState.config = await response.json();
      populateRatesForm();
    } catch (err) {
      console.error(err);
      alert('Could not connect to the AeroCraft server. Ensure server.js is running.');
    }
  }

  function updateStatusBadge(isLive) {
    if (isLive) {
      statusBadge.className = 'status-badge live';
      statusText.textContent = 'Gemini AI Active';
    } else {
      statusBadge.className = 'status-badge simulation';
      statusText.textContent = 'Simulation Mode';
    }
  }

  // --- EVENT HANDLERS ---
  function setupEventHandlers() {
    // Navigation Tabs
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${targetTab}`).classList.add('active');
        appState.activeTab = targetTab;
      });
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
      if (document.body.classList.contains('light-theme')) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        appState.theme = 'dark';
      } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        appState.theme = 'light';
      }
      localStorage.setItem('app_theme', appState.theme);
    });

    // Rotation controls for 3D visualizer
    btnRotateLeft.addEventListener('click', () => {
      appState.rotationY -= 15;
      update3DVisualizerRotation();
    });

    btnRotateRight.addEventListener('click', () => {
      appState.rotationY += 15;
      update3DVisualizerRotation();
    });

    // 3D Explode View Toggle
    btnExplode.addEventListener('click', () => {
      appState.exploded = !appState.exploded;
      if (appState.exploded) {
        cabinetCube.classList.add('exploded');
        btnExplode.innerHTML = '<i data-lucide="fold-horizontal"></i> Collapse View';
        btnExplode.classList.add('btn-primary');
        btnExplode.classList.remove('btn-secondary');
      } else {
        cabinetCube.classList.remove('exploded');
        btnExplode.innerHTML = '<i data-lucide="unfold-horizontal"></i> Explode View';
        btnExplode.classList.remove('btn-primary');
        btnExplode.classList.add('btn-secondary');
      }
      lucide.createIcons();
    });

    // Preset Material Tiers swapper logic
    tierButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tier = btn.getAttribute('data-tier');
        
        tierButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        applyMaterialPresetTier(tier);
      });
    });

    // Allowance inputs
    [auxAppliancesInput, auxDeliveryInput, auxServicesInput].forEach(input => {
      input.addEventListener('change', () => {
        appState.auxiliary.appliances = Number(auxAppliancesInput.value) || 0;
        appState.auxiliary.delivery = Number(auxDeliveryInput.value) || 0;
        appState.auxiliary.services = Number(auxServicesInput.value) || 0;
        recalculateQuote();
      });
    });

    // PDF Drag and Drop
    dropZone.addEventListener('click', () => pdfInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type === 'application/pdf') {
        processPdfUpload(files[0]);
      } else {
        alert('Please drop a valid PDF file.');
      }
    });
    pdfInput.addEventListener('change', () => {
      if (pdfInput.files.length > 0) {
        processPdfUpload(pdfInput.files[0]);
      }
    });
    uploadBtn.addEventListener('click', () => {
      if (pdfInput.files.length > 0) {
        processPdfUpload(pdfInput.files[0]);
      } else {
        pdfInput.click();
      }
    });

    // Load Demo Spec
    demoBtn.addEventListener('click', async () => {
      uploadLoader.classList.remove('hidden');
      setTimeout(async () => {
        try {
          const response = await fetch('/api/extract', {
            method: 'POST',
            body: createMockPdfFormData()
          });
          if (!response.ok) throw new Error('Simulation failed');
          const result = await response.json();
          appState.items = result.items;
          appState.selectedItemIndex = 0; // Select first item by default
          
          await recalculateQuote();
          renderTable();
          update3DVisualizerModel();
        } catch (err) {
          console.error(err);
          alert('Error loading demo joinery data.');
        } finally {
          uploadLoader.classList.add('hidden');
        }
      }, 1000);
    });

    // Add Row Manually
    addRowBtn.addEventListener('click', () => {
      const carcassMat = Object.keys(appState.config.carcassMaterials || {})[0] || 'Standard Melamine (White)';
      const doorFin = Object.keys(appState.config.doorFinishes || {})[0] || 'Matt Melamine';
      const hw = Object.keys(appState.config.hardware || {})[0] || 'Soft-Close Hinge';
      
      const newItem = {
        id: 'manual_' + Date.now(),
        room: appState.items.length > 0 ? appState.items[appState.items.length - 1].room : 'Kitchen',
        category: 'Base Cabinet',
        description: 'New Cabinet Unit',
        width: 600,
        height: 720,
        depth: 560,
        qty: 1,
        carcassMaterial: carcassMat,
        doorFinish: doorFin,
        benchtopMaterial: 'None',
        hardwareType: hw,
        drawerCount: 0
      };
      
      appState.items.push(newItem);
      appState.selectedItemIndex = appState.items.length - 1; // Auto-select new row
      
      // Deactivate active preset tier swapper buttons on manual modification
      tierButtons.forEach(b => b.classList.remove('active'));

      renderTable();
      recalculateQuote();
      update3DVisualizerModel();
    });

    // Clear All
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the entire schedule?')) {
        appState.items = [];
        appState.selectedItemIndex = -1;
        tierButtons.forEach(b => b.classList.remove('active'));
        renderTable();
        recalculateQuote();
        update3DVisualizerModel();
      }
    });

    // Rates settings save
    saveConfigBtn.addEventListener('click', async () => {
      const updatedConfig = gatherPricingConfigFromForm();
      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedConfig)
        });
        if (!response.ok) throw new Error('Failed to save config');
        const data = await response.json();
        appState.config = data.config;
        alert('Pricing rates successfully saved and updated.');
        recalculateQuote();
      } catch (err) {
        console.error(err);
        alert('Error saving rates configuration.');
      }
    });

    resetConfigBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset rates to defaults?')) {
        await fetchPricingRates();
        alert('Configuration reset to defaults.');
        recalculateQuote();
      }
    });

    // Gemini API config
    saveApiKeyBtn.addEventListener('click', () => {
      const val = apiKeyInput.value.trim();
      if (!val) {
        alert('Please enter a valid Gemini API Key.');
        return;
      }
      appState.apiKey = val;
      localStorage.setItem('gemini_api_key', val);
      updateStatusBadge(true);
      alert('Gemini API Key saved. Live AI extraction active.');
    });

    clearApiKeyBtn.addEventListener('click', () => {
      appState.apiKey = '';
      localStorage.removeItem('gemini_api_key');
      apiKeyInput.value = '';
      updateStatusBadge(false);
      alert('Gemini API Key removed. Reverted to Simulation Mode.');
    });

    toggleKeyVisibility.addEventListener('click', () => {
      const type = apiKeyInput.type === 'password' ? 'text' : 'password';
      apiKeyInput.type = type;
      const eyeIcon = toggleKeyVisibility.querySelector('i');
      if (type === 'text') {
        eyeIcon.setAttribute('data-lucide', 'eye-off');
      } else {
        eyeIcon.setAttribute('data-lucide', 'eye');
      }
      lucide.createIcons();
    });

    // Proposal print
    printProposalBtn.addEventListener('click', () => {
      if (appState.items.length === 0) {
        alert('No joinery items to generate proposal for.');
        return;
      }
      proposalDateVal.textContent = new Date().toISOString().split('T')[0];
      proposalRefVal.textContent = 'AG-AC-' + Math.floor(100000 + Math.random() * 900000);
      populateProposalDocument();
      proposalModal.classList.remove('hidden');
    });

    closeProposalBtn.addEventListener('click', () => {
      proposalModal.classList.add('hidden');
    });

    printExecuteBtn.addEventListener('click', () => {
      window.print();
    });

    exportCsvBtn.addEventListener('click', () => {
      if (appState.items.length === 0) return alert('Nothing to export.');
      exportToCsv();
    });
  }

  // --- MATERIAL TIER PRESETS GLOBAL RE-MAPPING LOGIC ---
  function applyMaterialPresetTier(tier) {
    if (appState.items.length === 0) return;

    appState.items.forEach(item => {
      if (tier === 'budget') {
        item.carcassMaterial = "Standard Melamine (White)";
        item.doorFinish = "Matt Melamine";
        if (item.category === 'Benchtop' || item.benchtopMaterial !== 'None') {
          item.benchtopMaterial = "Laminate (Standard)";
        }
      } else if (tier === 'premium') {
        item.carcassMaterial = "Standard Melamine (White)";
        item.doorFinish = "Thermolaminated (Vinyl Wrap)";
        if (item.category === 'Benchtop' || item.benchtopMaterial !== 'None') {
          item.benchtopMaterial = "Standard Quartz (20mm Stone)";
        }
      } else if (tier === 'luxury') {
        item.carcassMaterial = "Black Melamine";
        item.doorFinish = "Natural Timber Veneer";
        if (item.category === 'Benchtop' || item.benchtopMaterial !== 'None') {
          item.benchtopMaterial = "Premium Quartz (40mm Stone)";
        }
      }
    });

    // Trigger recalculation and render
    recalculateQuote();
    renderTable();
    update3DVisualizerModel();
  }

  // --- PDF UPLOADING AND SIMULATING ---
  async function processPdfUpload(file) {
    uploadLoader.classList.remove('hidden');
    const formData = new FormData();
    formData.append('pdf', file);
    
    try {
      const headers = {};
      if (appState.apiKey) headers['x-gemini-key'] = appState.apiKey;
      
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: headers,
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract PDF data');
      }
      
      const result = await response.json();
      updateStatusBadge(!result.simulation);
      
      appState.items = result.items;
      appState.selectedItemIndex = appState.items.length > 0 ? 0 : -1;
      
      // Deactivate presets swapper
      tierButtons.forEach(b => b.classList.remove('active'));

      await recalculateQuote();
      renderTable();
      update3DVisualizerModel();
    } catch (err) {
      console.error(err);
      alert('Error during PDF analysis: ' + err.message);
    } finally {
      uploadLoader.classList.add('hidden');
      pdfInput.value = '';
    }
  }

  function createMockPdfFormData() {
    const boundary = "------MultipartBoundary" + Math.random().toString(16);
    const body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="pdf"; filename="house_plans.pdf"`,
      `Content-Type: application/pdf`,
      ``,
      `%PDF-1.4... mock pdf data with kitchen and laundry spec ...`,
      `--${boundary}--`
    ].join('\r\n');
    const fileBlob = new Blob([body], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('pdf', fileBlob, 'mock_spec.pdf');
    return formData;
  }

  // --- RECALCULATE LOGIC ---
  async function recalculateQuote() {
    if (appState.items.length === 0) {
      renderSummary({
        carcassMaterial: 0, doorMaterial: 0, materialsTotal: 0,
        benchtop: 0, hardware: 0, labor: 0, directSubtotal: 0,
        overhead: 0, profit: 0, tax: 0, finalPrice: 0,
        auxiliary: { appliances: 0, delivery: 0, services: 0, total: 0 },
        laborHours: { cutting: 0, edging: 0, assembly: 0, install: 0, total: 0 }
      });
      renderCharts(null);
      return;
    }

    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: appState.items,
          rates: appState.config,
          auxiliary: appState.auxiliary
        })
      });
      
      if (!response.ok) throw new Error('Calculation endpoint failed');
      const estimate = await response.json();
      
      appState.items = estimate.items;
      
      renderSummary(estimate.totals);
      renderCharts(estimate);
      updateRoomSubtotalHeaders(estimate.roomTotals);
    } catch (err) {
      console.error(err);
    }
  }

  // --- RENDER TABLE WITH ROOM GROUPINGS & SUBTOTALS ---
  function renderTable() {
    scheduleBody.innerHTML = '';
    
    if (appState.items.length === 0) {
      scheduleBody.appendChild(createEmptyPlaceholder());
      statTotalUnits.textContent = '0';
      statRoomsCount.textContent = '0';
      return;
    }

    const groupedItems = {};
    appState.items.forEach((item, index) => {
      const room = item.room || 'General';
      if (!groupedItems[room]) groupedItems[room] = [];
      groupedItems[room].push({ item, originalIndex: index });
    });

    const rooms = Object.keys(groupedItems);
    rooms.forEach(roomName => {
      // Room Header
      const headerRow = document.createElement('tr');
      headerRow.className = 'room-group-header-row';
      headerRow.innerHTML = `
        <td colspan="12">
          <i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px; display: inline-block;"></i>
          ${roomName} Room
          <span class="room-subtotal-badge" id="room-subtotal-badge-${roomName.replace(/\s+/g, '-')}">
            (Loading cost...)
          </span>
        </td>
      `;
      scheduleBody.appendChild(headerRow);

      // Cabinet rows
      groupedItems[roomName].forEach(({ item, originalIndex }) => {
        const row = document.createElement('tr');
        row.className = 'cabinet-data-row';
        if (originalIndex === appState.selectedItemIndex) {
          row.classList.add('selected-cabinet-row');
        }

        row.addEventListener('click', (e) => {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && !e.target.closest('.row-delete-btn')) {
            appState.selectedItemIndex = originalIndex;
            document.querySelectorAll('.cabinet-data-row').forEach(r => r.classList.remove('selected-cabinet-row'));
            row.classList.add('selected-cabinet-row');
            update3DVisualizerModel();
          }
        });

        // Room
        const tdRoom = document.createElement('td');
        tdRoom.appendChild(createTextInput(item.room, 'room', originalIndex));
        row.appendChild(tdRoom);

        // Category
        const tdCategory = document.createElement('td');
        tdCategory.appendChild(createSelectInput(
          ['Base Cabinet', 'Wall Cabinet', 'Tall Cabinet', 'Drawer Unit', 'Benchtop', 'Splashback', 'Other'],
          item.category, 'category', originalIndex
        ));
        row.appendChild(tdCategory);

        // Description
        const tdDesc = document.createElement('td');
        tdDesc.appendChild(createTextInput(item.description, 'description', originalIndex));
        row.appendChild(tdDesc);

        // W, H, D, Qty
        const tdW = document.createElement('td');
        tdW.appendChild(createNumberInput(item.width, 'width', originalIndex, 50, 4000));
        row.appendChild(tdW);

        const tdH = document.createElement('td');
        tdH.appendChild(createNumberInput(item.height, 'height', originalIndex, 50, 3000));
        row.appendChild(tdH);

        const tdD = document.createElement('td');
        tdD.appendChild(createNumberInput(item.depth, 'depth', originalIndex, 50, 2000));
        row.appendChild(tdD);

        const tdQty = document.createElement('td');
        tdQty.appendChild(createNumberInput(item.qty, 'qty', originalIndex, 1, 50));
        row.appendChild(tdQty);

        // Dropdowns
        const tdCarcass = document.createElement('td');
        const carcassOptions = Object.keys(appState.config.carcassMaterials || {});
        tdCarcass.appendChild(createSelectInput(carcassOptions, item.carcassMaterial, 'carcassMaterial', originalIndex));
        row.appendChild(tdCarcass);

        const tdDoor = document.createElement('td');
        const doorOptions = Object.keys(appState.config.doorFinishes || {});
        tdDoor.appendChild(createSelectInput(doorOptions, item.doorFinish, 'doorFinish', originalIndex));
        row.appendChild(tdDoor);

        const tdBench = document.createElement('td');
        const benchOptions = Object.keys(appState.config.benchtopMaterials || {});
        tdBench.appendChild(createSelectInput(benchOptions, item.benchtopMaterial, 'benchtopMaterial', originalIndex));
        row.appendChild(tdBench);

        const tdHardware = document.createElement('td');
        const hwOptions = Object.keys(appState.config.hardware || {});
        tdHardware.appendChild(createSelectInput(hwOptions, item.hardwareType, 'hardwareType', originalIndex));
        row.appendChild(tdHardware);

        // Delete
        const tdActions = document.createElement('td');
        tdActions.className = 'action-cell';
        const delBtn = document.createElement('button');
        delBtn.className = 'row-delete-btn';
        delBtn.innerHTML = '<i data-lucide="trash-2"></i>';
        delBtn.addEventListener('click', () => {
          appState.items.splice(originalIndex, 1);
          if (appState.selectedItemIndex === originalIndex) {
            appState.selectedItemIndex = appState.items.length - 1;
          } else if (appState.selectedItemIndex > originalIndex) {
            appState.selectedItemIndex--;
          }
          renderTable();
          recalculateQuote();
          update3DVisualizerModel();
        });
        tdActions.appendChild(delBtn);
        row.appendChild(tdActions);

        scheduleBody.appendChild(row);
      });
    });

    statRoomsCount.textContent = rooms.length;
    const totalQty = appState.items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    statTotalUnits.textContent = totalQty;
    
    lucide.createIcons();
  }

  function updateRoomSubtotalHeaders(roomTotals) {
    if (!roomTotals) return;
    Object.keys(roomTotals).forEach(roomName => {
      const badgeId = `room-subtotal-badge-${roomName.replace(/\s+/g, '-')} `;
      // Clean target badge name replacing extra spaces
      const targetBadgeId = `room-subtotal-badge-${roomName.replace(/\s+/g, '-')}`;
      const badgeElement = document.getElementById(targetBadgeId);
      if (badgeElement) {
        const totalVal = roomTotals[roomName].final;
        const countVal = roomTotals[roomName].unitsCount;
        badgeElement.textContent = `— ${countVal} unit(s) • Subtotal: $${totalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      }
    });
  }

  function createTextInput(value, field, index) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.addEventListener('change', (e) => {
      appState.items[index][field] = e.target.value;
      
      // If manually changed dropdown properties, disable active presets buttons
      tierButtons.forEach(b => b.classList.remove('active'));

      if (field === 'room') {
        renderTable();
      }
      
      recalculateQuote();
      if (index === appState.selectedItemIndex) update3DVisualizerModel();
    });
    return input;
  }

  function createNumberInput(value, field, index, min = 0, max = 10000) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value || 0;
    input.min = min;
    input.max = max;
    input.addEventListener('change', (e) => {
      let val = Number(e.target.value);
      if (val < min) val = min;
      if (val > max) val = max;
      e.target.value = val;
      appState.items[index][field] = val;
      
      tierButtons.forEach(b => b.classList.remove('active'));

      recalculateQuote();
      if (index === appState.selectedItemIndex) update3DVisualizerModel();
    });
    return input;
  }

  function createSelectInput(options, selectedVal, field, index) {
    const select = document.createElement('select');
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === selectedVal) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', (e) => {
      appState.items[index][field] = e.target.value;
      
      tierButtons.forEach(b => b.classList.remove('active'));

      if (field === 'category') {
        if (e.target.value === 'Drawer Unit') {
          appState.items[index].drawerCount = 3;
          appState.items[index].hardwareType = 'Soft-Close Drawer Runner (pair)';
        } else {
          appState.items[index].drawerCount = 0;
        }
        
        if (e.target.value === 'Benchtop' && appState.items[index].benchtopMaterial === 'None') {
          appState.items[index].benchtopMaterial = Object.keys(appState.config.benchtopMaterials)[1] || 'Laminate (Standard)';
        }
        
        renderTable();
      }
      
      recalculateQuote();
      if (index === appState.selectedItemIndex) {
        update3DVisualizerModel();
      }
    });
    return select;
  }

  function createEmptyPlaceholder() {
    const tr = document.createElement('tr');
    tr.id = 'empty-row-placeholder';
    tr.innerHTML = `
      <td colspan="12" class="empty-placeholder-td">
        <i data-lucide="info" class="placeholder-icon"></i>
        <p>No joinery items loaded. Upload a PDF specification, click "Load Demo Spec", or add a unit manually to start.</p>
      </td>
    `;
    return tr;
  }

  // --- RENDER SUMMARY BREAKDOWNS ---
  function renderSummary(totals) {
    const formatCurrency = (val) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    statGrandTotal.textContent = formatCurrency(totals.finalPrice);
    
    costCarcass.textContent = formatCurrency(totals.carcassMaterial);
    costDoors.textContent = formatCurrency(totals.doorMaterial);
    costBenchtops.textContent = formatCurrency(totals.benchtop);
    costHardware.textContent = formatCurrency(totals.hardware);
    costLabor.textContent = formatCurrency(totals.labor);
    costDirectSubtotal.textContent = formatCurrency(totals.directSubtotal);
    
    const allowancesSum = (totals.auxiliary ? totals.auxiliary.total : 0) || 0;
    costAllowancesSum.textContent = formatCurrency(allowancesSum);

    if (totals.laborHours) {
      hoursCutVal.textContent = totals.laborHours.cutting + 'h';
      hoursAssembleVal.textContent = totals.laborHours.assembly + 'h';
      hoursInstallVal.textContent = totals.laborHours.install + 'h';
      hoursTotalVal.textContent = totals.laborHours.total + 'h';
    }

    const margins = appState.config.margins || { overhead: 15, profit: 20, tax: 10, wastage: 15 };
    pctOverheadSpan.textContent = margins.overhead;
    pctProfitSpan.textContent = margins.profit;
    pctTaxSpan.textContent = margins.tax;
    
    costOverhead.textContent = formatCurrency(totals.overhead);
    costProfit.textContent = formatCurrency(totals.profit);
    costTax.textContent = formatCurrency(totals.tax);
    costGrandTotalSidebar.textContent = formatCurrency(totals.finalPrice);
  }

  // --- RENDER CHARTS ---
  function renderCharts(estimate) {
    chartBarsWrapper.innerHTML = '';
    
    if (!estimate || !estimate.totals || estimate.totals.finalPrice === 0) {
      chartBarsWrapper.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px 0;">No chart data available</p>`;
      return;
    }
    
    const totals = estimate.totals;
    const directTotal = totals.directSubtotal;
    
    const components = [
      { name: 'Carcass & Doors Board', val: totals.materialsTotal },
      { name: 'Benchtops Material', val: totals.benchtop },
      { name: 'Hardware fittings', val: totals.hardware },
      { name: 'Cabinetry Labor hours', val: totals.labor }
    ];
    
    components.forEach(comp => {
      if (comp.val === 0) return;
      const pct = directTotal > 0 ? ((comp.val / directTotal) * 100).toFixed(1) : 0;
      
      const chartItem = document.createElement('div');
      chartItem.className = 'chart-item';
      chartItem.innerHTML = `
        <div class="chart-label-row">
          <span>${comp.name}</span>
          <span>$${comp.val.toLocaleString()} (${pct}%)</span>
        </div>
        <div class="chart-bar-bg">
          <div class="chart-bar-fill" style="width: ${pct}%"></div>
        </div>
      `;
      chartBarsWrapper.appendChild(chartItem);
    });
  }

  // --- 3D ROTATION & MODEL DRAWINGS ---
  function update3DVisualizerRotation() {
    cabinet3dScene.style.transform = `rotateX(-20deg) rotateY(${appState.rotationY}deg)`;
  }

  function update3DVisualizerModel() {
    const idx = appState.selectedItemIndex;
    
    if (idx < 0 || idx >= appState.items.length) {
      visualizerStatus.textContent = "Inactive";
      visualizerStatus.style.background = "var(--text-muted)";
      visualizerDimensionsLabel.textContent = "Select a cabinet row";
      cabinetCube.classList.add('hidden');
      return;
    }

    const item = appState.items[idx];
    visualizerStatus.textContent = item.room + " Unit";
    visualizerStatus.style.background = "var(--primary-gradient)";
    
    const w = Number(item.width) || 600;
    const h = Number(item.height) || 720;
    const d = Number(item.depth) || 560;

    visualizerDimensionsLabel.textContent = `${item.category}: ${w}W x ${h}H x ${d}D mm`;
    cabinetCube.classList.remove('hidden');

    const scaleFactor = 0.08;
    const wPx = Math.max(35, Math.min(130, w * scaleFactor));
    const hPx = Math.max(40, Math.min(180, h * scaleFactor));
    const dPx = Math.max(35, Math.min(130, d * scaleFactor));

    cabinetCube.style.setProperty('--cab-w', `${wPx}px`);
    cabinetCube.style.setProperty('--cab-h', `${hPx}px`);
    cabinetCube.style.setProperty('--cab-d', `${dPx}px`);

    let carcassColor = "#eaecef";
    if (item.carcassMaterial.includes("Black")) {
      carcassColor = "#2d3748";
    } else if (item.carcassMaterial.includes("Plywood")) {
      carcassColor = "#d7ccc8";
    }
    cabinetCube.style.setProperty('--carcass-face-color', carcassColor);

    let doorColor = "#cfd8dc";
    let doorBorder = "#78909c";
    const finish = item.doorFinish;

    if (finish.includes("Polyurethane")) {
      doorColor = "#f43f5e";
      doorBorder = "#be123c";
    } else if (finish.includes("Veneer")) {
      doorColor = "#8d6e63";
      doorBorder = "#5d4037";
    } else if (finish.includes("Matt Melamine")) {
      doorColor = "#eaeaea";
      doorBorder = "#b0bec5";
    } else if (finish.includes("Vinyl Wrap") || finish.includes("Thermolaminated")) {
      doorColor = "#06b6d4";
      doorBorder = "#0891b2";
    }
    cabinetCube.style.setProperty('--door-face-color', doorColor);
    cabinetCube.style.setProperty('--door-border-color', doorBorder);

    if (item.category === 'Drawer Unit') {
      cubeFrontDoor.classList.add('hidden');
      cubeDrawerGroup.classList.remove('hidden');
    } else if (item.category === 'Benchtop') {
      cubeFrontDoor.classList.add('hidden');
      cubeDrawerGroup.classList.add('hidden');
    } else {
      cubeFrontDoor.classList.remove('hidden');
      cubeDrawerGroup.classList.add('hidden');
    }
  }

  // --- POPULATE CONFIG TAB FORM ---
  function populateRatesForm() {
    if (!appState.config || !appState.config.carcassMaterials) return;
    const rates = appState.config;
    
    configCarcassContainer.innerHTML = '';
    Object.keys(rates.carcassMaterials).forEach(matName => {
      configCarcassContainer.appendChild(createRateRowInput('carcassMaterials', matName, rates.carcassMaterials[matName], '$'));
    });
    
    configDoorContainer.innerHTML = '';
    Object.keys(rates.doorFinishes).forEach(finName => {
      configDoorContainer.appendChild(createRateRowInput('doorFinishes', finName, rates.doorFinishes[finName], '$'));
    });
    
    configBenchtopContainer.innerHTML = '';
    Object.keys(rates.benchtopMaterials).forEach(benchName => {
      if (benchName === 'None') return;
      configBenchtopContainer.appendChild(createRateRowInput('benchtopMaterials', benchName, rates.benchtopMaterials[benchName], '$'));
    });
    
    configHardwareContainer.innerHTML = '';
    Object.keys(rates.hardware).forEach(hwName => {
      configHardwareContainer.appendChild(createRateRowInput('hardware', hwName, rates.hardware[hwName], '$'));
    });
    
    cfgLaborShop.value = rates.labor.hourlyRate;
    cfgLaborInstall.value = rates.labor.installRate;
    cfgMarginOverhead.value = rates.margins.overhead;
    cfgMarginProfit.value = rates.margins.profit;
    cfgMarginWastage.value = rates.margins.wastage !== undefined ? rates.margins.wastage : 15;
    cfgMarginTax.value = rates.margins.tax;
  }

  function createRateRowInput(category, key, value, symbol) {
    const div = document.createElement('div');
    div.className = 'config-row-item';
    div.innerHTML = `
      <label>${key}</label>
      <div class="input-with-symbol">
        <span class="symbol">${symbol}</span>
        <input type="number" data-category="${category}" data-key="${key}" value="${value}" step="0.01" min="0">
      </div>
    `;
    return div;
  }

  function gatherPricingConfigFromForm() {
    const updated = {
      carcassMaterials: {},
      doorFinishes: {},
      benchtopMaterials: { "None": 0.00 },
      hardware: {},
      labor: {
        hourlyRate: Number(cfgLaborShop.value) || 0,
        installRate: Number(cfgLaborInstall.value) || 0
      },
      margins: {
        overhead: Number(cfgMarginOverhead.value) || 0,
        profit: Number(cfgMarginProfit.value) || 0,
        wastage: Number(cfgMarginWastage.value) || 0,
        tax: Number(cfgMarginTax.value) || 0
      }
    };
    
    const listInputs = document.querySelectorAll('.config-row-item input');
    listInputs.forEach(input => {
      const cat = input.getAttribute('data-category');
      const key = input.getAttribute('data-key');
      const val = Number(input.value) || 0;
      updated[cat][key] = val;
    });
    
    return updated;
  }

  // --- POPULATE PROPOSAL PRINT MODAL ---
  function populateProposalDocument() {
    proposalItemsBody.innerHTML = '';
    
    appState.items.forEach(item => {
      const row = document.createElement('tr');
      const details = `
        <strong>${item.description || item.category}</strong><br>
        <span style="font-size: 11px; color: #6b7280;">
          Carcass: ${item.carcassMaterial} | Doors: ${item.doorFinish}
          ${item.benchtopMaterial !== 'None' ? ' | Benchtop: ' + item.benchtopMaterial : ''}
        </span>
      `;
      const dims = `${item.width}W x ${item.height}H x ${item.depth}D`;
      const priceVal = item.pricing ? item.pricing.finalPrice : 0;
      
      row.innerHTML = `
        <td>${item.room || 'General'}</td>
        <td>${details}</td>
        <td>${dims}</td>
        <td>${item.qty}</td>
        <td>${item.doorFinish}</td>
        <td class="text-right">$${priceVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      `;
      proposalItemsBody.appendChild(row);
    });

    let cumDirect = 0;
    let cumMarkup = 0;
    let cumTax = 0;
    let cumGrandTotal = 0;

    appState.items.forEach(item => {
      if (item.pricing && item.pricing.breakdown) {
        const br = item.pricing.breakdown;
        cumDirect += br.directSubtotal;
        cumMarkup += br.overhead + br.profit;
        cumTax += br.tax;
        cumGrandTotal += item.pricing.finalPrice;
      }
    });

    const allowancesSum = appState.auxiliary.appliances + appState.auxiliary.delivery + appState.auxiliary.services;
    const invoiceGrandTotal = cumGrandTotal + allowancesSum;

    propSubtotal.textContent = '$' + cumDirect.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    propAllowances.textContent = '$' + allowancesSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    propMarkup.textContent = '$' + cumMarkup.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    propTax.textContent = '$' + cumTax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    propGrandTotal.textContent = '$' + invoiceGrandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }

  // --- CSV EXPORT LOGIC ---
  function exportToCsv() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Room,Category,Description,Width,Height,Depth,Qty,Carcass Material,Door Finish,Benchtop Material,Hardware,Unit Direct Cost,Overhead,Profit,GST Tax,Total Price\r\n";
    
    appState.items.forEach(item => {
      const p = item.pricing || { breakdown: {} };
      const br = p.breakdown || {};
      const row = [
        `"${item.room}"`,
        `"${item.category}"`,
        `"${item.description}"`,
        item.width, item.height, item.depth, item.qty,
        `"${item.carcassMaterial}"`,
        `"${item.doorFinish}"`,
        `"${item.benchtopMaterial}"`,
        `"${item.hardwareType}"`,
        br.directSubtotal || 0,
        br.overhead || 0,
        br.profit || 0,
        br.tax || 0,
        item.pricing ? item.pricing.finalPrice : 0
      ].join(",");
      csvContent += row + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AeroCraft_3D_Estimate_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- RUN APP INITIALIZATION ---
  initializeApp();
});
