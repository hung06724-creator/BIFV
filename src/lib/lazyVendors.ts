export async function loadXLSX() {
  return import('xlsx');
}

export async function loadExcelJS() {
  const module = await import('exceljs');
  return module.default;
}

export async function loadGroq() {
  const module = await import('groq-sdk');
  return module.default;
}
