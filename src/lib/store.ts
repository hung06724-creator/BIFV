import { create } from 'zustand';
import type { TransactionListItem, CategoryOption, BatchOption } from '@/components/features/transactions/types';

export type BankTab = 'BIDV' | 'AGRIBANK';

interface AppState {
  bidvTransactions: TransactionListItem[];
  agribankTransactions: TransactionListItem[];
  batches: BatchOption[];
  categories: CategoryOption[];
  activeBank: BankTab;

  setActiveBank: (bank: BankTab) => void;
  addTransactions: (items: TransactionListItem[], batch: BatchOption, bankCode: string) => number;
  clearAll: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  bidvTransactions: [],
  agribankTransactions: [],
  batches: [],
  categories: [
    { id: 'cat-001', code: 'REV-01', name: 'Doanh thu bán hàng' },
    { id: 'cat-002', code: 'REV-02', name: 'Tiền chuyển khoản cá nhân' },
    { id: 'cat-003', code: 'REV-03', name: 'Doanh thu dịch vụ' },
    { id: 'cat-004', code: 'REV-04', name: 'Giao dịch nhỏ lẻ' },
    { id: 'cat-005', code: 'EXP-01', name: 'Chi phí vận hành' },
    { id: 'cat-006', code: 'EXP-02', name: 'Chi phí nhân sự' },
    { id: 'cat-007', code: 'REV-05', name: 'Doanh thu TMĐT (Shopee/Lazada)' },
  ],
  activeBank: 'BIDV',

  setActiveBank: (bank) => set({ activeBank: bank }),

  addTransactions: (items, batch, bankCode) => {
    const state = get();
    const isBidv = bankCode === 'BIDV';
    const existing = isBidv ? state.bidvTransactions : state.agribankTransactions;

    // Build dedup keys from existing transactions
    // BIDV: ref + amount (same ref but different amount = not duplicate)
    // AGRIBANK: ref only
    const existingKeys = new Set(
      existing
        .filter((t) => t.raw_reference && t.raw_reference.trim() !== '')
        .map((t) => isBidv ? `${t.raw_reference}|${t.normalized_amount}` : t.raw_reference!)
    );

    const newItems = items.filter((item) => {
      const ref = item.raw_reference;
      if (!ref || ref.trim() === '') return true;
      const key = isBidv ? `${ref}|${item.normalized_amount}` : ref;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });

    const duplicateCount = items.length - newItems.length;

    if (isBidv) {
      set({
        bidvTransactions: [...newItems, ...existing],
        batches: state.batches.some((b) => b.id === batch.id)
          ? state.batches
          : [batch, ...state.batches],
        activeBank: 'BIDV',
      });
    } else {
      set({
        agribankTransactions: [...newItems, ...existing],
        batches: state.batches.some((b) => b.id === batch.id)
          ? state.batches
          : [batch, ...state.batches],
        activeBank: 'AGRIBANK',
      });
    }

    return duplicateCount;
  },

  clearAll: () => set({ bidvTransactions: [], agribankTransactions: [], batches: [] }),
}));
