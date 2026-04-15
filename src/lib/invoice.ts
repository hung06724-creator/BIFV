import type { CategoryOption, TransactionListItem } from '@/components/features/transactions/types';

function isInvoiceLedgerAccount(ledgerAccount?: string): boolean {
  if (!ledgerAccount) return false;
  return ledgerAccount.startsWith('531') || ledgerAccount.startsWith('511');
}

function resolveAllocationCategory(
  transaction: TransactionListItem,
  allocation: TransactionListItem['allocations'][number],
  categories: CategoryOption[],
  categoriesById: Map<string, CategoryOption>,
): CategoryOption | undefined {
  return (
    (allocation.confirmed_category_id && categoriesById.get(allocation.confirmed_category_id)) ||
    (allocation.suggested_category_id && categoriesById.get(allocation.suggested_category_id)) ||
    categories.find((item) => item.code === allocation.confirmed_category_code || item.code === allocation.suggested_category_code)
  );
}

export function isInvoiceEligibleTransaction(
  transaction: TransactionListItem,
  categories: CategoryOption[],
): boolean {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return transaction.allocations.some((allocation) => {
    const category = resolveAllocationCategory(transaction, allocation, categories, categoriesById);

    return isInvoiceLedgerAccount(category?.ledger_account);
  });
}

export function getInvoiceEligibleAmount(
  transaction: TransactionListItem,
  categories: CategoryOption[],
): number {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const matchedAllocations = transaction.allocations.filter((allocation) => {
    const category = resolveAllocationCategory(transaction, allocation, categories, categoriesById);
    return isInvoiceLedgerAccount(category?.ledger_account);
  });

  if (matchedAllocations.length === 0) return 0;

  const allocationAmount = matchedAllocations.reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0);
  if (allocationAmount > 0) return allocationAmount;

  return Number(transaction.normalized_amount ?? 0);
}
