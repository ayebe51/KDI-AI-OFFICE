/**
 * KDI AI OFFICE — KDI STUDIO FRONTEND ADAPTER
 * 
 * Bridges the KDI Studio visual 3D simulation with the authoritative KDI Backend:
 * - Maps KDI Agents to the 13-seat KDI Studio 4-floor office model
 * - Proxies /api/agents and /api/tasks to KDI REST API
 * - Listens to KDI WebSocket (/ws/v1/events) and routes live telemetry to the Office Log
 * - Injects KDI Auth tokens from localStorage ('kdi_token')
 * - Preserves complete visual, camera, and behavioral parity
 */
(() => {
  'use strict';

  const KDI_API_BASE = window.KDI_API_URL || (location.port === '5173' ? 'http://localhost:3000' : '');
  const KDI_WS_URL = window.KDI_WS_URL || (location.port === '5173' ? 'ws://localhost:3000/ws/v1/events' : ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws/v1/events'));

  function getAuthHeader() {
    try {
      const token = localStorage.getItem('kdi_token');
      if (token && token !== 'guest_public_token') {
        return { 'Authorization': `Bearer ${token}` };
      }
    } catch (_) {}
    return {};
  }

  // ── 1. AGENTS & TEAM MODEL ───────────────────────────────────────────────
  // Canonical 13 KDI Studio seats adapted to KDI autonomous workforce
  const KDI_DEFAULT_TEAM = [
    { n: 'Rian', initials: 'RN', gender: 'male', role: 'AI Engineering Manager', group: 'leadership', kdiRole: 'AI_MANAGER', agentId: 'AGT-MGR-001', model: 'gemini:gemini-1.5-pro' },
    { n: 'Koh Arman', initials: 'KA', gender: 'male', role: 'CEO & Principal Advisor', group: 'leadership', kdiRole: 'CEO', agentId: 'AGT-CEO-001', model: 'claude-sonnet-5-5' },
    { n: 'Naya', initials: 'NY', gender: 'female', role: 'Account Manager', group: 'marketing', kdiRole: 'ACCOUNT_MANAGER', agentId: 'AGT-SALES-001', model: 'claude-sonnet-5-5' },
    { n: 'Kak Rani', initials: 'KR', gender: 'female', role: 'Social Media Specialist', group: 'marketing', kdiRole: 'MARKETING_SPECIALIST', agentId: 'AGT-MKT-001', model: 'claude-sonnet-5-5' },
    { n: 'Kak Dewi', initials: 'KD', gender: 'female', role: 'Digital Marketing', group: 'marketing', kdiRole: 'DIGITAL_MARKETING', agentId: 'AGT-MKT-002', model: 'gpt-4o-mini' },
    { n: 'Farhan', initials: 'FH', gender: 'male', role: 'AI Software Engineer', group: 'engineering', kdiRole: 'SOFTWARE_ENGINEER', agentId: 'AGT-ENG-001', model: 'ollama:qwen2.5-coder:7b' },
    { n: 'Ahmad', initials: 'AH', gender: 'male', role: 'AI System Architect', group: 'engineering', kdiRole: 'SYSTEM_ARCHITECT', agentId: 'AGT-ARCH-001', model: 'groq:llama-3.3-70b-versatile' },
    { n: 'Maya', initials: 'MY', gender: 'female', role: 'AI QA Engineer', group: 'engineering', kdiRole: 'QA_ENGINEER', agentId: 'AGT-QA-001', model: 'ollama:qwen2.5-coder:7b' },
    { n: 'Bagas', initials: 'BG', gender: 'male', role: 'Frontend Engineer', group: 'engineering', kdiRole: 'FRONTEND_ENGINEER', agentId: 'AGT-ENG-002', model: 'ollama:qwen2.5-coder:7b' },
    { n: 'Rizky', initials: 'RH', gender: 'male', role: 'Backend Engineer', group: 'engineering', kdiRole: 'BACKEND_ENGINEER', agentId: 'AGT-ENG-003', model: 'ollama:qwen2.5-coder:7b' },
    { n: 'Dr. Nadia', initials: 'ND', gender: 'female', role: 'AI Research Scientist', group: 'service', kdiRole: 'RESEARCHER', agentId: 'AGT-RES-001', model: 'openrouter:anthropic/claude-3.5-sonnet' },
    { n: 'Gilang', initials: 'GL', gender: 'male', role: 'Customer Service Lead', group: 'service', kdiRole: 'SUPPORT_LEAD', agentId: 'AGT-CS-001', model: 'claude-haiku-4-5' },
    { n: 'Kak Sinta', initials: 'KS', gender: 'female', role: 'Customer Service', group: 'service', kdiRole: 'SUPPORT_AGENT', agentId: 'AGT-CS-002', model: 'claude-haiku-4-5' }
  ];

  let currentTeam = [...KDI_DEFAULT_TEAM];

  // Helper mappings between KDI Studio names and KDI roles/agentIds
  function nameToKdiRole(name) {
    const member = currentTeam.find(m => m.n === name || name.includes(m.n));
    return member?.kdiRole || 'SOFTWARE_ENGINEER';
  }

  function kdiRoleToName(role) {
    const member = currentTeam.find(m => m.kdiRole === role || m.agentId === role);
    return member ? member.n : 'Farhan';
  }

  // ── 2. STATUS MAPPING ───────────────────────────────────────────────────
  function kdiToKantorStatus(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'PENDING' || s === 'QUEUED' || s === 'PLANNING') return 'queued';
    if (s === 'IN_PROGRESS' || s === 'WORKING' || s === 'RUNNING' || s === 'ACTIVE') return 'active';
    if (s === 'BLOCKED' || s === 'WAITING_INPUT' || s === 'FAILED') return 'blocked';
    if (s === 'REVIEW' || s === 'IN_REVIEW' || s === 'APPROVAL_REQUIRED') return 'review';
    if (s === 'DONE' || s === 'COMPLETED' || s === 'RESOLVED') return 'done';
    return 'queued';
  }

  function kantorToKdiStatus(status) {
    switch (status) {
      case 'active': return 'IN_PROGRESS';
      case 'blocked': return 'BLOCKED';
      case 'review': return 'APPROVAL_REQUIRED';
      case 'done': return 'DONE';
      case 'queued':
      default: return 'PENDING';
    }
  }

  // ── 3. FETCH INTERCEPTION FOR /api/agents AND /api/tasks ──────────────────
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : (input?.url || '');

    // Intercept /api/agents
    if (url === '/api/agents' || url.endsWith('/api/agents')) {
      try {
        const res = await originalFetch(`${KDI_API_BASE}/office/agents`, {
          headers: { ...getAuthHeader() }
        }).catch(() => null);

        const members = {};
        for (const m of currentTeam) {
          members[m.n] = { role: m.role, model: m.model };
        }

        return new Response(JSON.stringify({
          mode: 'kdi',
          model: 'KDI Autonomous Multi-Agent',
          members
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        // Fallback
        const members = {};
        for (const m of currentTeam) members[m.n] = { role: m.role, model: m.model };
        return new Response(JSON.stringify({ mode: 'kdi', model: 'KDI AI Engine', members }), { status: 200 });
      }
    }

    // Intercept /api/tasks (GET / POST)
    if (url === '/api/tasks' || url.endsWith('/api/tasks')) {
      const method = (init?.method || 'GET').toUpperCase();

      if (method === 'GET') {
        try {
          const res = await originalFetch(`${KDI_API_BASE}/tasks`, {
            headers: { ...getAuthHeader() }
          });
          if (res.ok) {
            const data = await res.json();
            const list = (data.data || (Array.isArray(data) ? data : [])).map(t => ({
              id: t.taskId || t.id,
              title: t.title || 'Untitled Task',
              assignee: kdiRoleToName(t.assignedAgent),
              brief: t.description || '',
              status: kdiToKantorStatus(t.status),
              result: t.workingBranch ? `Working Branch: ${t.workingBranch}` : (t.description || ''),
              createdAt: t.createdAt || new Date().toISOString(),
              updatedAt: t.updatedAt
            }));
            return new Response(JSON.stringify(list), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        } catch (_) {}
      }

      if (method === 'POST') {
        try {
          const body = JSON.parse(init?.body || '{}');
          const kdiPayload = {
            title: body.title,
            description: body.brief || '',
            assignedAgent: nameToKdiRole(body.assignee),
            status: kantorToKdiStatus(body.status)
          };
          const res = await originalFetch(`${KDI_API_BASE}/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader()
            },
            body: JSON.stringify(kdiPayload)
          });
          if (res.ok) {
            const created = await res.json();
            const kantorTask = {
              id: created.taskId || created.id,
              title: created.title,
              assignee: body.assignee,
              brief: body.brief || '',
              status: body.status || 'queued',
              result: '',
              createdAt: created.createdAt || new Date().toISOString()
            };
            return new Response(JSON.stringify(kantorTask), { status: 201, headers: { 'Content-Type': 'application/json' } });
          }
        } catch (_) {}
      }
    }

    // Intercept /api/tasks/:id (PATCH)
    const taskMatch = url.match(/\/api\/tasks\/([^/?#]+)/);
    if (taskMatch && (init?.method || '').toUpperCase() === 'PATCH') {
      const taskId = taskMatch[1];
      try {
        const body = JSON.parse(init?.body || '{}');
        const kdiUpdates = {};
        if (body.status) kdiUpdates.status = kantorToKdiStatus(body.status);
        if (body.action === 'approve') {
          kdiUpdates.status = 'DONE';
          kdiUpdates.result = 'Approved by manager';
        }
        if (body.action === 'revise') {
          kdiUpdates.status = 'IN_PROGRESS';
          kdiUpdates.feedback = body.feedback;
        }
        if (body.assignee) kdiUpdates.assignedAgent = nameToKdiRole(body.assignee);
        if (body.result) kdiUpdates.result = body.result;

        const res = await originalFetch(`${KDI_API_BASE}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify(kdiUpdates)
        });
        if (res.ok) {
          const updated = await res.json();
          const kantorTask = {
            id: updated.taskId || taskId,
            title: updated.title,
            assignee: kdiRoleToName(updated.assignedAgent),
            brief: updated.description || '',
            status: kdiToKantorStatus(updated.status),
            result: updated.result || '',
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt
          };
          return new Response(JSON.stringify(kantorTask), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (_) {}
    }

    return originalFetch(input, init);
  };

  // ── 4. WEBSOCKET REALTIME TELEMETRY BRIDGE ───────────────────────────────
  let ws = null;
  function connectWebSocket() {
    try {
      ws = new WebSocket(KDI_WS_URL);
      ws.onopen = () => {
        if (window.officeLog) {
          window.officeLog('Connected to KDI Realtime Telemetry Gateway', 'engineering');
        }
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleRealtimeEvent(msg);
        } catch (_) {}
      };
      ws.onclose = () => {
        setTimeout(connectWebSocket, 5000);
      };
    } catch (_) {
      setTimeout(connectWebSocket, 10000);
    }
  }

  function handleRealtimeEvent(envelope) {
    if (!envelope || !envelope.eventType) return;
    const type = envelope.eventType;
    const payload = envelope.payload || {};

    let logText = '';
    let group = 'engineering';

    switch (type) {
      case 'TASK_STATUS_CHANGED':
      case 'TASK_UPDATED':
        logText = `Task ${payload.taskId || ''} updated: ${payload.status || ''}`;
        break;
      case 'AGENT_STATUS_CHANGED':
        logText = `${payload.agentName || payload.agentId || 'Agent'} status: ${payload.state || ''}`;
        break;
      case 'OFFICE_PRAYER_SESSION_STARTED':
        logText = `Adzan / Prayer time started (${payload.prayerName || 'Dhuhr'}). Congregation gathering in Musholla.`;
        group = 'service';
        break;
      case 'OFFICE_MEETING_STARTED':
        logText = `Collaborative Session: ${payload.title || 'Architecture Sync'} in glass meeting room.`;
        group = 'leadership';
        break;
      case 'AUTONOMY_APPROVAL_REQUESTED':
        logText = `Approval required: ${payload.action || 'Deploy'} (${payload.riskLevel || 'HIGH'})`;
        group = 'leadership';
        break;
      default:
        if (payload.message) logText = payload.message;
    }

    if (logText) {
      document.dispatchEvent(new CustomEvent('officelog:event', { detail: { text: logText, group } }));
    }
    document.dispatchEvent(new CustomEvent('officetasks:change'));
  }

  // Auto-connect WS when page loads
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(connectWebSocket, 1000);
    });
  }

  // ── 5. EXPORT ADAPTER INTERFACE ──────────────────────────────────────────
  window.kdiOfficeAdapter = {
    getTeam() {
      return currentTeam;
    },
    setTeam(team) {
      if (Array.isArray(team) && team.length > 0) {
        currentTeam = team;
      }
    },
    getApiUrl() {
      return KDI_API_BASE;
    },
    getWsUrl() {
      return KDI_WS_URL;
    }
  };
})();
