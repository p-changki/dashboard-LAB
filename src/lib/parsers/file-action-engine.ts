import { mkdir, rename } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  FileAction,
  FileActionResponse,
  FileActionResult,
} from "@/lib/types";

import { pathExists, shellQuote, toHomePath } from "./shared";

const HOME_DIR = os.homedir();
const TRASH_DIR = path.join(HOME_DIR, ".Trash");
const ALLOWED_ROOTS = [
  path.join(HOME_DIR, "Desktop"),
  path.join(HOME_DIR, "Downloads"),
];
const PROTECTED_PATHS = [
  path.join(HOME_DIR, ".claude"),
  path.join(HOME_DIR, ".codex"),
  path.join(HOME_DIR, ".ssh"),
  path.join(HOME_DIR, ".aws"),
  path.join(HOME_DIR, ".gnupg"),
  path.join(HOME_DIR, ".kube"),
];

export async function executeActions(actions: FileAction[], dryRun = true) {
  const limitedActions = actions.slice(0, 100);
  const results = await Promise.all(
    limitedActions.map((action) => executeSingleAction(action, dryRun)),
  );

  return {
    results,
    totalSuccess: results.filter((item) => item.success).length,
    totalFailed: results.filter((item) => !item.success).length,
    undoScript: generateUndoScript(results),
  } satisfies FileActionResponse;
}

export function generateUndoScript(results: FileActionResult[]) {
  return results
    .map((result) => result.undoCommand)
    .filter((command): command is string => Boolean(command))
    .join("\n");
}

export async function validatePath(targetPath: string) {
  if (!targetPath || !path.isAbsolute(targetPath)) {
    return false;
  }

  const resolvedPath = path.resolve(targetPath);
  const isAllowedRoot = ALLOWED_ROOTS.some((allowedRoot) => isInsidePath(resolvedPath, allowedRoot));

  if (PROTECTED_PATHS.some((protectedPath) => resolvedPath.startsWith(protectedPath))) {
    return false;
  }

  return isAllowedRoot && !(await isInsideCodeProject(resolvedPath));
}

function isInsidePath(targetPath: string, rootPath: string) {
  return targetPath === rootPath || targetPath.startsWith(`${rootPath}${path.sep}`);
}

async function executeSingleAction(action: FileAction, dryRun: boolean) {
  if (!(await validateAction(action))) {
    return buildResult(false, action, "PROTECTED_PATH");
  }

  if (dryRun) {
    return buildResult(true, withCommand(action), null);
  }

  try {
    return action.type === "move"
      ? await moveFile(withCommand(action))
      : await trashFile(withCommand(action));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return buildResult(false, withCommand(action), message);
  }
}

async function validateAction(action: FileAction) {
  if (!(await validatePath(action.sourcePath))) {
    return false;
  }

  if (action.type === "move" && action.destinationPath) {
    return validateDestinationPath(action.destinationPath);
  }

  return true;
}

async function validateDestinationPath(targetPath: string) {
  if (!targetPath || !path.isAbsolute(targetPath)) {
    return false;
  }

  const resolvedPath = path.resolve(targetPath);

  if (PROTECTED_PATHS.some((protectedPath) => resolvedPath.startsWith(protectedPath))) {
    return false;
  }

  return !(await isInsideCodeProject(resolvedPath));
}

async function moveFile(action: FileAction) {
  if (!action.destinationPath) {
    return buildResult(false, action, "DESTINATION_REQUIRED");
  }

  await mkdir(path.dirname(action.destinationPath), { recursive: true });
  await rename(action.sourcePath, action.destinationPath);
  return buildResult(true, action, null);
}

async function trashFile(action: FileAction) {
  const trashTarget = path.join(TRASH_DIR, path.basename(action.sourcePath));
  await rename(action.sourcePath, trashTarget);
  return buildResult(true, { ...action, destinationPath: trashTarget }, null);
}

function buildResult(success: boolean, action: FileAction, error: string | null) {
  return {
    success,
    action,
    error,
    undoCommand: success ? buildUndoCommand(action) : null,
  } satisfies FileActionResult;
}

function buildUndoCommand(action: FileAction) {
  if (action.type === "move" && action.destinationPath) {
    return `mv ${shellQuote(action.destinationPath)} ${shellQuote(action.sourcePath)}`;
  }

  const trashTarget = action.destinationPath ?? path.join(TRASH_DIR, path.basename(action.sourcePath));
  return `mv ${shellQuote(trashTarget)} ${shellQuote(action.sourcePath)}`;
}

function withCommand(action: FileAction): FileAction {
  if (action.command) {
    return action;
  }

  return action.type === "move" && action.destinationPath
    ? {
        ...action,
        command: `mkdir -p ${shellQuote(path.dirname(action.destinationPath))} && mv ${shellQuote(action.sourcePath)} ${shellQuote(action.destinationPath)}`,
      }
    : {
        ...action,
        command: `mv ${shellQuote(action.sourcePath)} ${shellQuote(path.join(TRASH_DIR, path.basename(action.sourcePath)))}`,
      };
}

async function isInsideCodeProject(targetPath: string) {
  let current = path.resolve(targetPath);

  while (current.startsWith(path.join(HOME_DIR, "Desktop"))) {
    if (await pathExists(path.join(current, "package.json"))) {
      return true;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return false;
}

export function describeActionPath(targetPath: string) {
  return toHomePath(targetPath);
}
