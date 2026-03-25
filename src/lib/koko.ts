import crypto from 'crypto';

const getFirstDefined = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return undefined;
};

const normalizePem = (raw?: string) => {
  if (!raw) return '';
  return raw.replace(/\\n/g, '\n').trim();
};

const isPemBlock = (value: string, beginLabel: string, endLabel: string) => {
  return value.includes(`-----BEGIN ${beginLabel}-----`) && value.includes(`-----END ${endLabel}-----`);
};

export const getKokoConfig = () => {
  const merchantId = getFirstDefined('KOKO_MERCHANT_ID', 'koko_Merchant_ID');
  const apiKey = getFirstDefined('KOKO_API_KEY', 'koko_API_Key');
  const publicKey = normalizePem(getFirstDefined('KOKO_PUBLIC_KEY', 'koko_Public_Key'));
  const privateKey = normalizePem(getFirstDefined('KOKO_PRIVATE_KEY', 'koko_Private_Key'));
  const baseUrl = getFirstDefined('KOKO_BASE_URL', 'koko_Base_Url') || 'https://qaapi.paykoko.com';
  const pluginName = getFirstDefined('KOKO_PLUGIN_NAME', 'koko_Plugin_Name') || 'customapi';
  const pluginVersion = getFirstDefined('KOKO_PLUGIN_VERSION', 'koko_Plugin_Version') || '1';

  if (!merchantId || !apiKey || !publicKey || !privateKey) {
    throw new Error('Koko credentials are missing or incomplete in environment variables.');
  }

  if (!isPemBlock(publicKey, 'PUBLIC KEY', 'PUBLIC KEY')) {
    throw new Error('Koko public key format is invalid. Store it as a full PEM block in KOKO_PUBLIC_KEY.');
  }

  const hasPkcs1RsaBlock = isPemBlock(privateKey, 'RSA PRIVATE KEY', 'RSA PRIVATE KEY');
  const hasPkcs8Block = isPemBlock(privateKey, 'PRIVATE KEY', 'PRIVATE KEY');
  if (!hasPkcs1RsaBlock && !hasPkcs8Block) {
    throw new Error('Koko private key format is invalid. Store it as a full PEM block in KOKO_PRIVATE_KEY.');
  }

  // Validate that keys can be parsed (fail early if there are format issues)
  try {
    crypto.createPublicKey({ key: publicKey, format: 'pem' });
  } catch (error) {
    throw new Error(
      `Koko public key is invalid or corrupted. ${error instanceof Error ? error.message : ''}`
    );
  }

  try {
    crypto.createPrivateKey({ key: privateKey, format: 'pem' });
  } catch (error) {
    throw new Error(
      `Koko private key is invalid or corrupted. Ensure it is a valid PKCS#1 (-----BEGIN RSA PRIVATE KEY-----) or PKCS#8 (-----BEGIN PRIVATE KEY-----) format key. ${
        error instanceof Error ? error.message : ''
      }`
    );
  }

  return {
    merchantId,
    apiKey,
    publicKey,
    privateKey,
    baseUrl,
    pluginName,
    pluginVersion,
  };
};

export const buildKokoOrderCreateDataString = (args: {
  merchantId: string;
  amount: string;
  currency: string;
  pluginName: string;
  pluginVersion: string;
  returnUrl: string;
  cancelUrl: string;
  orderId: string;
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  description: string;
  apiKey: string;
  responseUrl: string;
}) => {
  return (
    args.merchantId +
    args.amount +
    args.currency +
    args.pluginName +
    args.pluginVersion +
    args.returnUrl +
    args.cancelUrl +
    args.orderId +
    args.reference +
    args.firstName +
    args.lastName +
    args.email +
    args.description +
    args.apiKey +
    args.responseUrl
  );
};

export const buildKokoOrderViewDataString = (args: {
  merchantId: string;
  pluginName: string;
  pluginVersion: string;
  orderId: string;
  apiKey: string;
}) => {
  return args.merchantId + args.pluginName + args.pluginVersion + args.orderId + args.apiKey;
};

export const signKokoDataString = (dataString: string, privateKey: string) => {
  try {
    // Create a KeyObject from the PEM-formatted private key
    // This ensures proper parsing of PKCS#1 format keys
    const keyObject = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem',
    });
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(dataString);
    signer.end();
    return signer.sign(keyObject, 'base64');
  } catch (error) {
    throw new Error(
      `Failed to sign Koko data string. Ensure the private key is a valid PKCS#1 or PKCS#8 RSA private key. Error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

export const verifyKokoSignature = (dataString: string, signature: string, publicKey: string) => {
  try {
    // Create a KeyObject from the PEM-formatted public key
    const keyObject = crypto.createPublicKey({
      key: publicKey,
      format: 'pem',
    });
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(dataString);
    verifier.end();
    return verifier.verify(keyObject, signature, 'base64');
  } catch (error) {
    console.error('Koko signature verification failed:', error);
    return false;
  }
};

export type KokoOrderViewResponse = {
  orderId?: string;
  trnId?: string;
  status?: string;
  desc?: string;
  signature?: string;
};

type InternalOrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

const readStringField = (record: Record<string, unknown>, candidates: string[]) => {
  const normalizedMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    normalizedMap.set(key.toLowerCase(), value);
  }

  for (const candidate of candidates) {
    const value = normalizedMap.get(candidate.toLowerCase());
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }

  return undefined;
};

const collectNestedRecords = (value: unknown, out: Record<string, unknown>[], depth = 0) => {
  if (!value || typeof value !== 'object' || depth > 6) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectNestedRecords(item, out, depth + 1);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  out.push(record);
  for (const nested of Object.values(record)) {
    collectNestedRecords(nested, out, depth + 1);
  }
};

const readFromNestedPayload = (payload: unknown, candidates: string[]) => {
  const records: Record<string, unknown>[] = [];
  collectNestedRecords(payload, records);

  for (const record of records) {
    const found = readStringField(record, candidates);
    if (found) return found;
  }

  return undefined;
};

const parseKokoOrderViewPayload = (payload: unknown): KokoOrderViewResponse => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const read = (candidates: string[]) => readFromNestedPayload(payload, candidates);

  return {
    orderId: read(['orderId', '_orderId', 'order_id', 'merchantOrderId', 'reference']),
    trnId: read(['trnId', 'trnID', 'transactionId', 'transaction_id', '_trnId', 'paymentId']),
    status: read(['status', 'paymentStatus', 'orderStatus', '_status', 'state', 'result']),
    desc: read(['desc', 'description', 'message', 'statusMessage', 'resultMessage']),
    signature: read(['signature', 'sign', 'hash']),
  };
};

export const fetchKokoOrderView = async (orderId: string): Promise<KokoOrderViewResponse> => {
  const config = getKokoConfig();
  const dataString = buildKokoOrderViewDataString({
    merchantId: config.merchantId,
    pluginName: config.pluginName,
    pluginVersion: config.pluginVersion,
    orderId,
    apiKey: config.apiKey,
  });
  const signature = signKokoDataString(dataString, config.privateKey);

  const body = new URLSearchParams({
    _mId: config.merchantId,
    _pluginName: config.pluginName,
    _pluginVersion: config.pluginVersion,
    api_key: config.apiKey,
    _orderId: orderId,
    signature,
  });

  const response = await fetch(`${config.baseUrl}/api/merchants/orderView`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Koko orderView failed with status ${response.status}: ${raw}`);
  }

  try {
    return parseKokoOrderViewPayload(JSON.parse(raw));
  } catch {
    const params = new URLSearchParams(raw);
    return {
      orderId:
        params.get('orderId') ||
        params.get('_orderId') ||
        params.get('order_id') ||
        params.get('merchantOrderId') ||
        undefined,
      trnId:
        params.get('trnId') ||
        params.get('trnID') ||
        params.get('transactionId') ||
        params.get('transaction_id') ||
        params.get('_trnId') ||
        undefined,
      status:
        params.get('status') ||
        params.get('paymentStatus') ||
        params.get('orderStatus') ||
        params.get('_status') ||
        params.get('state') ||
        params.get('result') ||
        undefined,
      desc:
        params.get('desc') ||
        params.get('description') ||
        params.get('message') ||
        params.get('statusMessage') ||
        params.get('resultMessage') ||
        undefined,
      signature: params.get('signature') || params.get('sign') || params.get('hash') || undefined,
    };
  }
};

export const mapKokoStatusToOrderStatus = (status?: string) => {
  const normalized = (status || '').trim().toUpperCase();

  // Treat all known successful/settled gateway states as paid.
  if (
    [
      'SUCCESS',
      'SUCCEEDED',
      'PAID',
      'COMPLETED',
      'COMPLETE',
      'CAPTURED',
      'SETTLED',
      'AUTHORISED',
      'AUTHORIZED',
    ].includes(normalized)
  ) {
    return 'PAID';
  }

  // Treat terminal failure states as cancelled.
  if (
    [
      'FAILED',
      'FAILURE',
      'DECLINED',
      'ERROR',
      'CANCEL',
      'CANCELED',
      'CANCELLED',
      'VOIDED',
      'REVERSED',
      'EXPIRED',
    ].includes(normalized)
  ) {
    return 'CANCELLED';
  }

  return 'PENDING';
};

export const inferKokoOrderStatus = (args: {
  status?: string;
  desc?: string;
  trnId?: string;
}): InternalOrderStatus => {
  const description = (args.desc || '').trim().toUpperCase();
  // Explicit failure signals from gateway description must always win.
  if (/PAYMENTGATEWAYTRANSACTION\.PAYMENT\.FAILED|TRANSACTION.*FAILED|PAYMENT.*FAILED|FAIL|FAILED|DECLIN|CANCEL|CANCELLED|CANCELED|VOID|EXPIRE|ERROR/.test(description)) {
    return 'CANCELLED';
  }

  const direct = mapKokoStatusToOrderStatus(args.status);
  if (direct !== 'PENDING') return direct;

  if (/SUCCESS|SUCCEED|PAID|COMPLETE|CAPTURED|SETTLED|AUTHORI[ZS]ED/.test(description)) {
    return 'PAID';
  }

  return 'PENDING';
};

export const canTransitionOrderStatus = (current: string, next: InternalOrderStatus) => {
  const normalizedCurrent = (current || '').trim().toUpperCase();

  // Keep terminal states sticky.
  if (normalizedCurrent === 'PAID') return false;
  if (normalizedCurrent === 'CANCELLED' && next === 'PENDING') return false;

  return normalizedCurrent !== next;
};
