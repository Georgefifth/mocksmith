export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MockSmith Studio - Stateful Mock & Chaos Sandbox</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0284c7;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --code-bg: #090d16;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
    
    /* Top Bar */
    header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .brand { display: flex; align-items: center; gap: 0.75rem; }
    .brand-logo {
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; color: #0f172a; font-size: 1.1rem;
    }
    .brand-title { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em; }
    .brand-subtitle { font-size: 0.75rem; color: var(--text-muted); }
    
    .status-bar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4);
      color: var(--success); font-size: 0.75rem; font-weight: 600;
      padding: 0.25rem 0.6rem; border-radius: 9999px;
    }
    .pulse-dot { width: 7px; height: 7px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success); }
    
    /* Navigation Tabs */
    .tabs {
      background: var(--card-bg); border-bottom: 1px solid var(--border);
      display: flex; gap: 0.5rem; padding: 0 1.5rem; flex-wrap: wrap;
    }
    .tab-btn {
      background: transparent; border: none; outline: none;
      color: var(--text-muted); font-size: 0.9rem; font-weight: 600;
      padding: 0.85rem 1rem; cursor: pointer;
      border-bottom: 2px solid transparent; transition: all 0.2s ease;
    }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-btn:hover:not(.active) { color: var(--text); }
    
    /* Main Layout */
    main { flex: 1; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* Panels */
    .panel {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 10px; padding: 1.25rem;
    }
    .panel-title { font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    
    /* Tables */
    .traffic-table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
    th { background: rgba(0, 0, 0, 0.25); color: var(--text-muted); font-weight: 600; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
    
    .method-badge {
      display: inline-block; font-weight: 700; font-size: 0.7rem;
      padding: 0.15rem 0.45rem; border-radius: 4px; text-transform: uppercase;
    }
    .method-get { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
    .method-post { background: rgba(16, 185, 129, 0.2); color: #10b981; }
    .method-put, .method-patch { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .method-delete { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    
    .status-badge { font-weight: 700; font-size: 0.8rem; }
    .status-2xx { color: var(--success); }
    .status-4xx { color: var(--warning); }
    .status-5xx { color: var(--danger); }
    
    .chaos-tag {
      background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171; font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 4px;
    }
    
    /* Buttons & Form */
    .btn {
      background: var(--primary); color: #0f172a; border: none; font-weight: 600;
      padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;
      display: inline-flex; align-items: center; gap: 0.35rem; transition: background 0.15s;
    }
    .btn:hover { background: var(--primary-hover); }
    .btn-sm { padding: 0.25rem 0.55rem; font-size: 0.75rem; }
    .btn-danger { background: var(--danger); color: white; }
    .btn-danger:hover { background: #dc2626; }
    .btn-secondary { background: var(--border); color: var(--text); }
    .btn-secondary:hover { background: #475569; }
    
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-label { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; }
    .slider { width: 100%; accent-color: var(--primary); cursor: pointer; }
    .form-select, .form-input, .form-textarea {
      width: 100%; background: var(--bg); border: 1px solid var(--border);
      color: var(--text); padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.85rem; outline: none;
    }
    .form-select:focus, .form-input:focus, .form-textarea:focus { border-color: var(--primary); }
    
    .db-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; flex-wrap: wrap; }
    .db-tab-btn {
      background: transparent; border: 1px solid var(--border); color: var(--text-muted);
      padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer;
    }
    .db-tab-btn.active { background: var(--primary); color: #0f172a; border-color: var(--primary); font-weight: 600; }
    
    /* Quick Request Console */
    .console-box {
      background: var(--code-bg); border: 1px solid var(--border);
      border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;
    }
    .console-bar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem; }

    /* Modal Dialog */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
      display: none; align-items: center; justify-content: center; z-index: 9999;
    }
    .modal-card {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 10px; width: 90%; max-width: 550px; padding: 1.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-logo">M</div>
      <div>
        <div class="brand-title">MockSmith Studio</div>
        <div class="brand-subtitle">Stateful Mock API Server & Chaos Sandbox v1.2</div>
      </div>
    </div>
    <div class="status-bar">
      <span class="status-pill"><span class="pulse-dot"></span> LIVE ENGINE</span>
      <a href="/_mocksmith/api/export/openapi" download="mocksmith-openapi.json" class="btn btn-secondary btn-sm">Export OpenAPI</a>
      <a href="/_mocksmith/api/export/bruno" download="mocksmith-bruno.json" class="btn btn-secondary btn-sm">Export Bruno</a>
      <a href="/_mocksmith/api/recorder/spec" download="synthesized-openapi.json" class="btn btn-secondary btn-sm">Synthesized Spec</a>
      <button class="btn btn-secondary btn-sm" onclick="resetDatabaseState()">Reset State</button>
    </div>
  </header>

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('traffic')">Live Traffic & Console (<span id="req-count">0</span>)</button>
    <button class="tab-btn" onclick="switchTab('database')">Relational State Tables</button>
    <button class="tab-btn" onclick="switchTab('routes')">API Catalog & Routes</button>
    <button class="tab-btn" onclick="switchTab('chaos')">Chaos & Fault Sandbox</button>
    <button class="tab-btn" onclick="switchTab('webhooks')">Webhooks & Outbound Events (<span id="wh-count">0</span>)</button>
  </div>

  <main>
    <!-- Tab 1: Live Traffic & Quick Request Console -->
    <div id="tab-traffic" class="tab-content active">
      <!-- Quick Request Console -->
      <div class="console-box">
        <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--primary);">
          Interactive API Dispatcher & Tester
        </div>
        <div class="console-bar">
          <select id="req-method" class="form-select" style="width: 110px;">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input type="text" id="req-url" class="form-input" style="flex: 1; min-width: 220px;" placeholder="/api/users" value="/api/users">
          <button class="btn" onclick="dispatchManualRequest()">Send Request</button>
        </div>
        <div id="req-body-container" style="display: none; margin-bottom: 0.5rem;">
          <textarea id="req-body-text" class="form-textarea" rows="3" placeholder='{"name": "New User", "email": "user@example.com"}'></textarea>
        </div>
        <div id="console-response-box" style="display: none; background: #000; border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem; margin-top: 0.5rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span id="console-res-status" style="font-weight: 700; font-size: 0.8rem;"></span>
            <span id="console-res-time" style="font-size: 0.75rem; color: var(--text-muted);"></span>
          </div>
          <div id="console-validation-diag" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 4px; padding: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem; color: #fca5a5;"></div>
          <pre id="console-res-body" style="font-size: 0.75rem; color: #38bdf8; max-height: 150px; overflow-y: auto;"></pre>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span>Incoming HTTP Traffic Stream</span>
          <button class="btn btn-secondary btn-sm" onclick="clearTrafficLog()">Clear Stream</button>
        </div>
        <div class="traffic-table-wrapper">
          <table>
            <thead>
              <tr>
                <th style="width: 90px;">Time</th>
                <th style="width: 80px;">Method</th>
                <th style="width: 80px;">Status</th>
                <th>Route Path</th>
                <th style="width: 90px;">Latency</th>
                <th style="width: 120px;">Fault Injected</th>
                <th style="width: 140px;">Actions</th>
              </tr>
            </thead>
            <tbody id="traffic-tbody">
              <tr id="empty-traffic-row">
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                  Listening for requests... Use the dispatcher above or call your API!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 2: Database State & In-Browser Table Editor -->
    <div id="tab-database" class="tab-content">
      <div class="panel">
        <div class="panel-title">
          <span>In-Memory Relational State Inspector & Editor</span>
          <div>
            <button class="btn btn-sm" onclick="promptAddRecord()">+ Add Record</button>
          </div>
        </div>

        <!-- Scenario & Template Bar -->
        <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; padding: 0.6rem 0.8rem; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; flex-wrap: wrap;">
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Scenario:</span>
            <select id="snapshot-select" class="form-select" style="width: 140px; padding: 0.35rem 0.5rem; font-size: 0.8rem;"></select>
            <button class="btn btn-secondary btn-sm" onclick="restoreSelectedSnapshot()">Load Scenario</button>
            <button class="btn btn-secondary btn-sm" onclick="promptSaveSnapshot()">Save Scenario...</button>
          </div>
          <div style="border-left: 1px solid var(--border); height: 20px;"></div>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Preset:</span>
            <select id="template-select" class="form-select" style="width: 180px; padding: 0.35rem 0.5rem; font-size: 0.8rem;">
              <option value="ecommerce">🛒 E-Commerce Cloud</option>
              <option value="petstore">🐾 OAI Petstore Canonical</option>
              <option value="social">💬 Social Network & Geo</option>
              <option value="chaos">⚡ Chaos Sandbox</option>
            </select>
            <button class="btn btn-secondary btn-sm" onclick="loadSelectedTemplate()">Load Preset</button>
          </div>
        </div>

        <div class="db-tabs" id="db-resource-tabs"></div>
        <div class="traffic-table-wrapper">
          <table id="state-table">
            <thead id="state-thead"></thead>
            <tbody id="state-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab: API Catalog & Routes -->
    <div id="tab-routes" class="tab-content">
      <div class="panel">
        <div class="panel-title">
          <span>Registered Mock Routes & API Catalog</span>
          <span style="font-size: 0.8rem; color: var(--text-muted);" id="routes-total-count">0 routes</span>
        </div>
        <div class="traffic-table-wrapper">
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Method</th>
                <th>Route Path</th>
                <th>Summary & Description</th>
                <th style="width: 120px;">Resource</th>
                <th style="width: 110px;">Action</th>
              </tr>
            </thead>
            <tbody id="routes-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 3: Chaos Controls -->
    <div id="tab-chaos" class="tab-content">
      <div class="panel">
        <div class="panel-title">Chaos Simulation & Network Fault Injection</div>
        <div class="grid-2">
          <div>
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600;">
                <input type="checkbox" id="chaos-enable" style="width: 18px; height: 18px; accent-color: var(--primary);">
                <span>Enable Chaos Interceptor</span>
              </label>
            </div>

            <div class="form-group">
              <div class="form-label">
                <span>Artificial Latency Delay</span>
                <span id="latency-val" style="color: var(--primary);">0 ms</span>
              </div>
              <input type="range" class="slider" id="chaos-latency" min="0" max="3000" step="50" value="0" oninput="updateSliderLabels()">
            </div>

            <div class="form-group">
              <div class="form-label">
                <span>Latency Jitter (+/-)</span>
                <span id="jitter-val" style="color: var(--primary);">0 ms</span>
              </div>
              <input type="range" class="slider" id="chaos-jitter" min="0" max="1000" step="25" value="0" oninput="updateSliderLabels()">
            </div>
          </div>

          <div>
            <div class="form-group">
              <div class="form-label">
                <span>Failure Error Rate</span>
                <span id="error-rate-val" style="color: var(--danger);">0 %</span>
              </div>
              <input type="range" class="slider" id="chaos-error-rate" min="0" max="100" step="5" value="0" oninput="updateSliderLabels()">
            </div>

            <div class="form-group">
              <label class="form-label">Injected Error Status Code</label>
              <select class="form-select" id="chaos-status-code">
                <option value="500">500 Internal Server Error</option>
                <option value="503">503 Service Unavailable</option>
                <option value="429">429 Too Many Requests (Rate Limit)</option>
                <option value="403">403 Forbidden</option>
                <option value="400">400 Bad Request</option>
              </select>
            </div>

            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600;">
                <input type="checkbox" id="chaos-require-auth" style="width: 18px; height: 18px; accent-color: var(--primary);">
                <span>Enforce Bearer Authentication Simulation</span>
              </label>
            </div>
          </div>
        </div>

        <div style="margin-top: 1rem; display: flex; gap: 1rem;">
          <button class="btn" onclick="saveChaosSettings()">Apply Live Chaos Settings</button>
          <span id="save-status" style="font-size: 0.85rem; color: var(--success); align-self: center; display: none;">Saved!</span>
        </div>
      </div>
    </div>

    <!-- Tab 4: Webhooks & Outbound Events -->
    <div id="tab-webhooks" class="tab-content">
      <div class="panel" style="margin-bottom: 1.5rem;">
        <div class="panel-title">
          <span>Registered Webhook Subscriptions</span>
          <button class="btn btn-sm" onclick="promptCreateWebhook()">+ Register Webhook</button>
        </div>
        <div class="traffic-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Event Pattern</th>
                <th>Target Endpoint URL</th>
                <th style="width: 100px;">Delay</th>
                <th style="width: 90px;">Active</th>
                <th style="width: 160px;">Actions</th>
              </tr>
            </thead>
            <tbody id="webhooks-tbody">
              <tr id="empty-wh-row">
                <td colspan="5" style="text-align:center; padding: 1.5rem; color: var(--text-muted);">
                  No webhooks registered. Click "+ Register Webhook" to listen to CRUD events!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span>Outbound Webhook Delivery Logs</span>
          <button class="btn btn-secondary btn-sm" onclick="fetchWebhookDeliveries()">Refresh Deliveries</button>
        </div>
        <div class="traffic-table-wrapper">
          <table>
            <thead>
              <tr>
                <th style="width: 90px;">Time</th>
                <th style="width: 120px;">Event</th>
                <th>Target URL</th>
                <th style="width: 90px;">Status</th>
                <th style="width: 90px;">Duration</th>
                <th style="width: 100px;">Inspect</th>
              </tr>
            </thead>
            <tbody id="wh-deliveries-tbody">
              <tr id="empty-deliveries-row">
                <td colspan="6" style="text-align:center; padding: 1.5rem; color: var(--text-muted);">
                  No webhooks delivered yet. Triggers fire automatically on POST / PUT / DELETE.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>

  <!-- Visual Record Editor Modal -->
  <div id="record-modal" class="modal-overlay">
    <div class="modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 id="modal-title" style="font-size: 1.1rem; font-weight: 700;">Add Record</h3>
        <button class="btn btn-secondary btn-sm" onclick="closeRecordModal()">✕</button>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">Edit JSON Payload:</div>
      <textarea id="modal-json-text" class="form-textarea" rows="10" style="font-family: monospace; font-size: 0.8rem; margin-bottom: 1rem;"></textarea>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button class="btn btn-secondary" onclick="closeRecordModal()">Cancel</button>
        <button class="btn" id="modal-save-btn" onclick="submitRecordModal()">Save Record</button>
      </div>
    </div>
  </div>

  <script>
    let trafficLogs = [];
    let currentActiveCollection = '';
    let dbSnapshot = {};
    let modalAction = { type: 'add', id: null, collection: '' };

    document.getElementById('req-method').addEventListener('change', (e) => {
      const showBody = ['POST', 'PUT', 'PATCH'].includes(e.target.value);
      document.getElementById('req-body-container').style.display = showBody ? 'block' : 'none';
    });

    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.toLowerCase().includes(tabName));
      if (targetBtn) targetBtn.classList.add('active');
      document.getElementById('tab-' + tabName).classList.add('active');

      if (tabName === 'database') {
        fetchDatabaseState();
      } else if (tabName === 'routes') {
        fetchRoutes();
      } else if (tabName === 'webhooks') {
        fetchWebhooks();
        fetchWebhookDeliveries();
      }
    }

    function updateSliderLabels() {
      document.getElementById('latency-val').textContent = document.getElementById('chaos-latency').value + ' ms';
      document.getElementById('jitter-val').textContent = document.getElementById('chaos-jitter').value + ' ms';
      document.getElementById('error-rate-val').textContent = document.getElementById('chaos-error-rate').value + ' %';
    }

    // Connect to Server-Sent Events (SSE) for live streaming
    function initEventStream() {
      const sse = new EventSource('/_mocksmith/events');
      sse.onmessage = (event) => {
        try {
          const entry = JSON.parse(event.data);
          addTrafficEntry(entry);
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };
      sse.onerror = () => {
        setTimeout(initEventStream, 3000);
      };
    }

    function addTrafficEntry(entry) {
      trafficLogs.unshift(entry);
      if (trafficLogs.length > 100) trafficLogs.pop();
      document.getElementById('req-count').textContent = trafficLogs.length;

      const tbody = document.getElementById('traffic-tbody');
      const emptyRow = document.getElementById('empty-traffic-row');
      if (emptyRow) emptyRow.remove();

      const tr = document.createElement('tr');
      const timeStr = new Date(entry.timestamp).toLocaleTimeString();
      const statusClass = entry.status >= 500 ? 'status-5xx' : (entry.status >= 400 ? 'status-4xx' : 'status-2xx');
      const methodClass = 'method-' + entry.method.toLowerCase();
      
      const chaosLabel = entry.chaosInjected?.errorInjected 
        ? '<span class="chaos-tag">ERROR (' + entry.status + ')</span>' 
        : (entry.chaosInjected?.latency > 0 ? '<span class="chaos-tag">+' + entry.chaosInjected.latency + 'ms</span>' : '-');

      tr.innerHTML = \`
        <td style="color: var(--text-muted);">\${timeStr}</td>
        <td><span class="method-badge \${methodClass}">\${entry.method}</span></td>
        <td><span class="status-badge \${statusClass}">\${entry.status}</span></td>
        <td style="font-family: monospace; font-size: 0.85rem;">\${entry.url}</td>
        <td>\${entry.durationMs}ms</td>
        <td>\${chaosLabel}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick='replayRequest(\${JSON.stringify(entry.id)})'>Replay</button>
          <button class="btn btn-secondary btn-sm" onclick='inspectTraffic(\${JSON.stringify(entry.id)})'>Payload</button>
        </td>
      \`;

      tbody.insertBefore(tr, tbody.firstChild);
    }

    async function replayRequest(id) {
      const item = trafficLogs.find(t => t.id === id);
      if (!item) return;

      const options = {
        method: item.method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (item.requestBody && ['POST', 'PUT', 'PATCH'].includes(item.method)) {
        options.body = JSON.stringify(item.requestBody);
      }

      await fetch(item.url, options);
    }

    async function dispatchManualRequest() {
      const method = document.getElementById('req-method').value;
      const url = document.getElementById('req-url').value;
      const bodyText = document.getElementById('req-body-text').value;

      const options = { method, headers: { 'Content-Type': 'application/json' } };
      if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText.trim()) {
        try {
          options.body = JSON.stringify(JSON.parse(bodyText));
        } catch {
          alert('Invalid JSON in request body');
          return;
        }
      }

      const startTime = Date.now();
      try {
        const res = await fetch(url, options);
        const duration = Date.now() - startTime;
        const resData = await res.json();

        document.getElementById('console-response-box').style.display = 'block';
        document.getElementById('console-res-status').textContent = 'HTTP ' + res.status + ' ' + res.statusText;
        document.getElementById('console-res-status').className = res.status >= 400 ? 'status-4xx' : 'status-2xx';
        document.getElementById('console-res-time').textContent = duration + ' ms';

        const diagBox = document.getElementById('console-validation-diag');
        if (res.status === 400 && resData && resData.errors && Array.isArray(resData.errors)) {
          diagBox.style.display = 'block';
          diagBox.innerHTML = '<strong>⚠️ Contract Validation Violations:</strong><br/>' +
            resData.errors.map(function(e) { return '• <code>' + e.field + '</code>: ' + e.message; }).join('<br/>');
        } else {
          diagBox.style.display = 'none';
        }

        document.getElementById('console-res-body').textContent = JSON.stringify(resData, null, 2);
      } catch (err) {
        document.getElementById('console-response-box').style.display = 'block';
        document.getElementById('console-res-status').textContent = 'Request Failed';
        document.getElementById('console-res-body').textContent = err.message;
      }
    }

    function inspectTraffic(id) {
      const item = trafficLogs.find(t => t.id === id);
      if (!item) return;
      alert("Request: " + item.method + " " + item.url + "\\n\\nBody: " + JSON.stringify(item.requestBody, null, 2) + "\\n\\nResponse: " + JSON.stringify(item.responseBody, null, 2));
    }

    function clearTrafficLog() {
      trafficLogs = [];
      document.getElementById('req-count').textContent = '0';
      document.getElementById('traffic-tbody').innerHTML = \`
        <tr id="empty-traffic-row">
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            Traffic log cleared. Listening for new requests...
          </td>
        </tr>
      \`;
    }

    async function fetchDatabaseState() {
      try {
        const res = await fetch('/_mocksmith/api/state');
        dbSnapshot = await res.json();
        renderDatabaseTabs();
        fetchSnapshots();
      } catch (err) {
        console.error('Failed to fetch state:', err);
      }
    }

    async function fetchSnapshots() {
      try {
        const res = await fetch('/_mocksmith/api/snapshots');
        const list = await res.json();
        const select = document.getElementById('snapshot-select');
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        list.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.name;
          opt.textContent = s.name + ' (' + s.rowCount + ' rows)';
          select.appendChild(opt);
        });
        if (currentVal && list.some(s => s.name === currentVal)) {
          select.value = currentVal;
        }
      } catch (e) {
        console.error(e);
      }
    }

    async function restoreSelectedSnapshot() {
      const select = document.getElementById('snapshot-select');
      const name = select.value;
      if (!name) return;
      await fetch('/_mocksmith/api/snapshots/' + name + '/restore', { method: 'POST' });
      await fetchDatabaseState();
    }

    async function promptSaveSnapshot() {
      const name = prompt('Enter a name for this database scenario / snapshot:', 'scenario-' + Date.now());
      if (!name) return;
      await fetch('/_mocksmith/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      await fetchSnapshots();
    }

    async function loadSelectedTemplate() {
      const template = document.getElementById('template-select').value;
      if (!confirm('Load preset template "' + template + '"? Current in-memory state will be re-seeded.')) return;
      await fetch('/_mocksmith/api/templates/' + template + '/load', { method: 'POST' });
      await fetchDatabaseState();
      await fetchRoutes();
      alert('Preset template "' + template + '" successfully loaded!');
    }

    function renderDatabaseTabs() {
      const container = document.getElementById('db-resource-tabs');
      container.innerHTML = '';
      const tables = Object.keys(dbSnapshot);
      if (tables.length === 0) return;

      if (!currentActiveCollection || !tables.includes(currentActiveCollection)) {
        currentActiveCollection = tables[0];
      }

      tables.forEach(tableName => {
        const btn = document.createElement('button');
        btn.className = 'db-tab-btn ' + (tableName === currentActiveCollection ? 'active' : '');
        btn.textContent = tableName + ' (' + dbSnapshot[tableName].length + ')';
        btn.onclick = () => {
          currentActiveCollection = tableName;
          renderDatabaseTabs();
          renderTableData();
        };
        container.appendChild(btn);
      });

      renderTableData();
    }

    function renderTableData() {
      const records = dbSnapshot[currentActiveCollection] || [];
      const thead = document.getElementById('state-thead');
      const tbody = document.getElementById('state-tbody');
      thead.innerHTML = '';
      tbody.innerHTML = '';

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td style="text-align:center; padding: 2rem; color: var(--text-muted);">No records in ' + currentActiveCollection + '</td></tr>';
        return;
      }

      const keys = Object.keys(records[0]);
      let trHead = '<tr>';
      keys.forEach(k => trHead += '<th>' + k + '</th>');
      trHead += '<th style="width: 130px;">Actions</th></tr>';
      thead.innerHTML = trHead;

      records.forEach(r => {
        let tr = '<tr>';
        keys.forEach(k => {
          let val = r[k];
          if (typeof val === 'object') val = JSON.stringify(val);
          tr += '<td>' + (val ?? '') + '</td>';
        });
        tr += \`
          <td>
            <button class="btn btn-secondary btn-sm" onclick='promptEditRecord(\${JSON.stringify(r.id)})'>Edit</button>
            <button class="btn btn-danger btn-sm" onclick='deleteRecord(\${JSON.stringify(r.id)})'>Del</button>
          </td>
        \`;
        tr += '</tr>';
        tbody.innerHTML += tr;
      });
    }

    function promptAddRecord() {
      const sample = dbSnapshot[currentActiveCollection]?.[0] || { name: 'Demo Item' };
      const template = { ...sample };
      delete template.id;
      delete template.createdAt;
      delete template.updatedAt;

      modalAction = { type: 'add', id: null, collection: currentActiveCollection };
      document.getElementById('modal-title').textContent = 'Add Record to ' + currentActiveCollection;
      document.getElementById('modal-json-text').value = JSON.stringify(template, null, 2);
      document.getElementById('record-modal').style.display = 'flex';
    }

    function promptEditRecord(id) {
      const record = dbSnapshot[currentActiveCollection]?.find(r => String(r.id) === String(id));
      if (!record) return;

      modalAction = { type: 'edit', id, collection: currentActiveCollection };
      document.getElementById('modal-title').textContent = 'Edit ' + currentActiveCollection + ' #' + id;
      document.getElementById('modal-json-text').value = JSON.stringify(record, null, 2);
      document.getElementById('record-modal').style.display = 'flex';
    }

    function closeRecordModal() {
      document.getElementById('record-modal').style.display = 'none';
    }

    async function submitRecordModal() {
      const jsonText = document.getElementById('modal-json-text').value;
      let payload;
      try {
        payload = JSON.parse(jsonText);
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
        return;
      }

      if (modalAction.type === 'add') {
        const res = await fetch('/api/' + modalAction.collection, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          alert('Failed to create: ' + (err.message || res.statusText));
          return;
        }
      } else {
        const res = await fetch('/api/' + modalAction.collection + '/' + modalAction.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          alert('Failed to update: ' + (err.message || res.statusText));
          return;
        }
      }

      closeRecordModal();
      await fetchDatabaseState();
    }

    async function deleteRecord(id) {
      if (!confirm('Are you sure you want to delete ' + currentActiveCollection + ' #' + id + '?')) return;
      await fetch('/api/' + currentActiveCollection + '/' + id, { method: 'DELETE' });
      await fetchDatabaseState();
    }

    async function resetDatabaseState() {
      if (confirm('Are you sure you want to reset all data back to initial seeds?')) {
        await fetch('/_mocksmith/api/reset', { method: 'POST' });
        await fetchDatabaseState();
        alert('Database state reseeded successfully!');
      }
    }

    // Routes Catalog
    async function fetchRoutes() {
      try {
        const res = await fetch('/_mocksmith/api/routes');
        const routes = await res.json();
        renderRoutes(routes);
      } catch (err) {
        console.error('Failed to fetch routes:', err);
      }
    }

    function renderRoutes(routes) {
      document.getElementById('routes-total-count').textContent = routes.length + ' routes registered';
      const tbody = document.getElementById('routes-tbody');
      tbody.innerHTML = '';

      routes.forEach(r => {
        const tr = document.createElement('tr');
        const methodClass = 'method-' + r.method.toLowerCase();
        tr.innerHTML = \`
          <td><span class="method-badge \${methodClass}">\${r.method}</span></td>
          <td style="font-family: monospace; font-size: 0.85rem; font-weight: 600;">\${r.path}</td>
          <td style="color: var(--text-muted);">\${r.summary || '-'}</td>
          <td><span class="chaos-tag">\${r.resource}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick='tryRouteInConsole(\${JSON.stringify(r.method)}, \${JSON.stringify(r.path)})'>Try It</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function tryRouteInConsole(method, path) {
      switchTab('traffic');
      document.getElementById('req-method').value = method;
      document.getElementById('req-url').value = path.replace(/:([a-zA-Z0-9_]+)/g, '1');
      const showBody = ['POST', 'PUT', 'PATCH'].includes(method);
      document.getElementById('req-body-container').style.display = showBody ? 'block' : 'none';
      if (showBody) {
        document.getElementById('req-body-text').value = JSON.stringify({ name: 'Demo Item' }, null, 2);
      }
    }

    async function fetchChaosConfig() {
      try {
        const res = await fetch('/_mocksmith/api/chaos');
        const cfg = await res.json();
        document.getElementById('chaos-enable').checked = cfg.enabled;
        document.getElementById('chaos-latency').value = cfg.latencyMs;
        document.getElementById('chaos-jitter').value = cfg.jitterMs;
        document.getElementById('chaos-error-rate').value = Math.round(cfg.errorRate * 100);
        document.getElementById('chaos-status-code').value = cfg.errorStatusCode;
        document.getElementById('chaos-require-auth').checked = cfg.requireAuth;
        updateSliderLabels();
      } catch (err) {
        console.error('Failed to load chaos config:', err);
      }
    }

    async function saveChaosSettings() {
      const patch = {
        enabled: document.getElementById('chaos-enable').checked,
        latencyMs: Number(document.getElementById('chaos-latency').value),
        jitterMs: Number(document.getElementById('chaos-jitter').value),
        errorRate: Number(document.getElementById('chaos-error-rate').value) / 100,
        errorStatusCode: Number(document.getElementById('chaos-status-code').value),
        requireAuth: document.getElementById('chaos-require-auth').checked
      };

      await fetch('/_mocksmith/api/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });

      const status = document.getElementById('save-status');
      status.style.display = 'inline';
      setTimeout(() => status.style.display = 'none', 2000);
    }

    // Webhooks Management
    async function fetchWebhooks() {
      try {
        const res = await fetch('/_mocksmith/api/webhooks');
        const list = await res.json();
        document.getElementById('wh-count').textContent = list.length;
        renderWebhooks(list);
      } catch (err) {
        console.error('Failed to fetch webhooks:', err);
      }
    }

    function renderWebhooks(list) {
      const tbody = document.getElementById('webhooks-tbody');
      tbody.innerHTML = '';
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: var(--text-muted);">No webhooks registered. Click "+ Register Webhook" to listen to CRUD events!</td></tr>';
        return;
      }

      list.forEach(w => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><span class="chaos-tag" style="color: var(--primary); border-color: var(--primary);">\${w.event}</span></td>
          <td style="font-family: monospace; font-size: 0.8rem;">\${w.targetUrl}</td>
          <td>\${w.delayMs}ms</td>
          <td><span style="color: \${w.active ? 'var(--success)' : 'var(--text-muted)'}; font-weight: 600;">\${w.active ? 'Active' : 'Disabled'}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick='triggerWebhook(\${JSON.stringify(w.id)})'>Trigger</button>
            <button class="btn btn-danger btn-sm" onclick='deleteWebhook(\${JSON.stringify(w.id)})'>Del</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function promptCreateWebhook() {
      const targetUrl = prompt('Enter Webhook Target URL (e.g. http://localhost:3000/api/webhook):', 'http://localhost:3000/api/webhook');
      if (!targetUrl) return;

      const event = prompt('Enter Event Pattern (e.g. orders.created, users.*, *):', 'users.created') || '*';
      const secret = prompt('Enter Signing Secret:', 'mocksmith-webhook-secret') || 'mocksmith-webhook-secret';

      await fetch('/_mocksmith/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, event, secret, delayMs: 0, active: true })
      });

      await fetchWebhooks();
    }

    async function deleteWebhook(id) {
      if (!confirm('Are you sure you want to remove this webhook?')) return;
      await fetch('/_mocksmith/api/webhooks/' + id, { method: 'DELETE' });
      await fetchWebhooks();
    }

    async function triggerWebhook(id) {
      const res = await fetch('/_mocksmith/api/webhooks/' + id + '/trigger', { method: 'POST' });
      const del = await res.json();
      alert('Webhook dispatched! Response status: ' + del.status + ' (' + del.durationMs + 'ms)');
      await fetchWebhookDeliveries();
    }

    async function fetchWebhookDeliveries() {
      try {
        const res = await fetch('/_mocksmith/api/webhooks/deliveries');
        const list = await res.json();
        renderWebhookDeliveries(list);
      } catch (err) {
        console.error('Failed to fetch deliveries:', err);
      }
    }

    function renderWebhookDeliveries(list) {
      const tbody = document.getElementById('wh-deliveries-tbody');
      tbody.innerHTML = '';
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1.5rem; color: var(--text-muted);">No webhooks delivered yet. Triggers fire automatically on POST / PUT / DELETE.</td></tr>';
        return;
      }

      list.forEach(d => {
        const tr = document.createElement('tr');
        const timeStr = new Date(d.timestamp).toLocaleTimeString();
        const statusClass = d.status === 200 ? 'status-2xx' : (d.status === 0 ? 'status-5xx' : 'status-4xx');
        tr.innerHTML = \`
          <td style="color: var(--text-muted); font-size: 0.75rem;">\${timeStr}</td>
          <td><span class="chaos-tag">\${d.event}</span></td>
          <td style="font-family: monospace; font-size: 0.8rem;">\${d.targetUrl}</td>
          <td><span class="status-badge \${statusClass}">\${d.status === 0 ? 'ERR' : d.status}</span></td>
          <td>\${d.durationMs}ms</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick='alert("Payload: " + JSON.stringify(d.payload, null, 2) + "\\n\\nSignature: " + d.signature)'>Payload</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    // Startup
    initEventStream();
    fetchChaosConfig();
  </script>
</body>
</html>`;
}
