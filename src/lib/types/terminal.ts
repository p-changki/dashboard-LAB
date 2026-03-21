export interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  createdAt: string;
  isActive: boolean;
}

export interface QuickLaunchCommand {
  label: string;
  command: string;
}

export interface QuickLaunchItem {
  label: string;
  projectPath: string;
  projectType: string;
  commands: QuickLaunchCommand[];
}

export interface TerminalBookmark {
  id: string;
  label: string;
  command: string;
  createdAt: string;
}
