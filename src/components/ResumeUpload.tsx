import React, { useState } from "react";
import { Paperclip } from "lucide-react";

export default function ResumeUpload({
  onFileSelect,
}: {
  onFileSelect?: (file: File) => void;
}) {
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf" || ext === "docx") {
        setError("");
        if (onFileSelect) onFileSelect(selectedFile);
      } else {
        setError("Apenas arquivos PDF ou DOCX são permitidos.");
      }
    }

    // Reset o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";
  };

  return (
    <div className="flex flex-col">
      <label
        htmlFor="file-upload"
        className="cursor-pointer bg-[#2563eb] text-white rounded-xl px-4 py-4 hover:bg-[#3b82f6] transition-colors flex items-center gap-2 shadow-lg"
      >
        <Paperclip className="w-5 h-5" />
        Anexar CV
      </label>
      <input
        id="file-upload"
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
