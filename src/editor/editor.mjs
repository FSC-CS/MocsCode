// CodeMirror core imports
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { 
  autocompletion, 
  acceptCompletion,
  completionKeymap 
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

// *** COLLABORATIVE EDITING IMPORT ***
import { createCollaborativeExtensions } from './collab-features.js';

// Custom extensions (these files need to exist)
import { createAutoLanguageExtension } from './auto-language.mjs';
import { cursorTooltip } from './cursor-tooltip.mjs';
import { languageConfigs } from "./language-support.js";
import { 
  toggleLineWrapping, 
  toggleHighlightActiveLine, 
  toggleYellowBackground 
} from './toggle-extension.mjs';

// JSDoc completion configuration
function completeJSDoc(context) {
  let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (nodeBefore.name != "BlockComment" ||
      context.state.sliceDoc(nodeBefore.from, nodeBefore.from + 3) != "/**")
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

// Create compartments for dynamic configuration
const languageCompartment = new Compartment();
const themeCompartment = new Compartment();
const tabSizeCompartment = new Compartment();
const readOnlyCompartment = new Compartment();
const autocompleteCompartment = new Compartment();

// Export compartments for external use
export { autocompleteCompartment, tabSizeCompartment };

// Custom themes
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
  // Syntax highlighting
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

/**
 * Create a CodeMirror EditorView for React or standalone use
 * @param {Object} opts
 * @param {HTMLElement} opts.parent - DOM node to mount editor in
 * @param {string} opts.doc - Initial document content
 * @param {string} opts.language - Language string (e.g. 'python', 'java', ...)
 * @param {function} opts.onChange - Callback for document changes
 * @param {number} opts.tabSize - Tab size (default: 4)
 * @param {boolean} opts.autocomplete - Enable autocomplete (default: true)
 * @param {string} opts.theme - Theme ('light' or 'dark', default: 'dark')
 * @param {boolean} opts.readOnly - Read-only mode (default: false)
 * @param {Object} opts.collaborative - Collaborative editing config { roomId, userName, userColor }
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
  collaborative = null,  // *** NEW: Collaborative editing support ***
  file_name = 'untitled'
}) {
  // Get language extension
  let langExt;
  switch (language.toLowerCase()) {
    case 'python': 
      langExt = python();
      break;
    case 'java': 
      langExt = java();
      break;
    case 'cpp':
    case 'c++': 
      langExt = cpp();
      break;
    case 'html': 
      langExt = html();
      break;
    case 'javascript':
    case 'js':
    default: 
      langExt = javascript();
      break;
  }

  // *** COLLABORATIVE SETUP ***
  let collaborativeInstance = null;
  let isCollaborative = false;
  
  if (collaborative && collaborative.roomId) {
    try {
      collaborativeInstance = createCollaborativeExtensions(collaborative.roomId, {
        userName: collaborative.userName || `User-${Math.floor(Math.random() * 1000)}`,
        userColor: /*collaborative.userColor ||*/ {
          color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
          light: `hsl(${Math.floor(Math.random() * 360)}, 70%, 85%)`
        }
      });
      isCollaborative = true;
      
      // Set up collaborative event handlers
      if (collaborative.onUserJoin) {
        collaborativeInstance.onUserJoin(collaborative.onUserJoin);
      }
      if (collaborative.onUserLeave) {
        collaborativeInstance.onUserLeave(collaborative.onUserLeave);
      }
      if (collaborative.onContentChange) {
        collaborativeInstance.onContentChange(collaborative.onContentChange);
      }
      
      console.log('✅ Collaborative editing enabled for room:', collaborative.roomId);
    } catch (error) {
      console.error('❌ Failed to setup collaborative editing:', error);
      isCollaborative = false;
    }
  }

  // Configure extensions
  const extensions = [
    // Basic setup
    basicSetup,
    
    // Line numbers and code folding
    lineNumbers(),
    
    // Special character highlighting
    highlightSpecialChars(),
        
    // Selection and cursor behavior
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    rectangularSelection(),
    crosshairCursor(),
    
    // Syntax features
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle),
    bracketMatching(),
    
    // Line highlighting
    highlightActiveLine(),
    highlightActiveLineGutter(),
    
    // Language support
    languageCompartment.of(langExt),
    
    // Tab size
    tabSizeCompartment.of(EditorState.tabSize.of(tabSize)),
    
    // Theme
    themeCompartment.of(theme === 'dark' ? darkTheme : lightTheme),
    
    // Read-only
    readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
    
    // Autocompletion
    autocompleteCompartment.of(autocomplete ? [autocompletion(), ...languageConfigs[language]?.completions || []] : []),
    
    // *** COLLABORATIVE EXTENSIONS ***
    ...(isCollaborative ? collaborativeInstance.extensions : []),
    
    // Custom extensions (only if they exist)
    ...(typeof createAutoLanguageExtension === 'function' ? [createAutoLanguageExtension(languageCompartment)] : []),
    ...(typeof cursorTooltip === 'function' ? cursorTooltip() : []),
    ...(typeof toggleLineWrapping === 'function' ? [toggleLineWrapping()] : []),
    ...(typeof toggleHighlightActiveLine === 'function' ? [toggleHighlightActiveLine()] : []),
    ...(typeof toggleYellowBackground === 'function' ? [toggleYellowBackground()] : []),
    
    // Change listener (only for non-collaborative editors to avoid conflicts)
    ...(isCollaborative ? [] : [
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      })
    ]),
    
    // Keymaps
    keymap.of([
      {
        key: 'Tab',
        run: (view) => {
          // First, check if autocomplete is available and accept it
          if (acceptCompletion(view)) return true;
          
          // Get current tab size from the editor state
          const currentTabSize = view.state.tabSize;
          
          // Create a string of spaces equal to tab size
          const spaces = ' '.repeat(currentTabSize);
          
          // Get the current cursor position
          const cursorPosition = view.state.selection.main.from;
          
          // Insert spaces at cursor position and move cursor forward
          view.dispatch({
            changes: { 
              from: cursorPosition, 
              insert: spaces 
            },
            selection: { 
              anchor: cursorPosition + currentTabSize 
            }
          });
          
          return true;
        }
      },
      {
        key: "Shift-Tab", 
        run: indentWithTab
      },
      ...defaultKeymap.filter(binding => binding.key !== 'Tab'),
      ...historyKeymap,
      ...completionKeymap,
    ])
  ];

  // Create editor state
  const state = EditorState.create({
    doc: isCollaborative ? '' : doc, // Collaborative editors get content from YJS
    extensions
  });
  
  // Create editor view
  const view = new EditorView({
    state,
    parent
  });

  // *** ATTACH COLLABORATIVE INSTANCE ***
  if (isCollaborative) {
    view._collaborativeInstance = collaborativeInstance;
    view._isCollaborative = true;
    
    // Set initial content for collaborative editor if provided
    if (doc && doc.length > 0) {
      // Only set initial content if the collaborative document is empty
      setTimeout(() => {
        if (collaborativeInstance.getContent().length === 0) {
          collaborativeInstance.ytext.insert(0, doc);
        }
      }, 100); // Small delay to ensure connection is established
    }
  } else {
    view._isCollaborative = false;
  }

  return view;
}

// *** ENHANCED UTILITY FUNCTIONS ***
export function updateEditorSettings(view, { tabSize, autocomplete, theme, language, readOnly }) {
  const effects = [];
  
  if (typeof tabSize === 'number') {
    effects.push(tabSizeCompartment.reconfigure(EditorState.tabSize.of(tabSize)));
  }
  
  if (typeof autocomplete === 'boolean') {
    effects.push(autocompleteCompartment.reconfigure(
      autocomplete ? [autocompletion(), ...languageConfigs[language]?.completions || []] : []
    ));
  }
  
  if (theme === 'dark' || theme === 'light') {
    effects.push(themeCompartment.reconfigure(theme === 'dark' ? darkTheme : lightTheme));
  }
  
  if (typeof readOnly === 'boolean') {
    effects.push(readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)));
  }
  
  if (language) {
    let langExt;
    switch (language.toLowerCase()) {
      case 'python': langExt = python(); break;
      case 'java': langExt = java(); break;
      case 'cpp': case 'c++': langExt = cpp(); break;
      case 'html': langExt = html(); break;
      case 'javascript': case 'js': default: langExt = javascript(); break;
    }
    effects.push(languageCompartment.reconfigure(langExt));
  }
  
  if (effects.length > 0) {
    view.dispatch({ effects });
  }
}

// *** NEW: Collaborative utility functions ***
export function getCollaborativeInfo(view) {
  if (!view._isCollaborative || !view._collaborativeInstance) {
    return null;
  }
  
  return {
    connectedUsers: view._collaborativeInstance.getConnectedUsers(),
    isConnected: view._collaborativeInstance.provider.connected,
    roomId: view._collaborativeInstance.provider.roomname
  };
}

export function destroyCollaborative(view) {
  if (view._collaborativeInstance) {
    view._collaborativeInstance.destroy();
    view._collaborativeInstance = null;
    view._isCollaborative = false;
  }
}

// Individual update functions (unchanged)
export function updateTabSize(view, newSize) {
  view.dispatch({
    effects: tabSizeCompartment.reconfigure(EditorState.tabSize.of(newSize))
  });
}

export function updateLanguage(view, language) {
  let langExt;
  switch (language.toLowerCase()) {
    case 'python': langExt = python(); break;
    case 'java': langExt = java(); break;
    case 'cpp': case 'c++': langExt = cpp(); break;
    case 'html': langExt = html(); break;
    case 'javascript': case 'js': default: langExt = javascript(); break;
  }
  view.dispatch({
    effects: languageCompartment.reconfigure(langExt)
  });
}

export function updateTheme(view, theme) {
  view.dispatch({
    effects: themeCompartment.reconfigure(theme === 'dark' ? darkTheme : lightTheme)
  });
}

export function updateAutocomplete(view, enabled) {
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

// Global editor instance (for backward compatibility)
let globalEditor = null;

// Initialize global editor if DOM is available
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
      
      // Attach to window for debugging
      window.editor = globalEditor;
      
      // Global functions for backward compatibility
      window.getEditorContent = () => globalEditor?.state.doc.toString() || '';
      window.setLanguage = (lang) => globalEditor && updateLanguage(globalEditor, lang);
      window.setTabSize = (size) => globalEditor && updateTabSize(globalEditor, size);
      window.setTheme = (theme) => globalEditor && updateTheme(globalEditor, theme);
      window.setReadOnly = (readOnly) => globalEditor && updateReadOnly(globalEditor, readOnly);
      window.setAutocompleteEnabled = (enabled) => globalEditor && updateAutocomplete(globalEditor, enabled);
      
      // *** NEW: Collaborative debugging functions ***
      window.getCollaborativeInfo = () => globalEditor && getCollaborativeInfo(globalEditor);
    }
  });
}