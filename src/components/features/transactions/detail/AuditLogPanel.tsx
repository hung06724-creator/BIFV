import { History, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface AuditLogEntry {
  id: string;
  action: 'insert' | 'update' | 'delete' | 'manual_override';
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

interface AuditLogPanelProps {
  logs: AuditLogEntry[];
}

const ACTION_CONFIG = {
  insert: { label: 'Tạo mới', icon: Plus, cls: 'bg-green-100 text-green-700' },
  update: { label: 'Cập nhật', icon: Pencil, cls: 'bg-blue-100 text-blue-700' },
  delete: { label: 'Xoá', icon: Trash2, cls: 'bg-red-100 text-red-700' },
  manual_override: { label: 'Override thủ công', icon: AlertTriangle, cls: 'bg-amber-100 text-amber-700' },
} as const;

export function AuditLogPanel({ logs }: AuditLogPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <History className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">Lịch sử thay đổi</h3>
        <span className="text-xs text-gray-400">({logs.length})</span>
      </div>

      {logs.length === 0 ? (
        <div className="p-5 text-center text-sm text-gray-400">
          Chưa có lịch sử thay đổi.
        </div>
      ) : (
        <div className="p-5">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-4">
              {logs.map((log, idx) => {
                const config = ACTION_CONFIG[log.action];
                const Icon = config.icon;

                return (
                  <div key={log.id} className="relative flex gap-3 pl-1">
                    {/* Timeline dot */}
                    <div className={clsx(
                      'relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-sm flex-shrink-0',
                      config.cls
                    )}>
                      <Icon className="w-3 h-3" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium', config.cls)}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleString('vi-VN')}
                        </span>
                        {log.user_name && (
                          <span className="text-xs text-gray-500">
                            • {log.user_name}
                          </span>
                        )}
                      </div>

                      {/* Changes diff */}
                      {(log.old_values || log.new_values) && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-mono space-y-1">
                          {log.old_values && Object.entries(log.old_values).map(([key, val]) => (
                            <div key={`old-${key}`} className="text-red-600">
                              <span className="text-red-400 select-none">- </span>
                              {key}: {JSON.stringify(val)}
                            </div>
                          ))}
                          {log.new_values && Object.entries(log.new_values).map(([key, val]) => (
                            <div key={`new-${key}`} className="text-green-600">
                              <span className="text-green-400 select-none">+ </span>
                              {key}: {JSON.stringify(val)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
