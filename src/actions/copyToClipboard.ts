import type { ActionCopyToClipboard, WrappedError } from '../../typings/common';
import type { MaybeMissing } from '../expressions/json';
import { wrapError } from '../utils/wrapError';

/**
 * Clipboard interface for React Native
 * Uses @react-native-clipboard/clipboard when available
 */
interface ClipboardInterface {
    setString: (content: string) => void;
}

// Optional clipboard module - will be undefined if not installed
let Clipboard: ClipboardInterface | undefined;

/**
 * Initialize clipboard module
 * This function attempts to load @react-native-clipboard/clipboard
 * Returns true if clipboard is available
 */
export function initClipboard(clipboardModule?: ClipboardInterface): boolean {
    if (clipboardModule) {
        Clipboard = clipboardModule;
        return true;
    }

    // Try to dynamically require the clipboard module
    try {
        // This will work if @react-native-clipboard/clipboard is installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Clipboard = require('@react-native-clipboard/clipboard').default;
        return true;
    } catch {
        // Clipboard module not installed
        return false;
    }
}

/**
 * Copy content to clipboard
 * Requires @react-native-clipboard/clipboard to be installed
 */
export function copyToClipboard(
    logError: (error: WrappedError) => void,
    actionTyped: MaybeMissing<ActionCopyToClipboard>
): void {
    if (
        !(
            actionTyped.content &&
            (actionTyped.content.type === 'text' || actionTyped.content.type === 'url') &&
            typeof actionTyped.content.value === 'string'
        )
    ) {
        logError(
            wrapError(new Error('Incorrect action'), {
                additional: {
                    action: actionTyped
                }
            })
        );
        return;
    }

    // Ensure clipboard is initialized
    if (!Clipboard) {
        initClipboard();
    }

    if (!Clipboard) {
        logError(
            wrapError(new Error('Clipboard is unavailable. Install @react-native-clipboard/clipboard'), {
                additional: {
                    action: actionTyped
                }
            })
        );
        return;
    }

    try {
        Clipboard.setString(actionTyped.content.value);
    } catch (err) {
        logError(
            wrapError(new Error('Failed to copy to the clipboard'), {
                additional: {
                    originalError: String(err)
                }
            })
        );
    }
}
