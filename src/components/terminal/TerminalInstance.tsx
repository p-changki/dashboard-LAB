"use client";

import dynamic from "next/dynamic";

const TerminalViewport = dynamic(() => import("./TerminalViewport"), { ssr: false });

interface TerminalInstanceProps {
  buffer: string;
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

export function TerminalInstance(props: TerminalInstanceProps) {
  return <TerminalViewport {...props} />;
}
