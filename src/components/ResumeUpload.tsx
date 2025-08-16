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
        className="cursor-pointer bg-[#6c2bd7] text-white rounded-lg px-3 py-2 hover:bg-[#8f4fff] transition-colors flex items-center gap-2"
      >
        <Paperclip className="w-4 h-4" />
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
