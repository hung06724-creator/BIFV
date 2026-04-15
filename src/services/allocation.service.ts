import type { BankTransaction, SplitMode, TransactionStatus } from '@/domain/types';
import type {
  CategoryOption,
  TransactionAllocationView,
  TransactionListItem,
  TransactionMatchView,
  TransactionValidationState,
} from '@/components/features/transactions/types';

const FEE_CATEGORY_PATTERNS: Array<{ code: string; keywords: string[] }> = [
  { code: 'HOC_PHI', keywords: ['hoc phi', 'tuition'] },
  { code: 'LE_PHI_TUYEN_SINH', keywords: ['le phi xet tuyen', 'le phi tuyen sinh', 'admission fee'] },
  { code: 'BAO_HIEM_YT', keywords: ['bhyt', 'bao hiem y te', 'bao hiem yt'] },
  { code: 'DONG_PHUC_TT', keywords: ['dong phuc', 'uniform'] },
  { code: 'GIAO_TRINH', keywords: ['giao trinh', 'tai lieu', 'textbook'] },
];

const HORIZONTAL_TRIGGER_CATEGORY_CODES = new Set(['THU_NHAP_HOC']);
const HORIZONTAL_TRIGGER_CATEGORY_NAMES = new Set(['thu nhap hoc']);

function toSearchText(transaction: Pick<BankTransaction, 'raw_desc'>): string {
  return (transaction.raw_desc || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeCategoryName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function defaultMatch(): TransactionMatchView {
  return {
    suggested_category_id: null,
    suggested_category_code: null,
    suggested_category_name: null,
    confidence_score: 0,
    is_manually_overridden: false,
    confirmed_category_id: null,
    confirmed_category_code: null,
    confirmed_category_name: null,
  };
}

export class AllocationService {
  isHorizontalTriggerCategory(category: Pick<CategoryOption, 'code' | 'name'> | undefined): boolean {
    if (!category) return false;

    const normalizedName = normalizeCategoryName(category.name);
    return (
      HORIZONTAL_TRIGGER_CATEGORY_CODES.has(category.code.trim().toUpperCase()) ||
      HORIZONTAL_TRIGGER_CATEGORY_NAMES.has(normalizedName)
    );
  }

  detectSplitMode(transaction: Pick<BankTransaction, 'raw_desc' | 'normalized_amount'>): SplitMode {
    const desc = toSearchText(transaction);

    const matchedFeeCodes = FEE_CATEGORY_PATTERNS.filter(({ keywords }) =>
      keywords.some((keyword) => desc.includes(keyword))
    );
    if (matchedFeeCodes.length >= 2) {
      return 'horizontal';
    }

    return 'direct';
  }

  createAllocations(
    transaction: Pick<BankTransaction, 'id' | 'raw_desc' | 'normalized_amount'>,
    categories: CategoryOption[] = []
  ): TransactionAllocationView[] {
    const splitMode = this.detectSplitMode(transaction);
    const now = new Date().toISOString();

    if (splitMode === 'horizontal') {
      const desc = toSearchText(transaction);
      const matched = FEE_CATEGORY_PATTERNS.filter(({ keywords }) =>
        keywords.some((keyword) => desc.includes(keyword))
      );

      return matched.map((pattern, index) => {
        const category = categories.find((item) => item.code === pattern.code);
        return {
          id: `${transaction.id}-alloc-${index + 1}`,
          transaction_id: transaction.id,
          allocation_no: index + 1,
          allocation_type: 'horizontal',
          amount: 0,
          suggested_category_id: category?.id || null,
          suggested_category_code: pattern.code,
          suggested_category_name: category?.name || pattern.code,
          confirmed_category_id: null,
          confirmed_category_code: null,
          confirmed_category_name: null,
          beneficiary_code: null,
          beneficiary_name: null,
          status: 'draft',
          notes: 'Detected multiple fee components. Review and distribute amounts before confirming.',
        };
      });
    }

    return [
      {
        id: `${transaction.id}-alloc-1`,
        transaction_id: transaction.id,
        allocation_no: 1,
        allocation_type: 'direct',
        amount: transaction.normalized_amount,
        suggested_category_id: null,
        suggested_category_code: null,
        suggested_category_name: null,
        confirmed_category_id: null,
        confirmed_category_code: null,
        confirmed_category_name: null,
        beneficiary_code: null,
        beneficiary_name: null,
        status: 'draft',
        notes: null,
      },
    ];
  }

  deriveMatch(allocations: TransactionAllocationView[]): TransactionMatchView | null {
    const primary = allocations.find(
      (allocation) => allocation.confirmed_category_id || allocation.suggested_category_id
    );

    if (!primary) {
      return allocations.length > 0 ? defaultMatch() : null;
    }

    const hasOverride =
      primary.confirmed_category_id !== null &&
      primary.confirmed_category_id !== primary.suggested_category_id;

    return {
      suggested_category_id: primary.suggested_category_id,
      suggested_category_code: primary.suggested_category_code,
      suggested_category_name: primary.suggested_category_name,
      confidence_score: primary.suggested_category_id ? 1 : 0,
      is_manually_overridden: hasOverride,
      confirmed_category_id: primary.confirmed_category_id,
      confirmed_category_code: primary.confirmed_category_code,
      confirmed_category_name: primary.confirmed_category_name,
    };
  }

  validateAllocations(
    amount: number,
    splitMode: SplitMode,
    allocations: TransactionAllocationView[]
  ): TransactionValidationState {
    const totalAllocated = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const remainingAmount = amount - totalAllocated;
    const hasUnconfirmedAllocations = allocations.some((allocation) => !allocation.confirmed_category_code);
    const hasMissingBeneficiaries =
      splitMode === 'vertical' &&
      allocations.some((allocation) => !allocation.beneficiary_name && !allocation.beneficiary_code);

    return {
      total_allocated: totalAllocated,
      remaining_amount: remainingAmount,
      is_balanced: remainingAmount === 0,
      has_unconfirmed_allocations: hasUnconfirmedAllocations,
      has_missing_beneficiaries: hasMissingBeneficiaries,
      can_confirm: remainingAmount === 0 && !hasUnconfirmedAllocations && !hasMissingBeneficiaries,
    };
  }

  deriveStatus(
    currentStatus: TransactionStatus,
    amount: number,
    splitMode: SplitMode,
    allocations: TransactionAllocationView[]
  ): TransactionStatus {
    if (currentStatus === 'exported') {
      return currentStatus;
    }

    const validation = this.validateAllocations(amount, splitMode, allocations);
    if (validation.can_confirm) {
      return 'confirmed';
    }

    const hasSuggestions = allocations.some(
      (allocation) => allocation.suggested_category_id || allocation.confirmed_category_id
    );
    return hasSuggestions ? 'classified' : 'pending_classification';
  }

  updateAllocationCategory(
    allocations: TransactionAllocationView[],
    category: CategoryOption | undefined,
    targetAllocationNo?: number,
    confirm = false
  ): TransactionAllocationView[] {
    const targetNo = targetAllocationNo ?? allocations[0]?.allocation_no ?? 1;

    return allocations.map((allocation) => {
      if (allocation.allocation_no !== targetNo) {
        return allocation;
      }

      if (!category) {
        return {
          ...allocation,
          suggested_category_id: null,
          suggested_category_code: null,
          suggested_category_name: null,
          confirmed_category_id: null,
          confirmed_category_code: null,
          confirmed_category_name: null,
          status: 'draft',
        };
      }

      return {
        ...allocation,
        suggested_category_id: category?.id || allocation.suggested_category_id,
        suggested_category_code: category?.code || allocation.suggested_category_code,
        suggested_category_name: category?.name || allocation.suggested_category_name,
        confirmed_category_id: confirm ? category?.id || null : allocation.confirmed_category_id,
        confirmed_category_code: confirm ? category?.code || null : allocation.confirmed_category_code,
        confirmed_category_name: confirm ? category?.name || null : allocation.confirmed_category_name,
        status: confirm ? 'confirmed' : 'classified',
      };
    });
  }

  applyTransactionCategorySelection(
    transaction: TransactionListItem,
    category: CategoryOption | undefined,
    confirm = false,
    targetAllocationNo?: number
  ): TransactionListItem {
    const shouldForceHorizontal =
      Boolean(category) && this.isHorizontalTriggerCategory(category) && transaction.split_mode !== 'horizontal';

    if (shouldForceHorizontal && category) {
      const allocations = this.createHorizontalReviewAllocations(transaction, category);
      return {
        ...transaction,
        split_mode: 'horizontal',
        allocations,
        status: this.deriveStatus(transaction.status, transaction.normalized_amount, 'horizontal', allocations),
        match: this.deriveMatch(allocations),
      };
    }

    const allocations = this.updateAllocationCategory(transaction.allocations, category, targetAllocationNo, confirm);
    return {
      ...transaction,
      allocations,
      status: this.deriveStatus(transaction.status, transaction.normalized_amount, transaction.split_mode, allocations),
      match: this.deriveMatch(allocations),
    };
  }

  applySplitModeSelection(
    transaction: TransactionListItem,
    splitMode: SplitMode
  ): TransactionListItem {
    const allocations = this.createAllocationsForSplitMode(transaction, splitMode);

    return {
      ...transaction,
      split_mode: splitMode,
      allocations,
      status: this.deriveStatus('pending_classification', transaction.normalized_amount, splitMode, allocations),
      match: this.deriveMatch(allocations),
    };
  }

  updateAllocationFields(
    allocations: TransactionAllocationView[],
    targetAllocationNo: number,
    patch: Partial<
      Pick<
        TransactionAllocationView,
        | 'amount'
        | 'beneficiary_code'
        | 'beneficiary_name'
        | 'notes'
        | 'confirmed_category_id'
        | 'confirmed_category_code'
        | 'confirmed_category_name'
        | 'suggested_category_id'
        | 'suggested_category_code'
        | 'suggested_category_name'
      >
    >
  ): TransactionAllocationView[] {
    return allocations.map((allocation) => {
      if (allocation.allocation_no !== targetAllocationNo) {
        return allocation;
      }

      const next = {
        ...allocation,
        ...patch,
      };

      const hasConfirmedCategory = Boolean(next.confirmed_category_code || next.confirmed_category_id);
      const hasSuggestedCategory = Boolean(next.suggested_category_code || next.suggested_category_id);

      return {
        ...next,
        status: hasConfirmedCategory ? 'confirmed' : hasSuggestedCategory ? 'classified' : 'draft',
      };
    });
  }

  confirmAllocations(allocations: TransactionAllocationView[]): TransactionAllocationView[] {
    return allocations.map((allocation) => {
      const confirmedCategoryId = allocation.confirmed_category_id || allocation.suggested_category_id;
      const confirmedCategoryCode = allocation.confirmed_category_code || allocation.suggested_category_code;
      const confirmedCategoryName = allocation.confirmed_category_name || allocation.suggested_category_name;

      return {
        ...allocation,
        confirmed_category_id: confirmedCategoryId || null,
        confirmed_category_code: confirmedCategoryCode || null,
        confirmed_category_name: confirmedCategoryName || null,
        status: confirmedCategoryCode || confirmedCategoryId ? 'confirmed' : allocation.status,
      };
    });
  }

  private createHorizontalReviewAllocations(
    transaction: Pick<TransactionListItem, 'id' | 'normalized_amount' | 'allocations'>,
    selectedCategory: CategoryOption
  ): TransactionAllocationView[] {
    const existingPrimary = transaction.allocations[0];
    const templateCategories = [
      {
        id: selectedCategory.id,
        code: selectedCategory.code,
        name: selectedCategory.name,
      },
      ...FEE_CATEGORY_PATTERNS
        .map((pattern) => ({
          id: null,
          code: pattern.code,
          name: pattern.code,
        }))
        .filter((category) => category.code !== selectedCategory.code),
    ];

    return templateCategories.slice(0, 4).map((category, index) => ({
      id: `${transaction.id}-alloc-${index + 1}`,
      transaction_id: transaction.id,
      allocation_no: index + 1,
      allocation_type: 'horizontal',
      amount: index === 0 ? transaction.normalized_amount : 0,
      suggested_category_id: index === 0 ? category.id : null,
      suggested_category_code: index === 0 ? category.code : null,
      suggested_category_name: index === 0 ? category.name : null,
      confirmed_category_id: index === 0 ? category.id : null,
      confirmed_category_code: index === 0 ? category.code : null,
      confirmed_category_name: index === 0 ? category.name : null,
      beneficiary_code: existingPrimary?.beneficiary_code || null,
      beneficiary_name: existingPrimary?.beneficiary_name || null,
      status: index === 0 ? 'confirmed' : 'draft',
        notes:
          index === 0
            ? 'Transaction was switched to horizontal split from Thu nhap hoc. Reallocate amounts by fee component.'
            : 'Add fee component amount and category.',
    }));
  }

  private createAllocationsForSplitMode(
    transaction: Pick<TransactionListItem, 'id' | 'normalized_amount' | 'allocations'>,
    splitMode: SplitMode
  ): TransactionAllocationView[] {
    const primary = transaction.allocations[0];

    if (splitMode === 'direct') {
      return [
        {
          id: `${transaction.id}-alloc-1`,
          transaction_id: transaction.id,
          allocation_no: 1,
          allocation_type: 'direct',
          amount: transaction.normalized_amount,
          suggested_category_id: primary?.suggested_category_id || null,
          suggested_category_code: primary?.suggested_category_code || null,
          suggested_category_name: primary?.suggested_category_name || null,
          confirmed_category_id: primary?.confirmed_category_id || null,
          confirmed_category_code: primary?.confirmed_category_code || null,
          confirmed_category_name: primary?.confirmed_category_name || null,
          beneficiary_code: primary?.beneficiary_code || null,
          beneficiary_name: primary?.beneficiary_name || null,
          status: primary?.status || 'draft',
          notes: primary?.notes || null,
        },
      ];
    }

    if (splitMode === 'horizontal') {
      return Array.from({ length: 4 }, (_, index) => ({
        id: `${transaction.id}-alloc-${index + 1}`,
        transaction_id: transaction.id,
        allocation_no: index + 1,
        allocation_type: 'horizontal' as const,
        amount: index === 0 ? transaction.normalized_amount : 0,
        suggested_category_id: index === 0 ? primary?.suggested_category_id || null : null,
        suggested_category_code: index === 0 ? primary?.suggested_category_code || null : null,
        suggested_category_name: index === 0 ? primary?.suggested_category_name || null : null,
        confirmed_category_id: index === 0 ? primary?.confirmed_category_id || null : null,
        confirmed_category_code: index === 0 ? primary?.confirmed_category_code || null : null,
        confirmed_category_name: index === 0 ? primary?.confirmed_category_name || null : null,
        beneficiary_code: primary?.beneficiary_code || null,
        beneficiary_name: primary?.beneficiary_name || null,
        status: index === 0 ? primary?.status || 'draft' : 'draft',
        notes: null,
      }));
    }

    const equalShare =
      transaction.normalized_amount % 2 === 0 ? transaction.normalized_amount / 2 : 0;

    return Array.from({ length: 2 }, (_, index) => ({
      id: `${transaction.id}-alloc-${index + 1}`,
      transaction_id: transaction.id,
      allocation_no: index + 1,
      allocation_type: 'vertical' as const,
      amount: equalShare > 0 ? equalShare : index === 0 ? transaction.normalized_amount : 0,
      suggested_category_id: primary?.suggested_category_id || null,
      suggested_category_code: primary?.suggested_category_code || null,
      suggested_category_name: primary?.suggested_category_name || null,
      confirmed_category_id: primary?.confirmed_category_id || null,
      confirmed_category_code: primary?.confirmed_category_code || null,
      confirmed_category_name: primary?.confirmed_category_name || null,
      beneficiary_code: null,
      beneficiary_name: null,
      status:
        primary?.confirmed_category_id || primary?.confirmed_category_code
          ? 'confirmed'
          : primary?.suggested_category_id || primary?.suggested_category_code
            ? 'classified'
            : 'draft',
      notes: null,
    }));
  }
}
