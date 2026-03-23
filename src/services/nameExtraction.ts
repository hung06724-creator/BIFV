import Groq from 'groq-sdk';

// ─── Preprocessing ───────────────────────────────────────────────────────────

function preprocessText(text: string): string {
  let t = text.replace(/[^a-zA-Z0-9]+/g, ' ');
  t = t.replace(/([a-zA-Z])([\d])/g, '$1 $2');
  t = t.replace(/([\d])([a-zA-Z])/g, '$1 $2');
  t = t.replace(/\s+/g, ' ');
  t = t.replace(/[0-9]+/g, '');
  return t.trim();
}

// ─── Regex extraction ────────────────────────────────────────────────────────

export function extractNameWithRegex(
  message: string,
  pattern: RegExp,
): string {
  const processed = preprocessText(message);
  const match = pattern.exec(processed);
  if (!match) return '';
  const raw = match[1] ?? match[0];
  return raw.trim().replace(/\s+/g, ' ').toUpperCase() || '';
}

// ─── AI extraction (Groq) ───────────────────────────────────────────────────

interface NameResult {
  id: string;
  fullName: string;
}

const MODELS = [
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
];

const SYSTEM_PROMPT = `You are a bank employee who is determining the full name of the transferor based on the message in the transaction. If the name cannot be found it will be recorded as NULL

The input will be an array of JSON with the following structure:
[{"id": "ID of the message", "message": "Content of the transaction message"}]

The output will be an array of JSON with the following structure:
{"results": [{"id": "ID of the message","fullName": "Name of the sender in that message"},...]}\nNo explanation included, and there must be a space between the last name, middle name and first name.`;

const FEW_SHOT_USER_1 = `[{"id":"0","message":"TKThe  tai MSCBVNVX XHB  BUIMANHDUNG    B  B  S  Z"}]`;
const FEW_SHOT_ASST_1 = `{"results": [{"id": "0", "fullName": "BUI MANH DUNG"}]}`;

const FEW_SHOT_USER_2 = `[{"id":"0","message":"TKThe  tai VCB MBVCB   CD  DL  DinhQuocTuan Dong hoc phi ki    em xin phep nop truoc    CT tu  DINH QUOC TUAN toi  TRUON CTLNHIDI   CRE"},{"id":"1","message":"TKThe  tai MSCBVNVX to viet anh chuyen tien XHB   B  B  N  M"},{"id":"2","message":"CHUYEN TIEN GIANG DAY LOP  NHLSP"},{"id":"3","message":"REM  CI  B O BAO HIEM XA HOI QUAN DONG DA F O  TRUONG CAO DANG NGHE CONG NGHIEP HA NOI DTLS REF  HOAN DONG TRUNG BHYT HSSV THEO QD  NGAY    UNC  Bank Charge  VAT"},{"id":"4","message":"NGUYEN THANH DAT lop cd  oto  ck HPHK  nam hoc"},{"id":"5","message":"TKThe  tai TCB Bui Hai Duong nop hoc phi FT  CTLNHIDI    CRE"}]`;
const FEW_SHOT_ASST_2 = `{"results": [{"id": "0", "fullName": "DINH QUOC TUAN"},{"id": "1", "fullName": "TO VIET ANH"},{"id": "2", "fullName": "NULL"},{"id": "3", "fullName": "NULL"},{"id": "4", "fullName": "NGUYEN THANH DAT"},{"id": "5", "fullName": "BUI HAI DUONG"}]}`;

export async function extractNamesWithAI(
  items: { id: string; message: string }[],
  apiKey: string,
  onBatchDone?: (results: NameResult[], processed: number, total: number) => void,
): Promise<NameResult[]> {
  const BATCH_SIZE = 10;
  const allResults: NameResult[] = [];

  const prepared = items.map((item) => ({
    id: item.id,
    message: preprocessText(item.message),
  }));

  for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
    const batch = prepared.slice(i, i + BATCH_SIZE);
    const modelIdx = Math.floor(i / BATCH_SIZE) % MODELS.length;

    let batchResults: NameResult[];
    try {
      batchResults = await callGroq(batch, apiKey, MODELS[modelIdx]);
    } catch {
      batchResults = batch.map((b) => ({ id: b.id, fullName: 'ERROR' }));
    }

    allResults.push(...batchResults);
    onBatchDone?.(batchResults, Math.min(i + BATCH_SIZE, prepared.length), prepared.length);

    if (i + BATCH_SIZE < prepared.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return allResults;
}

async function callGroq(
  batch: { id: string; message: string }[],
  apiKey: string,
  model: string,
): Promise<NameResult[]> {
  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

  const result = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: FEW_SHOT_USER_1 },
      { role: 'assistant', content: FEW_SHOT_ASST_1 },
      { role: 'user', content: FEW_SHOT_USER_2 },
      { role: 'assistant', content: FEW_SHOT_ASST_2 },
      { role: 'user', content: JSON.stringify(batch) },
    ],
    model,
    temperature: 0.6,
    max_tokens: 8000,
    top_p: 1,
    stream: false,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(result.choices[0].message.content || '{}');
  return (parsed.results ?? []) as NameResult[];
}
