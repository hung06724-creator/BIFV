import { ClassificationService } from '../services/classification.service';
import { ClassificationRule, BankTransaction } from '../domain/types';

describe('ClassificationService Engine', () => {
  const service = new ClassificationService();

  const mockTx = (raw_desc: string, normalized_amount: number = 0): BankTransaction => ({
    id: 'tx-123',
    batch_id: 'batch-1',
    raw_date: '01/01/2026',
    raw_desc,
    raw_amount: normalized_amount.toString(),
    normalized_date: '2026-01-01',
    normalized_amount,
    type: normalized_amount >= 0 ? 'credit' : 'debit',
    status: 'pending_classification',
    created_at: '',
    updated_at: ''
  });

  const exactRule: ClassificationRule = {
    id: 'rule-exact', category_id: 'cat-1', keyword: 'le phi tuyen sinh k49', 
    type: 'exact', priority: 1, is_active: true, created_at: '', updated_at: '', stop_on_match: true
  };

  const regexRule: ClassificationRule = {
    id: 'rule-regex', category_id: 'cat-2', keyword: '^FT\\d{5}$', 
    type: 'regex', priority: 2, is_active: true, created_at: '', updated_at: '', stop_on_match: true
  };

  const keywordRule: ClassificationRule = {
    id: 'rule-keyword', category_id: 'cat-3', keyword: 'bao hiem | bhyt', 
    type: 'keyword', priority: 3, is_active: true, created_at: '', updated_at: '', stop_on_match: true
  };

  const amountRule: ClassificationRule = {
     id: 'rule-amount', category_id: 'cat-4', keyword: '',
     type: 'amount', priority: 4, is_active: true, created_at: '', updated_at: '', 
     amount_min: 150000, amount_max: 200000, stop_on_match: true
  };

  const compositeRule: ClassificationRule = {
    id: 'rule-comp', category_id: 'cat-5', keyword: 'dong phuc',
    type: 'composite', priority: 5, is_active: true, created_at: '', updated_at: '',
    amount_min: 500000, stop_on_match: true
  };

  const fallbackRule: ClassificationRule = {
    id: 'rule-fallback', category_id: 'cat-default', keyword: '', 
    type: 'fallback', priority: 999, is_active: true, created_at: '', updated_at: '', stop_on_match: true
  };

  const allRulesOptions = [fallbackRule, keywordRule, exactRule, regexRule, compositeRule, amountRule];

  it('evaluates Exact match correctly with highest confidence (1.0)', () => {
    const tx = mockTx('le phi tuyen sinh k49');
    const result = service.evaluateRules(tx, allRulesOptions);
    expect(result.suggested_category_id).toBe('cat-1');
    expect(result.confidence_score).toBe(1.0);
    expect(result.matched_rules).toContain('rule-exact');
  });

  it('evaluates Regex match correctly (0.95)', () => {
    const tx = mockTx('FT12345 chuyen tien'); // Note: 'chuyen tien' is ignored because regex implies start to end `^FT\\d{5}$`. Wait, my regex forces ^...$. Let's test a fail and match.
    const failTx = mockTx('FT12345 chuyen tien');
    const resultFail = service.evaluateRules(failTx, allRulesOptions);
    expect(resultFail.suggested_category_id).not.toBe('cat-2'); 

    const passTx = mockTx('FT12345');
    const resultPass = service.evaluateRules(passTx, allRulesOptions);
    expect(resultPass.suggested_category_id).toBe('cat-2');
    expect(resultPass.confidence_score).toBe(0.95);
  });

  it('evaluates multiple Keywords separated by pipe (|) with confidence (0.85)', () => {
    const tx1 = mockTx('Dong tien bhyt cho Le Van A');
    const res1 = service.evaluateRules(tx1, allRulesOptions);
    expect(res1.suggested_category_id).toBe('cat-3');

    const tx2 = mockTx('Tien Bao Hiem y te');
    const res2 = service.evaluateRules(tx2, allRulesOptions);
    expect(res2.suggested_category_id).toBe('cat-3');
    expect(res2.confidence_score).toBe(0.85);
  });

  it('evaluates pure Amount boundaries correctly (0.6)', () => {
    // Falls out of amount boundaries, doesn't match keyword, hits fallback
    const tx1 = mockTx('Nop tien mat', 10000);
    const res1 = service.evaluateRules(tx1, allRulesOptions);
    expect(res1.suggested_category_id).toBe('cat-default'); 

    // Hits exact amount boundaries
    const tx2 = mockTx('Nop tien mat', 180000);
    const res2 = service.evaluateRules(tx2, allRulesOptions);
    expect(res2.suggested_category_id).toBe('cat-4');
    expect(res2.confidence_score).toBe(0.6);
  });

  it('evaluates Composite rules (Keyword + Amount) correctly (0.9)', () => {
    // Matches keyword, but amount too low -> Fallback
    const tx1 = mockTx('Tien dong phuc', 300000);
    expect(service.evaluateRules(tx1, allRulesOptions).suggested_category_id).toBe('cat-default');

    // Matches both -> Composite Win
    const tx2 = mockTx('Tien dong phuc', 550000);
    const res2 = service.evaluateRules(tx2, allRulesOptions);
    expect(res2.suggested_category_id).toBe('cat-5');
    expect(res2.confidence_score).toBe(0.9);
  });

  it('respects priority and stop_on_match properties', () => {
    // If we have an exact rule (priority 1) and a keyword rule (priority 3) hitting at the same time
    const overlappingRules = [
       {...exactRule, keyword: 'dong phuc sinh vien', priority: 1, stop_on_match: true},
       {...keywordRule, keyword: 'dong phuc', priority: 3, stop_on_match: true}
    ];

    const tx = mockTx('dong phuc sinh vien');
    const res = service.evaluateRules(tx, overlappingRules);
    
    // Exact should win
    expect(res.suggested_category_id).toBe('cat-1');
    expect(res.matched_rules.length).toBe(1); // Because stop_on_match = true
  });
});
