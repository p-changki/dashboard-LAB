import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "dir";
const targetArgs = resolveTargetArgs(mode);

await runCommand("pnpm", ["build"]);
await runCommand(
  "pnpm",
  [
    "exec",
    "electron-builder",
    ...targetArgs,
  ],
  {
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: "false",
    },
  },
);

function resolveTargetArgs(mode) {
  if (mode === "dir") {
    return ["--dir"];
  }

  if (mode === "dist") {
    return [];
  }

  if (mode === "dist:mac") {
    return ["--mac"];
  }

  if (mode === "dist:win") {
    return ["--win"];
  }

  if (mode === "dist:linux") {
    return ["--linux"];
  }

  throw new Error(
    `Unsupported desktop build mode: ${mode}. Expected one of dir, dist, dist:mac, dist:win, dist:linux.`,
  );
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: options.env ?? process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}
