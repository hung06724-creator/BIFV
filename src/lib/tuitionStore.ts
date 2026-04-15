import { create } from 'zustand';
import type { StudentInfo } from '@/lib/studentStore';

export type ExtractionStatus =
  | 'chua_trich_xuat'
  | 'khong_trich_xuat_duoc'
  | 'da_trich_xuat_chua_xac_nhan'
  | 'da_trich_xuat_trung_thong_tin'
  | 'da_xac_nhan';

export interface TuitionRecord {
  transactionId: string;
  date: string;
  normalizedDate: string;
  amount: number;
  description: string;
  extractedName: string;
  status: ExtractionStatus;
  matchedStudents: StudentInfo[];
  confirmedStudent: StudentInfo | null;
  categoryCode: string;
  bankCode: string;
  rawReference: string;
}

interface TuitionStore {
  /** Working set — only the current filter's records, rebuilt on filter change */
  records: TuitionRecord[];
  /** Permanent storage — confirmed records across all banks/months, never overwritten */
  savedRecords: TuitionRecord[];

  setRecords: (records: TuitionRecord[]) => void;
  updateExtractionResult: (transactionId: string, name: string, matchedStudents: StudentInfo[]) => void;
  confirmRecord: (transactionId: string) => void;
  selectStudent: (transactionId: string, student: StudentInfo) => void;
  manualAssignStudent: (transactionId: string, student: StudentInfo) => void;
  confirmAll: () => void;
  resetRecord: (transactionId: string) => void;
  removeSaved: (transactionId: string) => void;
  removeAllSaved: () => void;
  getByStatus: (status: ExtractionStatus) => TuitionRecord[];
  syncFromStorage: (records: TuitionRecord[], savedRecords: TuitionRecord[]) => void;
  syncSavedFromStorage: (savedRecords: TuitionRecord[]) => void;
}

const SAVED_KEY = 'tuition_saved_records';

import { useAppStore } from './store';

export const useTuitionStore = create<TuitionStore>((set, get) => ({
  records: [],
  savedRecords: [],

  setRecords: (records) => {
    // When rebuilding working set, exclude transactions already saved comparing rawReference or transactionId
    const savedKeys = new Set(get().savedRecords.map((r) => r.rawReference ? `${r.rawReference}|${r.amount}` : r.transactionId));
    const savedIds = new Set(get().savedRecords.map((r) => r.transactionId));
    
    const filtered = records.filter((r) => {
      if (savedIds.has(r.transactionId)) return false;
      const key = r.rawReference ? `${r.rawReference}|${r.amount}` : r.transactionId;
      if (savedKeys.has(key)) return false;
      return true;
    });
    set({ records: filtered });
  },

  updateExtractionResult: (transactionId, name, matchedStudents) => {
    set((state) => {
      const records = state.records.map((r) => {
        if (r.transactionId !== transactionId) return r;

        const trimmed = name.trim();
        const isInvalid = !trimmed || trimmed === 'NULL' || trimmed === 'ERROR';

        if (isInvalid) {
          return { ...r, extractedName: trimmed, status: 'khong_trich_xuat_duoc' as const, matchedStudents: [], confirmedStudent: null };
        }
        if (matchedStudents.length === 1) {
          return { ...r, extractedName: trimmed, status: 'da_trich_xuat_chua_xac_nhan' as const, matchedStudents, confirmedStudent: matchedStudents[0] };
        }
        if (matchedStudents.length > 1) {
          return { ...r, extractedName: trimmed, status: 'da_trich_xuat_trung_thong_tin' as const, matchedStudents, confirmedStudent: null };
        }
        return { ...r, extractedName: trimmed, status: 'da_trich_xuat_chua_xac_nhan' as const, matchedStudents: [], confirmedStudent: null };
      });
      return { records };
    });
  },

  confirmRecord: (transactionId) => {
    set((state) => {
      const rec = state.records.find((r) => r.transactionId === transactionId);
      if (!rec) return state;
      const saved = { ...rec, status: 'da_xac_nhan' as const };
      const newSaved = [...state.savedRecords, saved];
      
      // Sync to AppStore
      if (saved.confirmedStudent) {
        useAppStore.getState().updateTransactions(saved.bankCode as any, (t) =>
          t.id === transactionId ? { ...t, sender_name: saved.confirmedStudent!.hoTen } : t
        );
      }

      useAppStore.setState({ tuitionRecords: newSaved });
      useAppStore.getState().globalPersist();
      return {
        records: state.records.filter((r) => r.transactionId !== transactionId),
        savedRecords: newSaved,
      };
    });
  },

  selectStudent: (transactionId, student) => {
    set((state) => ({
      records: state.records.map((r) => {
        if (r.transactionId === transactionId) {
          // Sync to AppStore immediately on selection
          useAppStore.getState().updateTransactions(r.bankCode as any, (t) =>
            t.id === transactionId ? { ...t, sender_name: student.hoTen } : t
          );
          return { ...r, confirmedStudent: student, status: 'da_trich_xuat_chua_xac_nhan' as const };
        }
        return r;
      }),
    }));
  },

  manualAssignStudent: (transactionId, student) => {
    set((state) => ({
      records: state.records.map((r) => {
        if (r.transactionId === transactionId) {
          // Sync to AppStore immediately
          useAppStore.getState().updateTransactions(r.bankCode as any, (t) =>
            t.id === transactionId ? { ...t, sender_name: student.hoTen } : t
          );
          return {
            ...r,
            extractedName: student.hoTen.toUpperCase(),
            confirmedStudent: student,
            matchedStudents: [student],
            status: 'da_trich_xuat_chua_xac_nhan' as const,
          };
        }
        return r;
      }),
    }));
  },

  confirmAll: () => {
    set((state) => {
      const toConfirm: TuitionRecord[] = [];
      const remaining: TuitionRecord[] = [];
      for (const r of state.records) {
        if (r.status === 'da_trich_xuat_chua_xac_nhan' && r.confirmedStudent) {
          const updated = { ...r, status: 'da_xac_nhan' as const };
          toConfirm.push(updated);
          
          // Sync each confirmed record to AppStore
          useAppStore.getState().updateTransactions(r.bankCode as any, (t) =>
            t.id === r.transactionId ? { ...t, sender_name: updated.confirmedStudent!.hoTen } : t
          );
        } else {
          remaining.push(r);
        }
      }
      const newSaved = [...state.savedRecords, ...toConfirm];
      useAppStore.setState({ tuitionRecords: newSaved });
      useAppStore.getState().globalPersist();
      return { records: remaining, savedRecords: newSaved };
    });
  },

  resetRecord: (transactionId) => {
    set((state) => {
      // Check if it's in savedRecords — move back to working set
      const savedRec = state.savedRecords.find((r) => r.transactionId === transactionId);
      if (savedRec) {
        const restored = savedRec.matchedStudents.length > 1
          ? { ...savedRec, status: 'da_trich_xuat_trung_thong_tin' as const, confirmedStudent: null }
          : savedRec.matchedStudents.length === 1
            ? { ...savedRec, status: 'da_trich_xuat_chua_xac_nhan' as const, confirmedStudent: savedRec.matchedStudents[0] }
            : { ...savedRec, status: 'da_trich_xuat_chua_xac_nhan' as const, confirmedStudent: null };
        
        const newSaved = state.savedRecords.filter((r) => r.transactionId !== transactionId);
        
        // Sync reset (revert name if no student selected, or update to restored student)
        useAppStore.getState().updateTransactions(savedRec.bankCode as any, (t) =>
          t.id === transactionId ? { ...t, sender_name: restored.confirmedStudent?.hoTen || null } : t
        );

        useAppStore.setState({ tuitionRecords: newSaved });
        useAppStore.getState().globalPersist();
        return {
          records: [...state.records, restored].sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate)),
          savedRecords: newSaved,
        };
      }

      // Otherwise it's in working records — reset to selection state
      return {
        records: state.records.map((r) => {
          if (r.transactionId !== transactionId) return r;
          
          const next = r.matchedStudents.length > 1
            ? { ...r, status: 'da_trich_xuat_trung_thong_tin' as const, confirmedStudent: null }
            : r.matchedStudents.length === 1
              ? { ...r, status: 'da_trich_xuat_chua_xac_nhan' as const, confirmedStudent: r.matchedStudents[0] }
              : { ...r, status: 'da_trich_xuat_chua_xac_nhan' as const, confirmedStudent: null };

          // Sync to AppStore
          useAppStore.getState().updateTransactions(r.bankCode as any, (t) =>
            t.id === transactionId ? { ...t, sender_name: next.confirmedStudent?.hoTen || null } : t
          );

          return next;
        }),
      };
    });
  },

  removeSaved: (transactionId) => {
    set((state) => {
      const newSaved = state.savedRecords.filter((r) => r.transactionId !== transactionId);
      // saveSaved(newSaved);
      useAppStore.setState({ tuitionRecords: newSaved });
      useAppStore.getState().globalPersist();
      return { savedRecords: newSaved };
    });
  },

  removeAllSaved: () => {
    // saveSaved([]);
    useAppStore.setState({ tuitionRecords: [] });
    useAppStore.getState().globalPersist();
    set({ savedRecords: [] });
  },

  getByStatus: (status) => {
    return get().records.filter((r) => r.status === status);
  },

  syncFromStorage: (records, savedRecords) => {
    set({ records, savedRecords });
  },

  syncSavedFromStorage: (savedRecords) => {
    const savedKeys = new Set(savedRecords.map((r) => r.rawReference ? `${r.rawReference}|${r.amount}` : r.transactionId));
    const savedIds = new Set(savedRecords.map((r) => r.transactionId));

    set((state) => ({
      savedRecords,
      records: state.records.filter((r) => {
        if (savedIds.has(r.transactionId)) return false;
        const key = r.rawReference ? `${r.rawReference}|${r.amount}` : r.transactionId;
        return !savedKeys.has(key);
      }),
    }));
  },
}));
