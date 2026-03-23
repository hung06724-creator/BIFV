import { create } from 'zustand';

export interface StudentInfo {
  maHoSo: string;
  hoTen: string;
  ngaySinh: string;
  nganh: string;
  lop: string;
}

function removeVietnameseAccents(str: string): string {
  const accentsMap: Record<string, string> = {
    a: 'áàảãạăắằẳẵặâấầẩẫậ',
    e: 'éèẻẽẹêếềểễệ',
    i: 'íìỉĩị',
    o: 'óòỏõọôốồổỗộơớờởỡợ',
    u: 'úùủũụưứừửữự',
    y: 'ýỳỷỹỵ',
    d: 'đ',
    A: 'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ',
    E: 'ÉÈẺẼẸÊẾỀỂỄỆ',
    I: 'ÍÌỈĨỊ',
    O: 'ÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ',
    U: 'ÚÙỦŨỤƯỨỪỬỮỰ',
    Y: 'ÝỲỶỸỴ',
    D: 'Đ',
  };

  let result = str;
  for (const [nonAccent, accents] of Object.entries(accentsMap)) {
    result = result.replace(new RegExp('[' + accents + ']', 'g'), nonAccent);
  }
  return result;
}

function parseExcelText(text: string): StudentInfo[] {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  return lines.map((line) => {
    const parts = line.split(/\t+/);
    return {
      maHoSo: parts[0]?.trim()?.normalize() ?? '',
      hoTen: parts[1]?.trim()?.normalize() ?? '',
      ngaySinh: parts[2]?.trim()?.normalize() ?? '',
      nganh: parts[3]?.trim()?.normalize() ?? '',
      lop: parts[4]?.trim()?.normalize() ?? '',
    };
  });
}

interface StudentStore {
  students: StudentInfo[];
  searchMap: Map<string, StudentInfo[]>;

  setStudents: (text: string) => void;
  addStudents: (text: string) => void;
  importFromFile: (students: StudentInfo[]) => void;
  addFromFile: (students: StudentInfo[]) => void;
  clearStudents: () => void;
  findByName: (name: string) => StudentInfo[];
  syncFromStorage: (students: StudentInfo[]) => void;
}

function buildSearchMap(students: StudentInfo[]): Map<string, StudentInfo[]> {
  const map = new Map<string, StudentInfo[]>();
  for (const s of students) {
    const key = removeVietnameseAccents(s.hoTen).toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

import { useAppStore } from './store';

export const useStudentStore = create<StudentStore>((set, get) => {
  return {
    students: [],
    searchMap: new Map(),

    setStudents: (text) => {
      const students = parseExcelText(text);
      const searchMap = buildSearchMap(students);
      useAppStore.setState({ students });
      useAppStore.getState().globalPersist();
      set({ students, searchMap });
    },

    addStudents: (text) => {
      const newStudents = parseExcelText(text);
      const all = [...get().students, ...newStudents];
      const searchMap = buildSearchMap(all);
      useAppStore.setState({ students: all });
      useAppStore.getState().globalPersist();
      set({ students: all, searchMap });
    },

    importFromFile: (students) => {
      const searchMap = buildSearchMap(students);
      useAppStore.setState({ students });
      useAppStore.getState().globalPersist();
      set({ students, searchMap });
    },

    addFromFile: (students) => {
      const all = [...get().students, ...students];
      const searchMap = buildSearchMap(all);
      useAppStore.setState({ students: all });
      useAppStore.getState().globalPersist();
      set({ students: all, searchMap });
    },

    clearStudents: () => {
      useAppStore.setState({ students: [] });
      useAppStore.getState().globalPersist();
      set({ students: [], searchMap: new Map() });
    },

    findByName: (name) => {
      const key = removeVietnameseAccents(name).toUpperCase();
      return get().searchMap.get(key) || [];
    },

    syncFromStorage: (students) => {
      const searchMap = buildSearchMap(students);
      set({ students, searchMap });
    },
  };
});
