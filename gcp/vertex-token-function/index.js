/**
 * Cloud Function (2nd gen) que devolve um access token OAuth 2.0 para o Vertex AI.
 * Uso: a Edge Function do Supabase chama esta URL com um header secreto e usa o token
 * em AI_CHAT_API_KEY para chamar o endpoint Vertex (OpenAI-compatible).
 *
 * Variáveis de ambiente:
 *   TOKEN_SECRET     - Valor que o cliente deve enviar no header X-Token-Secret (ou Authorization: Bearer TOKEN_SECRET).
 *   GOOGLE_APPLICATION_CREDENTIALS_JSON - JSON completo da chave da conta de serviço (string).
 *
 * Ou: use Secret Manager e defina as mesmas chaves nos secrets da função.
 */

const { GoogleAuth } = require('google-auth-library');

let cachedToken = null;
let cachedTokenExpiry = 0;
const CACHE_BUFFER_SECONDS = 300; // Renovar 5 min antes de expirar

function getCredentials() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw || typeof raw !== 'string') {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON não definido');
  }
  let jsonStr = raw.trim();
  // Secret Manager (--set-secrets) monta como caminho; env direto é o JSON em string
  if (!jsonStr.startsWith('{')) {
    const fs = require('fs');
    if (fs.existsSync(jsonStr)) jsonStr = fs.readFileSync(jsonStr, 'utf8');
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON inválido (JSON esperado)');
  }
}

function isAuthorized(req) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) return false;
  const headerSecret = req.headers['x-token-secret'];
  const authHeader = req.headers['authorization'];
  if (headerSecret === secret) return true;
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7) === secret) return true;
  return false;
}

async function getAccessToken() {
  const now = Date.now() / 1000;
  if (cachedToken && cachedTokenExpiry > now + CACHE_BUFFER_SECONDS) {
    return cachedToken;
  }
  const credentials = getCredentials();
  const auth = new GoogleAuth({ credentials });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) {
    throw new Error('Falha ao obter access token');
  }
  // Tokens do Google expiram em ~1 hora; cache por 55 min
  cachedToken = token;
  cachedTokenExpiry = now + 55 * 60;
  return token;
}

exports.vertexToken = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Token-Secret');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Não autorizado' });
    return;
  }

  try {
    const token = await getAccessToken();
    res.status(200).json({ token });
  } catch (e) {
    console.error('vertex-token error:', e.message);
    res.status(500).json({ error: 'Erro ao obter token', message: e.message });
  }
};
