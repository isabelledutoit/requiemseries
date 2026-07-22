"use client";

import { useRef, useState } from "react";

export function Dropzone({
  files,
  onFiles,
}: {
  files: File[];
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function add(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (picked.length) onFiles([...files, ...picked]);
  }

  return (
    <div
      className={"dropzone" + (over ? " is-over" : "")}
      role="button"
      tabIndex={0}
      aria-label="Add images: drop files here or click to browse"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        add(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <svg
        className="dropzone-icon"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V4" />
        <path d="M7 9l5-5 5 5" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <p className="dropzone-main">
        Drop images here <span>or click to browse</span>
      </p>
      {files.length > 0 ? (
        <div className="dropzone-files">
          <span>{files.length} selected</span>
          <button
            type="button"
            className="dropzone-clear"
            onClick={(e) => {
              e.stopPropagation();
              onFiles([]);
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <p className="dropzone-hint">
          Full view + any detail shots · JPG / PNG / WebP
        </p>
      )}
    </div>
  );
}
