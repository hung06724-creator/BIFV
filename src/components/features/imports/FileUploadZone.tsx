import { useState } from "react";
import { UploadCloud, File, AlertCircle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

export function FileUploadZone() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
      "application/vnd.ms-excel", // xls
      "text/csv", // csv
    ];
    if (!validTypes.includes(file.type)) {
      setError("Chỉ hỗ trợ file Excel (.xlsx, .xls) hoặc CSV.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setError(null);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/imports', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      alert(`Thành công! Đã thêm ${result.data.recordsInserted} giao dịch.`);
      setFile(null); // Reset after successful upload
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500",
          dragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 bg-gray-50",
          error && "border-red-400 bg-red-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <UploadCloud className={clsx("h-12 w-12", dragActive ? "text-indigo-600" : "text-gray-400")} />
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-indigo-600 hover:underline cursor-pointer">
              Bấm để chọn file
            </span>{" "}
            hoặc kéo thả vào đây
          </div>
          <p className="text-xs text-gray-500">Hỗ trợ định dạng: .xlsx, .xls, .csv</p>
        </div>
        
        {/* Input ẩn để bấm vào div cũng mở hộp thoại chọn file */}
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        />
      </div>

      {error && (
        <div className="mt-4 flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {file && !error && (
        <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <File className="w-8 h-8 text-indigo-500 flex-shrink-0" />
            <div className="truncate">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            onClick={handleUpload}
            className="ml-4 flex-shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Xử lý tệp tin
          </button>
        </div>
      )}
    </div>
  );
}
