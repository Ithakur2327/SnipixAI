"use client";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

interface Props {
  file: File | null;
  onFileChange: (f: File | null) => void;
}

export default function UploadDropzone({ file, onFileChange }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) onFileChange(accepted[0]);
  }, [onFileChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED, maxSize: 25 * 1024 * 1024, multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      style={{
        borderRadius: "16px", border: `2px dashed ${isDragActive ? "#E8590A" : "rgba(255,255,255,0.12)"}`,
        padding: "40px", textAlign: "center", cursor: "pointer",
        background: isDragActive ? "rgba(232,89,10,0.05)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
      }}
    >
      <input {...getInputProps()} />
      {file ? (
        <div>
          <p style={{ fontSize: "28px", marginBottom: "8px" }}>✅</p>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>{file.name}</p>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
            {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
          </p>
        </div>
      ) : (
        <div>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px", display: "flex",
            alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            background: "rgba(232,89,10,0.1)", border: "1px solid rgba(232,89,10,0.2)",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v12M8 8l4-4 4 4" stroke="#E8590A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 18h16" stroke="#E8590A" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            </svg>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: "4px" }}>
            {isDragActive ? "Drop it here!" : "Drop your file here or click to browse"}
          </p>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>PDF, DOCX, PPTX, TXT, PNG, JPG · Max 25MB</p>
        </div>
      )}
    </div>
  );
}