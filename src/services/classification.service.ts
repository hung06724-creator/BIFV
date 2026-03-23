import { ClassificationRule, BankTransaction } from '@/domain/types';
import { VietnameseTransactionParser, removeVietnameseTones } from '@/lib/parsers/VietnameseTransactionParser';

export interface ClassificationMatchResult {
  suggested_category_id?: string;
  suggested_category_code?: string;
  confidence_score: number;
  matched_rules: string[]; // List of rule IDs that matched
  explanation: string;
}

export class ClassificationService {
  private parser: VietnameseTransactionParser;
  private regexCache = new Map<string, RegExp | null>();

  constructor() {
    this.parser = new VietnameseTransactionParser();
  }

  private getRegex(pattern: string): RegExp | null {
    if (!this.regexCache.has(pattern)) {
      try {
        this.regexCache.set(pattern, new RegExp(pattern, 'i'));
      } catch {
        this.regexCache.set(pattern, null);
      }
    }
    return this.regexCache.get(pattern)!;
  }

  /**
   * Run the rule-based classification engine on a single parsed transaction.
   * Rules are sorted by priority (ascending). First match wins.
   * stop_on_match halts further evaluation after a matched rule.
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
    let selectedRule: ClassificationRule | undefined;

    for (const rule of sortedRules) {
      if (!rule.is_active) continue;

      let isMatch = false;
      // Normalize rule keyword to no-accent lowercase (same space as searchString)
      const normalizedKeyword = removeVietnameseTones(rule.keyword);

      switch (rule.type) {
        case 'exact':
          isMatch = searchString === normalizedKeyword;
          break;

        case 'regex': {
          const regex = this.getRegex(rule.keyword);
          if (regex) {
            isMatch = regex.test(searchString);
          }
          break;
        }

        case 'keyword': {
          // Support multiple keywords separated by pipe `|`
          const keywords = normalizedKeyword.split('|').map(k => k.trim()).filter(k => k);
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
          const kwArr = normalizedKeyword.split('|').map(k => k.trim()).filter(k => k);
          const hasKeyword = kwArr.length > 0 ? kwArr.some(kw => searchString.includes(kw)) : true;
          
          const meetsMin = rule.amount_min !== undefined ? amount >= rule.amount_min : true;
          const meetsMax = rule.amount_max !== undefined ? amount <= rule.amount_max : true;
          
          isMatch = hasKeyword && meetsMin && meetsMax;
          break;
        }

        case 'fallback':
          isMatch = true;
          break;

        default:
          break;
      }

      if (isMatch) {
         matchedRules.push(rule);
         selectedRule ??= rule; // First match wins (highest priority)
         if (rule.stop_on_match) {
            break;
         }
      }
    }

    // First match by priority is the winner

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
