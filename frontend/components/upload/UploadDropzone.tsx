"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

const ACCEPTED = {
  "application/pdf":                          [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain":                               [".txt"],
  "image/png":                                [".png"],
  "image/jpeg":                               [".jpg", ".jpeg"],
};

export default function UploadDropzone() {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 25 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div {...getRootProps()}
         className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors"
         style={{
           borderColor: isDragActive ? "#E8590A" : "#D0D0D0",
           background:  isDragActive ? "#FFF3E0" : "#FAFAFA",
         }}>
      <input {...getInputProps()} />

      {file ? (
        <div>
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>{file.name}</p>
          <p className="text-xs mt-1" style={{ color: "#888" }}>
            {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
          </p>
        </div>
      ) : (
        <div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ background: "#FFF3E0" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4v14M10 8l4-4 4 4" stroke="#E8590A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 20h20" stroke="#D0D0D0" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>
            {isDragActive ? "Drop it here!" : "Drop your file here or click to browse"}
          </p>
          <p className="text-xs mt-1" style={{ color: "#888" }}>Maximum file size: 25MB</p>
          <p className="text-xs mt-1" style={{ color: "#AAA" }}>
            PDF, DOCX, PPTX, TXT, PNG, JPG
          </p>
        </div>
      )}
    </div>
  );
}