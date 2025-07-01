// CodeMirror core imports
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import {
  autocompletion,
  acceptCompletion,
  completionKeymap,
  closeBrackets
} from '@codemirror/autocomplete';

// Language support
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';

// Additional CodeMirror features
import {
  lineNumbers,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view';

import {
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from '@codemirror/language';

import {
  defaultKeymap,
  historyKeymap,
  indentWithTab
} from '@codemirror/commands';

import { syntaxTree } from '@codemirror/language';

import { linter } from "@codemirror/lint";

import { yCollab } from 'y-codemirror.next';

// Custom extensions (assumed to exist)
import { createAutoLanguageExtension } from './auto-language.mjs';
import { cursorTooltip } from './cursor-tooltip.mjs';
import { languageConfigs } from './language-support.js';
import {
  toggleLineWrapping,
  toggleHighlightActiveLine,
  toggleYellowBackground
} from './toggle-extension.mjs';

// --- JSDoc completion configuration ---
function completeJSDoc(context) {
  let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (nodeBefore.name !== "BlockComment" ||
      context.state.sliceDoc(nodeBefore.from, nodeBefore.from + 3) !== "/**")
    return null;
  let textBefore = context.state.sliceDoc(nodeBefore.from, context.pos);
  let tagBefore = /@\w*$/.exec(textBefore);
  if (!tagBefore && !context.explicit) return null;

  const tagOptions = [
    { label: "@param", type: "keyword" },
    { label: "@returns", type: "keyword" },
    { label: "@throws", type: "keyword" },
    { label: "@example", type: "keyword" },
    { label: "@deprecated", type: "keyword" }
  ];

  return {
    from: tagBefore ? nodeBefore.from + tagBefore.index : context.pos,
    options: tagOptions,
    validFor: /^(@\w*)?$/
  };
}

// --- Compartments for dynamic reconfiguration ---
const languageCompartment = new Compartment();
const themeCompartment = new Compartment();
const tabSizeCompartment = new Compartment();
const readOnlyCompartment = new Compartment();
const autocompleteCompartment = new Compartment();

// Export compartments for external use
export { autocompleteCompartment, tabSizeCompartment };

// --- Custom Themes ---
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#333333"
  },
  ".cm-content": {
    fontFamily: '"Fira Code", "Consolas", monospace',
    fontSize: "14px",
    minHeight: "100%",
    caretColor: "#0080ff"
  },
  ".cm-line": {
    padding: "0 8px",
    lineHeight: "1.6"
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#0080ff"
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#c0dfff"
  },
  ".cm-gutters": {
    backgroundColor: "#f5f5f5",
    color: "#999",
    border: "none"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#e8e8e8"
  },
  ".cm-activeLine": {
    backgroundColor: "#f0f0f0"
  }
});

const darkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1a1f2e",
    color: "#e2e8f0",
    height: "100%"
  },
  ".cm-content": {
    fontFamily: '"Fira Code", "Consolas", monospace',
    fontSize: "14px",
    minHeight: "100%",
    caretColor: "#60a5fa"
  },
  ".cm-scroller": {
    overflow: "auto",
    scrollbarWidth: "thin",
    "&::-webkit-scrollbar": {
      width: "8px",
      height: "8px"
    },
    "&::-webkit-scrollbar-track": {
      background: "#1e293b"
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#334155",
      borderRadius: "4px"
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "#475569"
    }
  },
  ".cm-gutters": {
    backgroundColor: "#1a1f2e",
    color: "#64748b",
    borderRight: "1px solid #1e293b"
  },
  ".cm-activeLine": {
    backgroundColor: "#1e293b"
  },
  "&.cm-focused .cm-cursor": {
    borderLeft: "2px solid #60a5fa"
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#2d3a5a"
  },
  "&.cm-focused .cm-matchingBracket": {
    backgroundColor: "#2d3a5a",
    outline: "1px solid #60a5fa"
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 16px"
  },
  ".cm-line": {
    padding: "0 8px"
  },
  // Syntax highlighting colors
  ".cm-keyword": { color: "#93c5fd" },
  ".cm-builtin": { color: "#fca5a5" },
  ".cm-string": { color: "#86efac" },
  ".cm-number": { color: "#f0abfc" },
  ".cm-comment": { color: "#64748b" },
  ".cm-def": { color: "#93c5fd" },
  ".cm-variable": { color: "#e2e8f0" },
  ".cm-variable-2": { color: "#e2e8f0" },
  ".cm-type-name": { color: "#93c5fd" },
  ".cm-property": { color: "#93c5fd" },
  ".cm-operator": { color: "#e2e8f0" },
  ".cm-tag": { color: "#93c5fd" },
  ".cm-attribute": { color: "#f0abfc" },
  ".cm-type": { color: "#93c5fd" },
  ".cm-class-name": { color: "#93c5fd" }
});

// --- Utility: Get language extension by name ---
function getLanguageExtension(language) {
  switch (language.toLowerCase()) {
    case 'python': return python();
    case 'java': return java();
    case 'cpp':
    case 'c++': return cpp();
    case 'html': return html();
    case 'javascript':
    case 'js':
    default: return javascript();
  }
}

// --- Main function to create editor ---
/**
 * Create a CodeMirror EditorView instance
 * @param {Object} opts - Configuration options
 * @param {HTMLElement} opts.parent - DOM node to mount the editor in
 * @param {string} [opts.doc=''] - Initial document content
 * @param {string} [opts.language='javascript'] - Language name for syntax highlighting
 * @param {function} [opts.onChange] - Callback on document change
 * @param {number} [opts.tabSize=4] - Tab size for indentation
 * @param {boolean} [opts.autocomplete=true] - Enable or disable autocompletion
 * @param {string} [opts.theme='dark'] - Editor theme ('light' or 'dark')
 * @param {boolean} [opts.readOnly=false] - Read-only mode toggle
 * @returns {Object} - Contains the editor view instance
 */
export function createEditorView({
  parent,
  doc = '',
  language = 'javascript',
  onChange,
  tabSize = 4,
  autocomplete = true,
  theme = 'dark',
  readOnly = false,
  ytext,
  provider,
}) {
  const langExt = getLanguageExtension(language);

  console.log("DATA", ytext, provider, yCollab);

  // Compose extensions
  const extensions = [
    basicSetup,
    yCollab(ytext, provider.awareness),
    lineNumbers(),
    highlightSpecialChars(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    rectangularSelection(),
    crosshairCursor(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle),
    bracketMatching(),
    closeBrackets(),
    
    // Autocompletion (toggled via compartment)
    autocompleteCompartment.of(
      autocomplete
        ? [
            autocompletion({
              activateOnTyping: true,
              defaultKeymap: true
            }),
            ...(languageConfigs[language]?.completions || [])
          ]
        : []
    ),
    
    
    // Line highlighting
    highlightActiveLine(),
    highlightActiveLineGutter(),
    languageCompartment.of(langExt),
    tabSizeCompartment.of(EditorState.tabSize.of(tabSize)),
    themeCompartment.of(theme === 'dark' ? darkTheme : lightTheme),
    readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),

    EditorView.updateListener.of(update => {
      if (update.docChanged && typeof onChange === "function") {
        const content = update.state.doc.toString();
        onChange(content);
      }
    }),

    // Custom extensions if available
    ...(typeof createAutoLanguageExtension === 'function' ? [createAutoLanguageExtension(languageCompartment)] : []),
    ...(typeof cursorTooltip === 'function' ? cursorTooltip() : []),
    ...(typeof toggleLineWrapping === 'function' ? [toggleLineWrapping()] : []),
    ...(typeof toggleHighlightActiveLine === 'function' ? [toggleHighlightActiveLine()] : []),
    ...(typeof toggleYellowBackground === 'function' ? [toggleYellowBackground()] : []),


    // Keymaps with custom Tab behavior
    keymap.of([
      {
        key: 'Tab',
        run: (view) => {
          if (acceptCompletion(view)) return true;
          const currentTabSize = view.state.tabSize;
          const spaces = ' '.repeat(currentTabSize);
          const cursorPos = view.state.selection.main.from;
          view.dispatch({
            changes: { from: cursorPos, insert: spaces },
            selection: { anchor: cursorPos + currentTabSize }
          });
          return true;
        }
      },
      {
        key: 'Shift-Tab',
        run: indentWithTab
      },
      ...defaultKeymap.filter(binding => binding.key !== 'Tab'),
      ...historyKeymap,
      ...completionKeymap,
    ]),
  ];

  const state = EditorState.create({
    doc,
    extensions
  });

  const view = new EditorView({
    state,
    parent
  });

  return view;
}

// --- Dynamic update functions ---

export function updateEditorSettings(view, { tabSize, autocomplete, theme, language, readOnly }) {
  const effects = [];

  if (typeof tabSize === 'number') {
    effects.push(tabSizeCompartment.reconfigure(EditorState.tabSize.of(tabSize)));
  }

  if (typeof autocomplete === 'boolean') {
    effects.push(
      autocompleteCompartment.reconfigure(
        autocomplete ? [autocompletion(), ...languageConfigs[language]?.completions || []] : []
      )
    );
  }

  if (theme === 'dark' || theme === 'light') {
    effects.push(themeCompartment.reconfigure(theme === 'dark' ? darkTheme : lightTheme));
  }

  if (typeof readOnly === 'boolean') {
    effects.push(readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)));
  }

  if (language) {
    effects.push(languageCompartment.reconfigure(getLanguageExtension(language)));
  }

  if (effects.length > 0) {
    view.dispatch({ effects });
  }
}

export function updateTabSize(view, newSize) {
  view.dispatch({
    effects: tabSizeCompartment.reconfigure(EditorState.tabSize.of(newSize))
  });
}

export function updateLanguage(view, language) {
  view.dispatch({
    effects: languageCompartment.reconfigure(getLanguageExtension(language))
  });
}

export function updateTheme(view, theme) {
  view.dispatch({
    effects: themeCompartment.reconfigure(theme === 'dark' ? darkTheme : lightTheme)
  });
}

export function updateAutocomplete(view, enabled, language) {
  view.dispatch({
    effects: autocompleteCompartment.reconfigure(
      enabled ? [autocompletion(), ...languageConfigs[language]?.completions || []] : []
    )
  });
}

export function updateReadOnly(view, readOnly) {
  view.dispatch({
    effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly))
  });
}

// --- Global editor instance (for backward compatibility) ---
let globalEditor = null;

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener('DOMContentLoaded', () => {
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
      globalEditor = createEditorView({
        parent: editorContainer,
        doc: '// Welcome to CodeMirror!\nconsole.log("Hello, World!");',
        language: 'javascript',
        onChange: (content) => {
          console.log('Editor content changed:', content.length, 'characters');
        }
      });

      window.editor = globalEditor;

      // Backwards compatibility functions
      window.getEditorContent = () => globalEditor?.view.state.doc.toString() || '';
      window.setLanguage = (lang) => globalEditor && updateLanguage(globalEditor.view, lang);
      window.setTabSize = (size) => globalEditor && updateTabSize(globalEditor.view, size);
      window.setTheme = (theme) => globalEditor && updateTheme(globalEditor.view, theme);
      window.setReadOnly = (readOnly) => globalEditor && updateReadOnly(globalEditor.view, readOnly);
      window.setAutocompleteEnabled = (enabled) => globalEditor && updateAutocomplete(globalEditor.view, enabled, 'javascript');
    }
  });
}
