import { ClassificationRule, BankTransaction, TransactionMatch } from '@/domain/types';
import { VietnameseTransactionParser, ParsedTransaction } from '@/lib/parsers/VietnameseTransactionParser';

export interface ClassificationMatchResult {
  suggested_category_id?: string;
  suggested_category_code?: string;
  confidence_score: number;
  matched_rules: string[]; // List of rule IDs that matched
  explanation: string;
}

export class ClassificationService {
  private parser: VietnameseTransactionParser;

  constructor() {
    this.parser = new VietnameseTransactionParser();
  }

  /**
   * Run the rule-based classification engine on a single parsed transaction.
   * Priority of execution:
   * 1. Exact
   * 2. Regex
   * 3. Keyword
   * 4. Amount
   * 5. Composite
   * 6. Fallback
   */
  public evaluateRules(transaction: BankTransaction, rules: ClassificationRule[]): ClassificationMatchResult {
    // 1. Sort rules strictly by priority (lower number = runs first)
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    // 2. Parse heuristics from the transaction to get clean strings
    const descToParse = (transaction.raw_desc || '').replace(/\s+/g, ' ').trim();
    const heuristics = this.parser.parseDescriptionOnly(descToParse);
    
    // Convert description to no-accent lowercase for keyword matching
    const searchString = heuristics.no_accent_description || descToParse.toLowerCase();
    const amount = transaction.normalized_amount;

    const matchedRules: ClassificationRule[] = [];
    let finalRule: ClassificationRule | undefined = undefined;

    for (const rule of sortedRules) {
      if (!rule.is_active) continue;

      let isMatch = false;

      switch (rule.type) {
        case 'exact':
          isMatch = searchString === rule.keyword.toLowerCase();
          break;

        case 'regex':
          try {
             const regex = new RegExp(rule.keyword, 'i');
             isMatch = regex.test(searchString);
          } catch (e) {
             // invalid regex syntax, skip
          }
          break;

        case 'keyword': {
          // Support multiple keywords separated by pipe `|`
          const keywords = rule.keyword.toLowerCase().split('|').map(k => k.trim()).filter(k => k);
          isMatch = keywords.some(kw => searchString.includes(kw));
          break;
        }

        case 'amount': {
          if (rule.amount_min !== undefined || rule.amount_max !== undefined) {
             const withinMin = rule.amount_min !== undefined ? amount >= rule.amount_min : true;
             const withinMax = rule.amount_max !== undefined ? amount <= rule.amount_max : true;
             isMatch = withinMin && withinMax;
          }
          break;
        }

        case 'composite': {
          // Composite requires BOTH a keyword match AND an amount boundary
          const kwArr = (rule.keyword || '').toLowerCase().split('|').map(k => k.trim()).filter(k => k);
          const hasKeyword = kwArr.length > 0 ? kwArr.some(kw => searchString.includes(kw)) : true;
          
          const meetsMin = rule.amount_min !== undefined ? amount >= rule.amount_min : true;
          const meetsMax = rule.amount_max !== undefined ? amount <= rule.amount_max : true;
          
          isMatch = hasKeyword && meetsMin && meetsMax;
          break;
        }

        case 'fallback':
          // Fallbacks always "match" but are usually placed at the very bottom (highest priority number)
          isMatch = true;
          break;

        default:
          break;
      }

      if (isMatch) {
         matchedRules.push(rule);
         finalRule = rule; // The "last" matched rule (or first, depending on how we decide)
         if (rule.stop_on_match) {
            break; // Immediately halt evaluation
         }
      }
    }

    // Determine the primary outcome
    // We pick the best match (the first one that stopped execution, or simply the first one matched)
    // Because sorted by priority ascending (1 = highest), the FIRST match is actually the strongest.
    const selectedRule = matchedRules[0]; // Take highest priority match

    if (!selectedRule) {
      return {
        suggested_category_id: undefined,
        suggested_category_code: undefined,
        confidence_score: 0.0,
        matched_rules: [],
        explanation: 'Không có rule nào khớp với giao dịch này.'
      };
    }

    // Logic for Confidence Scoring
    let confidence = 0.5; // Base confidence
    if (selectedRule.type === 'exact') confidence = 1.0;
    else if (selectedRule.type === 'regex') confidence = 0.95;
    else if (selectedRule.type === 'composite') confidence = 0.9;
    else if (selectedRule.type === 'keyword') confidence = 0.85;
    else if (selectedRule.type === 'amount') confidence = 0.6;
    else if (selectedRule.type === 'fallback') confidence = 0.1;

    let explanation = `Khớp rule [${selectedRule.type}]: '${selectedRule.keyword}'. Priority: ${selectedRule.priority}`;
    if (selectedRule.type === 'fallback') {
       explanation = `Không khớp từ khóa, áp dụng rule mặc định (Fallback).`;
    }

    // Return the Classification output structure requested by user
    return {
      suggested_category_id: selectedRule.category_id,
      suggested_category_code: selectedRule.category_code,
      confidence_score: confidence,
      matched_rules: matchedRules.map(r => r.id),
      explanation: explanation
    };
  }
}
