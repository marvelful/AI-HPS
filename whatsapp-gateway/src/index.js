const http = require('http');
const axios = require('axios');
const { create } = require('@open-wa/wa-automate');

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://svc02_auth:8002';
const PIPELINE_API_URL = process.env.PIPELINE_API_URL || 'http://svc_agents:8020';
const INTERNAL_TOKEN = process.env.WHATSAPP_INTERNAL_TOKEN || '';
const SESSION_ID = process.env.WA_SESSION_ID || 'aihps-prod';
const HEALTH_PORT = Number(process.env.WHATSAPP_GATEWAY_PORT || 3030);
const IGNORE_GROUPS = (process.env.WA_IGNORE_GROUPS || 'true').toLowerCase() !== 'false';
const STAFF_ENABLED = (process.env.WA_ENABLE_STAFF_STREAM || 'true').toLowerCase() !== 'false';

let clientReady = false;
let lastError = null;

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function senderPhone(message) {
  return digits(message.sender?.id || message.from || message.chatId);
}

function sessionIdFor(phone, stream) {
  return `whatsapp:${stream}:${phone}`;
}

async function resolveIdentity(phone) {
  if (!INTERNAL_TOKEN) {
    return { matched: false, stream: 'A', account_type: 'anonymous', role: 'patient' };
  }

  try {
    const response = await axios.get(`${AUTH_API_URL}/auth/whatsapp/identity`, {
      params: { phone },
      headers: { 'X-WhatsApp-Internal-Token': INTERNAL_TOKEN },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    if (status === 404) {
      return { matched: false, stream: 'A', account_type: 'anonymous', role: 'patient' };
    }
    throw error;
  }
}

function publicIdentity(phone) {
  return {
    matched: false,
    stream: 'A',
    account_type: 'anonymous',
    role: 'patient',
    user_id: null,
    full_name: null,
    phone,
  };
}

function normalizeIdentity(identity, phone) {
  if (!identity || !identity.matched) {
    return publicIdentity(phone);
  }

  const stream = STAFF_ENABLED && identity.stream === 'B' ? 'B' : 'A';
  return {
    ...identity,
    stream,
    role: stream === 'B' ? identity.role || 'staff' : 'patient',
    phone,
  };
}

function toText(output) {
  if (!output) return 'No answer was generated. Please try again.';
  if (typeof output === 'string') return output;
  if (output.message) return output.message;
  if (output.data?.answer) return output.data.answer;
  if (output.found === false && output.message) return output.message;
  return JSON.stringify(output, null, 2);
}

async function askPipeline(text, identity) {
  const payload = {
    raw_query: text,
    platform: 'whatsapp',
    stream: identity.stream,
    user_id: identity.user_id || null,
    user_role: identity.role,
    session_id: sessionIdFor(identity.phone, identity.stream),
    chatbot_mode: true,
  };

  const response = await axios.post(`${PIPELINE_API_URL}/pipeline/query`, payload, {
    timeout: 120000,
  });
  return toText(response.data.output);
}

function helpText(identity) {
  if (identity.stream === 'B') {
    return 'AI-HPS WhatsApp staff mode is active for your registered staff number. Ask for hospital procedures, guidelines, or department information.';
  }
  return 'AI-HPS WhatsApp patient mode is active. Ask public hospital questions such as hand hygiene, department information, or visitor guidance.';
}

async function handleMessage(client, message) {
  const text = String(message.body || '').trim();
  if (!text || message.fromMe) return;
  if (IGNORE_GROUPS && message.isGroupMsg) return;

  const phone = senderPhone(message);
  if (!phone) return;

  try {
    const identity = normalizeIdentity(await resolveIdentity(phone), phone);
    if (/^\/?(help|start)$/i.test(text)) {
      await client.sendText(message.from, helpText(identity));
      return;
    }

    const reply = await askPipeline(text, identity);
    await client.sendText(message.from, reply.slice(0, 3900));
  } catch (error) {
    lastError = error.message || String(error);
    console.error('[whatsapp-gateway] Message handling failed:', error.response?.data || error);
    await client.sendText(
      message.from,
      'AI-HPS could not process your WhatsApp request right now. Please try again later.'
    );
  }
}

function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url !== '/health') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    const status = clientReady ? 200 : 503;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: clientReady ? 'ok' : 'starting',
      service: 'whatsapp-gateway',
      session: SESSION_ID,
      last_error: lastError,
    }));
  });
  server.listen(HEALTH_PORT, () => {
    console.log(`[whatsapp-gateway] Health server listening on ${HEALTH_PORT}`);
  });
}

async function main() {
  startHealthServer();

  const client = await create({
    sessionId: SESSION_ID,
    multiDevice: true,
    headless: true,
    useChrome: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    qrTimeout: 0,
    authTimeout: 0,
    restartOnCrash: start => start(),
    cacheEnabled: false,
  });

  clientReady = true;
  console.log('[whatsapp-gateway] WhatsApp client ready');
  client.onMessage(message => handleMessage(client, message));
}

main().catch(error => {
  lastError = error.message || String(error);
  console.error('[whatsapp-gateway] Fatal startup error:', error);
  process.exit(1);
});
