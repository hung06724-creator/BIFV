import { create } from 'zustand';
import type { TransactionListItem, CategoryOption, BatchOption } from '@/components/features/transactions/types';
import type { RuleListItem } from '@/components/features/rules/types';
import { MOCK_CATEGORIES, MOCK_RULES } from '@/components/features/rules/mock-data';
import {
  isSupabaseRuntimeReady,
  persistRuntimeStateToDevApi,
  queueRuntimeStatePersist,
} from '@/services/runtimeState.service';

export type BankTab = 'BIDV' | 'AGRIBANK';

export interface PersistedAppState {
  bidvTransactions: TransactionListItem[];
  agribankTransactions: TransactionListItem[];
  rules: RuleListItem[];
  batches: BatchOption[];
  categories: CategoryOption[];
  activeBank: BankTab;
  students: any[];
  tuitionRecords: any[];
}

const DEFAULT_PERSISTED_STATE: PersistedAppState = {
  bidvTransactions: [],
  agribankTransactions: [],
  rules: MOCK_RULES,
  batches: [],
  categories: MOCK_CATEGORIES,
  activeBank: 'BIDV',
  students: [],
  tuitionRecords: [],
};

function toPersistedState(state: any): PersistedAppState {
  return {
    bidvTransactions: state.bidvTransactions,
    agribankTransactions: state.agribankTransactions,
    rules: state.rules,
    batches: state.batches,
    categories: state.categories,
    activeBank: state.activeBank,
    students: state.students,
    tuitionRecords: state.tuitionRecords,
  };
}

async function persistStateToCode(state: PersistedAppState): Promise<void> {
  if (typeof window === 'undefined') return;

  if (!isSupabaseRuntimeReady()) {
    try {
      await persistRuntimeStateToDevApi(state);
      return;
    } catch {
      // Keep runtime persistence best-effort in local/dev mode.
    }
  }

  queueRuntimeStatePersist(state);
}

interface AppState {
  bidvTransactions: TransactionListItem[];
  agribankTransactions: TransactionListItem[];
  rules: RuleListItem[];
  batches: BatchOption[];
  categories: CategoryOption[];
  activeBank: BankTab;
  students: any[];
  tuitionRecords: any[];

  hydrateFromServer: (state: Partial<PersistedAppState>) => void;
  setActiveBank: (bank: BankTab) => void;
  addTransactions: (items: TransactionListItem[], batch: BatchOption, bankCode: string, options?: { overwriteClassified?: boolean }) => number;
  updateTransactions: (bankCode: BankTab, mapper: (t: TransactionListItem) => TransactionListItem) => void;
  setCategories: (categories: CategoryOption[]) => void;
  addCategory: (category: CategoryOption) => void;
  updateCategory: (category: CategoryOption) => void;
  deleteCategory: (id: string) => void;
  setRules: (rules: RuleListItem[]) => void;
  addRule: (rule: RuleListItem) => void;
  updateRule: (rule: RuleListItem) => void;
  deleteRule: (id: string) => void;
  deleteTransactions: (bankCode: BankTab, transactionIds: Set<string>) => void;
  clearAll: () => void;
  globalPersist: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  ...DEFAULT_PERSISTED_STATE,

  hydrateFromServer: (incoming) => {
    set((state) => ({
      ...state,
      ...DEFAULT_PERSISTED_STATE,
      ...incoming,
      students: incoming.students ?? state.students,
      tuitionRecords: incoming.tuitionRecords ?? state.tuitionRecords,
    }));
  },

  globalPersist: () => {
    void persistStateToCode(toPersistedState(get()));
  },

  setActiveBank: (bank) => {
    set({ activeBank: bank });
    void persistStateToCode(toPersistedState(get()));
  },

  addTransactions: (items, batch, bankCode, options) => {
    const state = get();
    const isBidv = bankCode === 'BIDV';
    const existing = isBidv ? state.bidvTransactions : state.agribankTransactions;
    const overwriteClassified = options?.overwriteClassified ?? false;

    let duplicateCount = 0;

    // Both BIDV and AGRIBANK: dedup by raw_reference, newer data replaces older
    const txnKey = isBidv ? 'bidvTransactions' : 'agribankTransactions';

    const dedupKey = (t: { raw_reference?: string | null; normalized_amount: number }) => {
      const ref = t.raw_reference?.trim();
      return ref ? `${ref}|${t.normalized_amount}` : '';
    };

    // Statuses that should be protected from overwrite during normal import
    const PROTECTED_STATUSES = new Set(['classified', 'confirmed', 'exported', 'matched']);

    const newByKey = new Map<string, typeof items[0]>();
    const newNoRef: typeof items = [];
    for (const item of items) {
      const key = dedupKey(item);
      if (!key) {
        newNoRef.push(item);
      } else if (!newByKey.has(key)) {
        newByKey.set(key, item);
      }
    }

    // Remove old transactions whose ref+amount match new import
    // BUT if overwriteClassified is false, keep classified/confirmed ones
    const kept = existing.filter((t) => {
      const key = dedupKey(t);
      if (!key) return true;
      if (!newByKey.has(key)) return true;
      // Protect classified/confirmed transactions from bank statement import
      if (!overwriteClassified && PROTECTED_STATUSES.has(t.status)) {
        // Remove this key from newByKey so the new data is discarded
        newByKey.delete(key);
        return true;
      }
      return false;
    });

    duplicateCount = existing.length - kept.length;

    const merged = [...newNoRef, ...Array.from(newByKey.values()), ...kept];

    set({
      [txnKey]: merged,
      batches: state.batches.some((b) => b.id === batch.id)
        ? state.batches
        : [batch, ...state.batches],
      activeBank: bankCode as BankTab,
    });

    void persistStateToCode(toPersistedState(get()));

    return duplicateCount;
  },

  updateTransactions: (bankCode, mapper) => {
    const key = bankCode === 'BIDV' ? 'bidvTransactions' : 'agribankTransactions';
    set((state) => ({ [key]: state[key].map(mapper) }));
    void persistStateToCode(toPersistedState(get()));
  },

  setCategories: (categories) => {
    set({ categories });
    void persistStateToCode(toPersistedState(get()));
  },
  addCategory: (category) => {
    set((state) => ({ categories: [...state.categories, category] }));
    void persistStateToCode(toPersistedState(get()));
  },
  updateCategory: (category) => {
    set((state) => ({
      categories: state.categories.map((c) => (c.id === category.id ? category : c)),
    }));
    void persistStateToCode(toPersistedState(get()));
  },
  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
    void persistStateToCode(toPersistedState(get()));
  },

  setRules: (rules) => {
    set({ rules });
    void persistStateToCode(toPersistedState(get()));
  },
  addRule: (rule) => {
    set((state) => ({ rules: [rule, ...state.rules] }));
    void persistStateToCode(toPersistedState(get()));
  },
  updateRule: (rule) => {
    set((state) => ({
      rules: state.rules.map((r) => (r.id === rule.id ? rule : r)),
    }));
    void persistStateToCode(toPersistedState(get()));
  },
  deleteRule: (id) => {
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== id),
    }));
    void persistStateToCode(toPersistedState(get()));
  },

  deleteTransactions: (bankCode, transactionIds) => {
    const key = bankCode === 'BIDV' ? 'bidvTransactions' : 'agribankTransactions';
    set((state) => {
      const remaining = state[key].filter((t) => !transactionIds.has(t.id));
      const remainingBatchIds = new Set<string>();
      for (const t of remaining) remainingBatchIds.add(t.batch_id);
      const otherKey = key === 'bidvTransactions' ? 'agribankTransactions' : 'bidvTransactions';
      for (const t of state[otherKey]) remainingBatchIds.add(t.batch_id);
      return {
        [key]: remaining,
        batches: state.batches.filter((b) => remainingBatchIds.has(b.id)),
      };
    });
    void persistStateToCode(toPersistedState(get()));
  },

  clearAll: () => {
    set({ bidvTransactions: [], agribankTransactions: [], batches: [] });
    void persistStateToCode(toPersistedState(get()));
  },
}));
