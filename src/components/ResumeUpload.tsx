import React, { useState } from 'react';

export default function ResumeUpload({ onUpload }: { onUpload?: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf' || ext === 'docx') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Apenas arquivos PDF ou DOCX são permitidos.');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    // Adapte a URL abaixo para o endpoint correto do seu back-end
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      if (onUpload) onUpload(file);
      alert('Upload realizado com sucesso!');
    } else {
      setError('Falha no upload.');
    }
  };

  return (
    <div>
      <input type="file" accept=".pdf,.docx" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file}>Enviar</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
