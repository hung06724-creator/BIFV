import { useState } from 'react';
import { FlaskConical, Play, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { RuleTestResult } from './types';

interface RuleTesterProps {
  onTest: (description: string, amount: number) => RuleTestResult;
}

const SAMPLE_DESCRIPTIONS = [
  'TKThe :19021015184017, tai Techcombank. PHAM THI NGOC BICH chuyen tien FT26071809742974',
  'Thanh toan don hang Shopee #SP260312001 NGUYEN VAN AN chuyen tien',
  'Chuyen tien luong thang 3 nhan vien - CONG TY TNHH ABC',
  'Thanh toan tien dien thang 2/2026 - Ma KH: PD260210001',
  'LE VAN HUNG gui tien mat FT26069123456789',
  'TRAN THI MAI chuyen tien thanh toan hoa don dich vu thang 3',
];

export function RuleTester({ onTest }: RuleTesterProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('200000');
  const [result, setResult] = useState<RuleTestResult | null>(null);

  const handleTest = () => {
    if (!description.trim()) return;
    const r = onTest(description, parseFloat(amount) || 0);
    setResult(r);
  };

  const handleSample = (desc: string) => {
    setDescription(desc);
    setResult(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-800">Test Rule</h3>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          Dùng form phía trên để cấu hình rule, rồi test tại đây
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Sample buttons */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Mẫu có sẵn:</label>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_DESCRIPTIONS.map((desc, idx) => (
              <button
                key={idx}
                onClick={() => handleSample(desc)}
                className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors truncate max-w-[200px]"
                title={desc}
              >
                {desc.slice(0, 40)}...
              </button>
            ))}
          </div>
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Mô tả giao dịch</label>
            <input
              type="text"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setResult(null); }}
              placeholder="Nhập mô tả giao dịch mẫu để test..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Số tiền</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setResult(null); }}
              placeholder="200000"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Test button */}
        <button
          onClick={handleTest}
          disabled={!description.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          Chạy Test
        </button>

        {/* Result */}
        {result && (
          <div className={clsx(
            'border rounded-lg p-4 space-y-2',
            result.matched
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          )}>
            <div className="flex items-center gap-2">
              {result.matched ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={clsx(
                'text-sm font-semibold',
                result.matched ? 'text-green-800' : 'text-red-800'
              )}>
                {result.matched ? 'KHỚP' : 'KHÔNG KHỚP'}
              </span>
              {result.matched && (
                <span className="text-xs font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  {Math.round(result.confidence_score * 100)}%
                </span>
              )}
            </div>
            <p className="text-xs text-gray-700">{result.explanation}</p>
            <div className="text-[10px] text-gray-400 font-mono bg-white/50 rounded px-2 py-1 break-all">
              Search string: &quot;{result.search_string}&quot;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
