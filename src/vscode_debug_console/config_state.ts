import * as vscode from 'vscode';

/**
 * Controls how file paths are displayed in logs.
 */
export type RelativePathMode =
    | 'session'   // Only the currently active session project will use relative paths.
    | 'workspace' // Any file within a workspace will use relative paths.
    | 'always'    // All file paths will always be displayed as relative.
    | 'never';    // All file paths will always be displayed as absolute.

/**
 * Configuration state for the Flutter Logger extension.
 */
export interface ConfigState {
    relativePathMode: RelativePathMode;
    showEmoji: boolean;
    emojiMap: Record<string, string>;
    silent: boolean;
}

/**
 * Configuration from VSCode settings, supporting workspace override.
 */
export function loadConfig(): ConfigState {
    const resourceUri = vscode.window.activeTextEditor?.document.uri;

    const globalConfig = vscode.workspace.getConfiguration('FlutterLoggerEasyLife');
    const workspaceConfig = vscode.workspace.getConfiguration('FlutterLoggerEasyLife', resourceUri);

    const relativePathMode =
        workspaceConfig.get<RelativePathMode>('relativePathMode') ??
        globalConfig.get<RelativePathMode>('relativePathMode') ??
        'workspace'; // fallback to default
    const showEmoji =
        workspaceConfig.get<boolean>('showEmoji') ??
        globalConfig.get<boolean>('showEmoji') ??
        true; // fallback to default

    const emojiMap = {
        ...defaultEmojiMap,
        ...globalConfig.get<Record<string, string>>('emojiMap'),
        ...workspaceConfig.get<Record<string, string>>('emojiMap'),
    };
    const silent =
        workspaceConfig.get<boolean>('silent') ??
        globalConfig.get<boolean>('silent') ??
        true; // fallback to default

    return {
        relativePathMode,
        showEmoji,
        emojiMap,
        silent
    };
}

const defaultEmojiMap: Record<string, string> = {
    session: "🎯",
    sdk: "🔧",
    pub: "📦",
    local: "🧩",
};