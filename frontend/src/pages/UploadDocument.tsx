import { useState } from "react";

function UploadDocuments({ setStep }: { setStep: (n: number) => void }) {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData,
    });

    // ✅ After upload success → move to Flow Analysis
    setStep(2);
  };

  return (
    <div>
      <h3>Upload Documents</h3>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload}>Upload & Continue</button>
    </div>
  );
}

export default UploadDocuments;
