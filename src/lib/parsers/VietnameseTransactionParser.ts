export interface ParsedTransaction {
  transaction_ref?: string;          // Extracted reference number
  effective_date?: string;           // Extracted date, e.g. "12/03/2026 13:28:56"
  debit_amount: number;
  credit_amount: number;
  amount: number;                    // The actual money movement
  direction: 'in' | 'out';           // 'in' (credit) or 'out' (debit)
  balance_after?: number;
  raw_description: string;           // Original unmodified description text
  normalized_description: string;    // Cleaned, trimmed spaces, lower case
  no_accent_description: string;     // Removed Vietnamese accents for keyword matching
  sender_name?: string;              // Heuristic: Name of person/company sending money
  sender_bank?: string;              // Heuristic: Name of sending bank
  sender_account_hint?: string;      // Heuristic: Sender account number
  transfer_ref?: string;             // E.g., FTxxxx, CRE-xxx
}

/**
 * Normalizes Vietnamese string to standard lowercase ASCII
 * Heuristic: Helps with text matching in rule engines
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|MỠ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Combine diacritical marks
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // ̀ ́ ̃ ̉ ̣
  str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // ˆ ̆ ̛
  return str.toLowerCase().trim();
}

/**
 * Parse a raw transaction string mapping into the ParsedTransaction object.
 */
export class VietnameseTransactionParser {
  
  /**
   * Parse a single row or raw string block.
   * Example Input: "08312td0-87Xszblpj | 12/03/2026 13:28:56 | 0 | 200000 | 3128672564 | TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974 -CTLNHIDI000014665179416-1/1-CRE-002"
   */
  public parseLine(rawLine: string): ParsedTransaction {
    const parts = rawLine.split('|').map(p => p.trim());
    
    // Fallback default output if it's not the pipe-delimited format you gave
    if (parts.length < 6) {
      return this.parseDescriptionOnly(rawLine);
    }

    const transaction_ref = parts[0];
    const effective_date = parts[1];
    const debit_amount = parseFloat(parts[2].replace(/[^\d.-]/g, '')) || 0;
    const credit_amount = parseFloat(parts[3].replace(/[^\d.-]/g, '')) || 0;
    const balance_after = parseFloat(parts[4].replace(/[^\d.-]/g, '')) || 0;
    const raw_description = parts[5] || '';

    const direction = credit_amount > 0 ? 'in' : 'out';
    const amount = credit_amount > 0 ? credit_amount : debit_amount;

    const parsedDesc = this.parseDescriptionOnly(raw_description);
    
    // We explicitly overwrite the 0 defaults from parseDescriptionOnly with actual amounts
    const { debit_amount: _d, credit_amount: _c, amount: _a, direction: _dir, ...descDetails } = parsedDesc;

    return {
      transaction_ref,
      effective_date,
      debit_amount,
      credit_amount,
      amount,
      direction,
      balance_after,
      ...descDetails,
    };
  }

  public parseDescriptionOnly(rawDesc: string): ParsedTransaction {
    const normalized_description = rawDesc.replace(/\s+/g, ' ').trim().toLowerCase();
    const no_accent_description = removeVietnameseTones(normalized_description);

    let sender_account_hint: string | undefined = undefined;
    let sender_bank: string | undefined = undefined;
    let sender_name: string | undefined = undefined;
    let transfer_ref: string | undefined = undefined;

    // --- Heuristic 1: Account Number ---
    // Match "TKThe :19021015184017" or "tu tk 12345"
    const accMatch = rawDesc.match(/(?:TKThe\s*:\s*|tu\s+tk\s+)(\d{6,20})/i);
    if (accMatch && accMatch[1]) {
      sender_account_hint = accMatch[1];
    }

    // --- Heuristic 2: Bank Name ---
    // Match "tai Techcombank." or "tai BIDV"
    const bankMatch = rawDesc.match(/tai\s+([A-Za-z]+)(?:\.|,|\s|$)/i);
    if (bankMatch && bankMatch[1]) {
      sender_bank = bankMatch[1].trim();
    }

    // --- Heuristic 3: Transfer References ---
    // Match "FT26071809742974" or "CRE-002" or "-CTLNHIDI..."
    const ftMatch = rawDesc.match(/(FT\d+)/i);
    const creMatch = rawDesc.match(/(CRE-\d+)/i);
    const ctMatch = rawDesc.match(/(-CTL\w+)/i);
    
    // We combine them if found
    const refs = [];
    if (ftMatch) refs.push(ftMatch[1]);
    if (creMatch) refs.push(creMatch[1]);
    if (refs.length > 0) {
       transfer_ref = refs.join(' | ');
    }

    // --- Heuristic 4: Sender Name (The hardest part) ---
    // Usually follows "tai [BankName]. [SENDER NAME] chuyen tien"
    // Or it's ALL CAPS before "chuyen tien"
    const nameMatch = rawDesc.match(/(?:\.|tai\s+[A-Za-z]+[\.,]?)\s*([A-Z\s]+)\s+chuyen tien/);
    if (nameMatch && nameMatch[1]) {
       sender_name = nameMatch[1].trim();
    } else {
        // Fallback: look for ALL CAPS string of 2-5 words before the word "chuyen"
       const altNameMatch = rawDesc.match(/([A-Z][A-Z\s]{3,30}?)\s+chuyen/);
       if(altNameMatch && altNameMatch[1]) {
          sender_name = altNameMatch[1].trim();
       }
    }

    return {
      raw_description: rawDesc,
      normalized_description,
      no_accent_description,
      sender_account_hint,
      sender_bank,
      sender_name,
      transfer_ref,
      debit_amount: 0,
      credit_amount: 0,
      amount: 0,
      direction: 'in' // default placeholder
    };
  }
}
