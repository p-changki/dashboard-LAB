"use client";

import { useEffect, useState } from "react";

interface SearchInputProps {
  open: boolean;
  onQueryChange: (value: string) => void;
}

export function SearchInput({ open, onQueryChange }: SearchInputProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => onQueryChange(value), 200);
    return () => window.clearTimeout(timer);
  }, [value, onQueryChange]);

  useEffect(() => {
    if (!open) {
      setValue("");
    }
  }, [open]);

  return (
    <input
      autoFocus
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="스킬, 에이전트, 프로젝트, 노트, 문서, 앱 검색"
      className="w-full rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-sm text-[#f0f0f0] outline-none transition-all duration-[150ms] placeholder:text-gray-500 focus:border-purple-500/60 focus:bg-[#242424]"
    />
  );
}
