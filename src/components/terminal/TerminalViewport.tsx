"use client";

import "@xterm/xterm/css/xterm.css";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

interface TerminalViewportProps {
  buffer: string;
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

export default function TerminalViewport({
  buffer,
  onInput,
  onResize,
}: TerminalViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const bufferRef = useRef("");

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, monospace",
      theme: { background: "#000000", foreground: "#E5E7EB" },
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(mountRef.current!);
    fitAddon.fit();
    terminal.onData(onInput);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    onResize(terminal.cols, terminal.rows);

    const handleResize = () => {
      fitAddon.fit();
      onResize(terminal.cols, terminal.rows);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
    };
  }, [onInput, onResize]);

  useEffect(() => {
    if (!terminalRef.current || bufferRef.current === buffer) {
      return;
    }

    if (buffer.startsWith(bufferRef.current)) {
      terminalRef.current.write(buffer.slice(bufferRef.current.length));
      bufferRef.current = buffer;
      return;
    }

    terminalRef.current.reset();
    terminalRef.current.write(buffer);
    bufferRef.current = buffer;
  }, [buffer]);

  return <div ref={mountRef} className="h-[420px] w-full rounded-2xl bg-black p-2" />;
}
