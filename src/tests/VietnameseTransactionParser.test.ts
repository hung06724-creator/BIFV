import { VietnameseTransactionParser, removeVietnameseTones } from '../lib/parsers/VietnameseTransactionParser';

describe('VietnameseTransactionParser', () => {
  const parser = new VietnameseTransactionParser();

  describe('removeVietnameseTones', () => {
    it('should lower case and remove accents', () => {
      const input = 'Tài Khoản Techcombank Lỗi Chuyển Tiền';
      const result = removeVietnameseTones(input);
      expect(result).toBe('tai khoan techcombank loi chuyen tien');
    });
  });

  describe('parseLine - Complete Row Extract', () => {
    it('should parse the full pipe-delimited sample output accurately', () => {
      const raw = "08312td0-87Xszblpj | 12/03/2026 13:28:56 | 0 | 200000 | 3128672564 | TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974 -CTLNHIDI000014665179416-1/1-CRE-002";
      const result = parser.parseLine(raw);
      
      expect(result.transaction_ref).toBe('08312td0-87Xszblpj');
      expect(result.effective_date).toBe('12/03/2026 13:28:56');
      expect(result.amount).toBe(200000);
      expect(result.direction).toBe('in');
      expect(result.balance_after).toBe(3128672564);
      
      // Heuristics
      expect(result.sender_account_hint).toBe('19021015184017');
      expect(result.sender_bank?.toLowerCase()).toBe('techcombank');
      expect(result.sender_name).toBe('PHAM THI NGOC BICH');
      expect(result.transfer_ref).toContain('FT26071809742974');
      expect(result.transfer_ref).toContain('CRE-002');
    });
  });

  describe('parseDescriptionOnly - Specific Edge Cases', () => {
    it('Case 1: Should extract BIDV bank and basic transfer', () => {
      const raw = "tu tk 1221700374 TRUONG CD NGHE CN HA NOI tai BIDV chi dong hoc phi";
      const result = parser.parseDescriptionOnly(raw);
      
      expect(result.sender_account_hint).toBe('1221700374');
      expect(result.sender_bank).toBe('BIDV');
    });

    it('Case 2: Should normalize Vietnamese accents for rule matching', () => {
      const raw = "Thanh toán học phí kỳ 2 cho Tạ Đức Chiến CD47CNC";
      const result = parser.parseDescriptionOnly(raw);
      
      expect(result.no_accent_description).toBe("thanh toan hoc phi ky 2 cho ta duc chien cd47cnc");
    });
    
    it('Case 3: Complex Transfer string with multiple IDs', () => {
       const raw = "TKThe :0731000688292, tai BFTVVNVX. MBVCB.13197021869.091362.chi dong hoc cho nguyen gia hieu.CT tu 0731000688292 DO THI HIEP toi 1221700374 TRUONG CD NGHE CN HA NOI tai BIDV -B2B020097043603011927432026DBuh091362";
       const result = parser.parseDescriptionOnly(raw);
       
       expect(result.sender_account_hint).toBe('0731000688292');
       // This is a complex case where two banks are mentioned, parser grabs the first one
       expect(result.sender_bank).toBe('BFTVVNVX'); 
    });

    it('Case 4: Empty string handling', () => {
      const raw = "   ";
      const result = parser.parseDescriptionOnly(raw);
      expect(result.normalized_description).toBe('');
    });

    it('Case 5: Sender Name heuristic fallback', () => {
      // Testing the ALL CAPS heuristic before the word "chuyen"
      const raw = "NGUYEN VAN A chuyen khoan thanh toan tien an";
      const result = parser.parseDescriptionOnly(raw);
      expect(result.sender_name).toBe('NGUYEN VAN A');
    });
  });
});
