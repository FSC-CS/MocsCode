// codemirror-config.js - Core configuration and extensions
import { EditorState, Compartment } from "@codemirror/state"
import { 
  autocompletion, 
  completionKeymap, 
  closeBrackets,
  closeBracketsKeymap,
  acceptCompletion
} from "@codemirror/autocomplete"
import {
  EditorView, 
  keymap, 
  highlightSpecialChars, 
  drawSelection,
  highlightActiveLine, 
  dropCursor, 
  rectangularSelection,
  crosshairCursor, 
  lineNumbers, 
  highlightActiveLineGutter
} from "@codemirror/view"
import {
  defaultHighlightStyle, 
  syntaxHighlighting, 
  indentOnInput,
  bracketMatching, 
  foldGutter, 
  foldKeymap
} from "@codemirror/language"
import { syntaxThemes, getSyntaxTheme } from './syntax-themes'
import {
  defaultKeymap, 
  history, 
  historyKeymap, 
  indentWithTab
} from "@codemirror/commands"
import {
  searchKeymap, 
  highlightSelectionMatches
} from "@codemirror/search"
import { lintKeymap } from "@codemirror/lint"

// Create compartments for dynamic configuration
export const compartments = {
  language: new Compartment(),
  theme: new Compartment(),
  readOnly: new Compartment(),
  autocomplete: new Compartment(),
  tabSize: new Compartment(),
  syntaxTheme: new Compartment()
};

// Add syntax theme to the theme compartment
export const syntaxThemeCompartment = new Compartment();

// Default editor configuration
export const defaultConfig = {
  tabSize: 4,
  autocomplete: true,
  readOnly: false,
  theme: 'dark',
  syntaxTheme: 'default',
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true
};

// Dark theme
export const darkTheme = EditorView.theme({
  "&": { 
    backgroundColor: "#1a1f2e",
    color: "#e2e8f0",
    height: "100%",
    "&.cm-editor": { 
      height: "100%",
      outline: "none"
    },
    "& .cm-scroller": { 
      overflow: "auto",
      scrollbarWidth: "thin",
      fontFamily: '"Fira Code", monospace',
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
    "& .cm-gutters": {
      backgroundColor: "#1a1f2e",
      color: "#64748b",
      borderRight: "1px solid #1e293b"
    },
    "& .cm-activeLine": {
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
    }
  },
  ".cm-content": { 
    fontFamily: '"Fira Code", monospace', 
    fontSize: "14px",
    minHeight: "100%",
    caretColor: "#60a5fa"
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

// Light theme
export const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#1f2937"
  },
  ".cm-content": {
    fontFamily: '"Fira Code", monospace',
    fontSize: "14px"
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
    backgroundColor: "#f5f5f5"
  },
  ".cm-activeLine": {
    backgroundColor: "#f8f9fa"
  }
});

// Custom tab handling keymap
export const createTabKeymap = () => [
  {
    key: 'Tab',
    run: (view) => {
      // First, check if autocomplete is available and accept it
      if (acceptCompletion(view)) return true;
      
      // Get current tab size from the editor state
      const tabSize = view.state.tabSize;
      
      // Create a string of spaces equal to tab size
      const spaces = ' '.repeat(tabSize);
      
      // Get the current cursor position
      const cursorPosition = view.state.selection.main.from;
      
      // Insert spaces at cursor position and move cursor forward
      view.dispatch({
        changes: { 
          from: cursorPosition, 
          insert: spaces 
        },
        selection: { 
          anchor: cursorPosition + tabSize 
        }
      });
      
      return true;
    }
  },
  {
    key: "Shift-Tab", 
    run: (view) => {
      return indentWithTab.shift(view);
    }
  }
];

// Base extensions that are always included
export const baseExtensions = [
  // Line numbers and code folding
  lineNumbers(),
  foldGutter(),
  
  // Special character highlighting
  highlightSpecialChars(),
  
  // History (undo/redo)
  history(),
  
  // Selection and cursor behavior
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  rectangularSelection(),
  crosshairCursor(),
  
  // Syntax features
  indentOnInput(),
  syntaxThemeCompartment.of(syntaxHighlighting(defaultHighlightStyle)),
  bracketMatching(),
  closeBrackets(),
  
  // Line highlighting
  highlightActiveLine(),
  highlightActiveLineGutter(),
  highlightSelectionMatches(),
  
  // Keymaps
  keymap.of([
    ...createTabKeymap(),
    ...closeBracketsKeymap,
    ...defaultKeymap.filter(binding => binding.key !== 'Tab'),
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap
  ])
];

// Create extensions array based on configuration
export function createExtensions(config = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  
  // Get the selected syntax theme
  const selectedSyntaxTheme = getSyntaxTheme(finalConfig.syntaxTheme);
  
  const extensions = [
    ...baseExtensions,
    compartments.theme.of(finalConfig.theme === 'dark' ? darkTheme : lightTheme),
    syntaxThemeCompartment.of(syntaxHighlighting(selectedSyntaxTheme)),
    compartments.tabSize.of(EditorState.tabSize.of(finalConfig.tabSize)),
    compartments.readOnly.of(EditorState.readOnly.of(finalConfig.readOnly)),
    compartments.autocomplete.of(
      finalConfig.autocomplete ? [autocompletion()] : []
    )
  ];

  // Add language extension if provided
  if (config.language) {
    extensions.push(compartments.language.of(config.language));
  }

  // Add change listener if provided
  if (config.onChange) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          config.onChange(update.state.doc.toString());
        }
      })
    );
  }

  return extensions;
}