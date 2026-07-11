const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://svc02_auth:8002';
const PIPELINE_API_URL = process.env.PIPELINE_API_URL || 'http://svc_agents:8020';
const OPENWA_API_URL = process.env.OPENWA_API_URL || 'http://openwa-api:2785/api';
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || '';
const INTERNAL_TOKEN = process.env.WHATSAPP_INTERNAL_TOKEN || '';
const SESSION_ID = process.env.WA_SESSION_ID || 'aihps-prod';
const SESSION_UUID = process.env.OPENWA_SESSION_UUID || '';
const PORT = Number(process.env.WHATSAPP_GATEWAY_PORT || 3030);
const STAFF_ENABLED = (process.env.WA_ENABLE_STAFF_STREAM || 'true').toLowerCase() !== 'false';
const IGNORE_GROUPS = (process.env.WA_IGNORE_GROUPS || 'true').toLowerCase() !== 'false';
const WEBHOOK_SECRET = process.env.WA_WEBHOOK_SECRET || '';
const DATA_DIR = process.env.WA_DATA_DIR || '/app/data';
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const MTARGET_URL = process.env.MTARGET_URL || 'https://api-public-2.mtarget.fr/messages';
const MTARGET_USERNAME = process.env.MTARGET_USERNAME || '';
const MTARGET_PASSWORD = process.env.MTARGET_PASSWORD || '';
const MTARGET_SERVICE_ID = process.env.MTARGET_SERVICE_ID || '';

const VERIFY_TTL_MS = Number(process.env.WA_STAFF_VERIFY_TTL_MS || 10 * 60 * 1000);
const MAX_REPLY_LENGTH = Number(process.env.WA_MAX_REPLY_LENGTH || 3800);

let lastError = null;
let lastMessageAt = null;
let cachedOpenWaSessionId = SESSION_UUID;
let processed = new Set();
let state = loadState();

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { contacts: {}, staffAuth: {} };
  }
}

function saveState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeCameroonPhone(value) {
  const d = digits(value);
  if (!d) return '';
  if (d.startsWith('237')) return d;
  if (d.length === 9 && d.startsWith('6')) return `237${d}`;
  return d;
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function codeHash(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function newCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function sessionKeyFor(phone, stream) {
  return `whatsapp:${stream}:${phone}`;
}

function openwaHeaders() {
  return OPENWA_API_KEY ? { 'X-API-Key': OPENWA_API_KEY } : {};
}

function requireConfig() {
  const missing = [];
  if (!OPENWA_API_KEY) missing.push('OPENWA_API_KEY');
  if (!INTERNAL_TOKEN) missing.push('WHATSAPP_INTERNAL_TOKEN');
  if (!MTARGET_USERNAME) missing.push('MTARGET_USERNAME');
  if (!MTARGET_PASSWORD) missing.push('MTARGET_PASSWORD');
  if (missing.length) {
    console.warn(`[whatsapp-gateway] Missing optional/required config: ${missing.join(', ')}`);
  }
}

function extractMessage(payload) {
  const event = payload.event || payload.type || payload.eventType || payload.name || '';
  const data = payload.data || payload.payload || payload.message || payload;
  const message = data.message || data;
  const text =
    message.body ||
    message.text ||
    message.caption ||
    message.content ||
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    '';

  const chatId =
    message.chatId ||
    message.from ||
    message.remoteJid ||
    message.key?.remoteJid ||
    data.chatId ||
    data.from ||
    '';

  const id =
    message.id?._serialized ||
    message.id ||
    message.key?.id ||
    data.id ||
    `${chatId}:${text}:${payload.timestamp || Date.now()}`;

  return {
    event,
    id: String(id),
    text: String(text || '').trim(),
    chatId: String(chatId || ''),
    fromMe: Boolean(message.fromMe || message.key?.fromMe || data.fromMe),
    isGroup: Boolean(message.isGroupMsg || String(chatId).includes('@g.us')),
  };
}

function isMessageEvent(event) {
  const e = String(event || '').toLowerCase();
  return !e || e.includes('message') || e.includes('messages.upsert');
}

function senderPhoneFromChat(chatId) {
  return normalizeCameroonPhone(String(chatId || '').split('@')[0]);
}

async function resolveIdentity(phone) {
  if (!INTERNAL_TOKEN) {
    return publicIdentity(phone);
  }

  try {
    const response = await axios.get(`${AUTH_API_URL}/auth/whatsapp/identity`, {
      params: { phone },
      headers: { 'X-WhatsApp-Internal-Token': INTERNAL_TOKEN },
      timeout: 10000,
    });
    return normalizeIdentity(response.data, phone);
  } catch (error) {
    if (error.response?.status === 404) {
      return publicIdentity(phone);
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

function isGreeting(text) {
  return /^(hi|hello|hey|bonjour|bonsoir|salut|menu|help|start|\/start|\/help)$/i.test(text.trim());
}

function welcomeText(identity) {
  if (identity.stream === 'B') {
    return [
      'Welcome to AI-HPS WhatsApp staff mode.',
      'You can ask for hospital procedures, clinical guidelines, approvals, or department information.',
      'Example: "What is the hand hygiene procedure?"',
    ].join('\n');
  }
  return [
    'Welcome to AI-HPS WhatsApp.',
    'Ask a hospital procedure or visitor question and I will answer immediately from the hospital knowledge base.',
      'Example: "How should I clean my hands at the hospital?"',
  ].join('\n');
}

async function sendWhatsApp(chatId, text) {
  const clean = String(text || '').slice(0, MAX_REPLY_LENGTH);
  const openwaSessionId = await getOpenWaSessionId();
  const response = await axios.post(
    `${OPENWA_API_URL}/sessions/${openwaSessionId}/messages/send-text`,
    { chatId, text: clean },
    { headers: openwaHeaders(), timeout: 30000 }
  );
  return response.data;
}

async function getOpenWaSessionId() {
  if (cachedOpenWaSessionId) return cachedOpenWaSessionId;
  const response = await axios.get(`${OPENWA_API_URL}/sessions`, {
    headers: openwaHeaders(),
    timeout: 10000,
  });
  const sessions = Array.isArray(response.data) ? response.data : [];
  const found = sessions.find(item => item.name === SESSION_ID || item.id === SESSION_ID);
  if (!found) {
    throw new Error(`OpenWA session not found: ${SESSION_ID}`);
  }
  cachedOpenWaSessionId = found.id;
  return cachedOpenWaSessionId;
}

async function sendSms(phone, message) {
  if (!MTARGET_USERNAME || !MTARGET_PASSWORD) {
    throw new Error('MTarget SMS is not configured');
  }

  const normalizedPhone = normalizeCameroonPhone(phone);
  const form = new URLSearchParams();
  form.set('username', MTARGET_USERNAME);
  form.set('password', MTARGET_PASSWORD);
  form.set('msisdn', `+${normalizedPhone}`);
  form.set('msg', message);
  if (MTARGET_SERVICE_ID) form.set('serviceid', MTARGET_SERVICE_ID);

  const response = await axios.post(MTARGET_URL, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 45000,
  });
  const results = Array.isArray(response.data?.results) ? response.data.results : [];
  const failed = results.find(result => String(result.code) !== '0');
  console.log('[whatsapp-gateway] SMS provider response', {
    phone: normalizedPhone,
    status: response.status,
    data: safeJson(response.data),
  });
  if (!results.length || failed) {
    throw new Error(`MTarget SMS was not accepted: ${safeJson(response.data)}`);
  }
  return response.data;
}

async function ensureStaffVerified(identity, chatId, text) {
  if (identity.stream !== 'B') return true;

  const phone = identity.phone;
  const now = Date.now();
  const record = state.staffAuth[phone];
  if (record?.verified) return true;

  if (/^\d{6}$/.test(text) && record?.codeHash && record.expiresAt > now) {
    if (record.codeHash === codeHash(text)) {
      state.staffAuth[phone] = {
        verified: true,
        verifiedAt: new Date().toISOString(),
        userId: identity.user_id,
      };
      saveState();
      await sendWhatsApp(chatId, 'Staff verification successful. You can now ask staff procedure questions here.');
      return true;
    }
    await sendWhatsApp(chatId, 'That verification code is not correct. Reply RESEND to receive a new code.');
    return false;
  }

  const shouldSend = !record || record.expiresAt <= now || /^resend$/i.test(text);
  if (shouldSend) {
    const code = newCode();
    state.staffAuth[phone] = {
      verified: false,
      codeHash: codeHash(code),
      expiresAt: now + VERIFY_TTL_MS,
      userId: identity.user_id,
      sentAt: new Date().toISOString(),
    };
    saveState();
    await sendSms(phone, `AI-HPS staff verification code: ${code}. It expires in 10 minutes.`);
    console.log('[whatsapp-gateway] Staff verification SMS requested', {
      phone,
      userId: identity.user_id,
      expiresAt: state.staffAuth[phone].expiresAt,
    });
  }

  await sendWhatsApp(
    chatId,
    'For staff access, I sent a 6-digit verification code by SMS to your registered phone number. Reply here with that code. Reply RESEND if it expires.'
  );
  return false;
}

function answerText(output) {
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
    session_id: sessionKeyFor(identity.phone, identity.stream),
    chatbot_mode: true,
  };

  const response = await axios.post(`${PIPELINE_API_URL}/pipeline/query`, payload, {
    timeout: 120000,
  });
  return answerText(response.data.output);
}

async function handleIncoming(payload) {
  const message = extractMessage(payload);
  console.log('[whatsapp-gateway] Incoming webhook', {
    event: message.event || 'unknown',
    chatId: message.chatId,
    hasText: Boolean(message.text),
    fromMe: message.fromMe,
    isGroup: message.isGroup,
  });
  if (!isMessageEvent(message.event)) return { ignored: 'event' };
  if (!message.text || message.fromMe) return { ignored: 'empty_or_self' };
  if (IGNORE_GROUPS && message.isGroup) return { ignored: 'group' };
  if (processed.has(message.id)) return { ignored: 'duplicate' };

  processed.add(message.id);
  if (processed.size > 500) processed = new Set(Array.from(processed).slice(-250));

  const phone = senderPhoneFromChat(message.chatId);
  if (!phone) return { ignored: 'no_phone' };

  const identity = await resolveIdentity(phone);
  const contact = state.contacts[phone] || {};
  state.contacts[phone] = {
    ...contact,
    lastSeenAt: new Date().toISOString(),
    stream: identity.stream,
    accountType: identity.account_type,
  };
  saveState();

  if (identity.stream === 'B') {
    const ok = await ensureStaffVerified(identity, message.chatId, message.text);
    if (!ok) return { ok: true, action: 'verification_required' };
  }

  if (!contact.welcomed || isGreeting(message.text)) {
    state.contacts[phone].welcomed = true;
    saveState();
    if (isGreeting(message.text)) {
      await sendWhatsApp(message.chatId, welcomeText(identity));
      return { ok: true, action: 'welcome' };
    }
  }

  const answer = await askPipeline(message.text, identity);
  const prefix = contact.welcomed ? '' : `${welcomeText(identity)}\n\n`;
  await sendWhatsApp(message.chatId, `${prefix}${answer}`);
  return { ok: true, action: 'answered', stream: identity.stream };
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function writeJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function authorize(req) {
  if (!WEBHOOK_SECRET) return true;
  return req.headers['x-aihps-webhook-secret'] === WEBHOOK_SECRET;
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        writeJson(res, 200, {
          status: 'ok',
          service: 'whatsapp-gateway',
          session: SESSION_ID,
          openwa_session: SESSION_UUID || SESSION_ID,
          last_message_at: lastMessageAt,
          last_error: lastError,
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/webhooks/openwa') {
        if (!authorize(req)) {
          writeJson(res, 401, { error: 'unauthorized' });
          return;
        }

        const payload = await parseJsonBody(req);
        lastMessageAt = new Date().toISOString();
        const result = await handleIncoming(payload);
        writeJson(res, 200, result);
        return;
      }

      writeJson(res, 404, { error: 'not_found' });
    } catch (error) {
      lastError = error.message || String(error);
      console.error('[whatsapp-gateway] Request failed:', error.response?.data || error);
      writeJson(res, 500, { error: 'internal_error', detail: lastError });
    }
  });

  server.listen(PORT, () => {
    requireConfig();
    console.log(`[whatsapp-gateway] Listening on ${PORT}`);
  });
}

startServer();
