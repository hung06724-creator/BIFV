import { ParserService } from './parser.service';
import crypto from 'crypto';

export class ImportService {
  private parserService: ParserService;

  constructor() {
    this.parserService = new ParserService();
  }

  async processUpload(buffer: Buffer, filename: string, bankCode: string = 'BIDV') {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(buffer);
    const fileHash = hashSum.digest('hex');

    const previewResult = await this.parserService.previewFileBuffer(buffer, bankCode);

    return {
      batchId: `batch-${Date.now()}`,
      fileName: filename,
      fileHash,
      detectedColumns: previewResult.detectedColumns,
      previewRows: previewResult.previewRows,
      totalPreviewRows: previewResult.previewRows.length,
      totalRows: previewResult.totalRows,
    };
  }
}
