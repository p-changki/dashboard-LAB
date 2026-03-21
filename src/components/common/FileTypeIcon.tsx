"use client";

import { FileIcon, defaultStyles } from "react-file-icon";

interface FileTypeIconProps {
  extension: string;
  size?: number;
}

const CUSTOM_STYLES = {
  hwp: { color: "#2563eb", labelColor: "#dbeafe" },
  hwpx: { color: "#2563eb", labelColor: "#dbeafe" },
  md: { color: "#22c55e", labelColor: "#dcfce7" },
} satisfies Record<string, { color: string; labelColor: string }>;

export function FileTypeIcon({ extension, size = 26 }: FileTypeIconProps) {
  const normalized = extension.replace(/^\./, "").toLowerCase() || "txt";
  const style = {
    ...(defaultStyles[normalized as keyof typeof defaultStyles] ?? defaultStyles.txt),
    ...(CUSTOM_STYLES[normalized as keyof typeof CUSTOM_STYLES] ?? {}),
  };

  return (
    <div style={{ width: size, height: size }}>
      <FileIcon extension={normalized} {...style} />
    </div>
  );
}
