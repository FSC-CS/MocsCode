import {EditorState, Compartment} from "@codemirror/state"
import {acceptCompletion} from "@codemirror/autocomplete"
import {
  EditorView, keymap, highlightSpecialChars, drawSelection,
  highlightActiveLine, dropCursor, rectangularSelection,
  crosshairCursor, lineNumbers, highlightActiveLineGutter
} from "@codemirror/view"
import {
  defaultHighlightStyle, syntaxHighlighting, indentOnInput,
  bracketMatching, foldGutter, foldKeymap
} from "@codemirror/language"
import {
  defaultKeymap, history, historyKeymap, indentWithTab
} from "@codemirror/commands"
import {EditorSelection} from "@codemirror/state"
import {
  searchKeymap, highlightSelectionMatches
} from "@codemirror/search"
import {
  autocompletion, completionKeymap, closeBrackets,
  closeBracketsKeymap
} from "@codemirror/autocomplete"
import {lintKeymap} from "@codemirror/lint"
import {javascript, javascriptLanguage} from "@codemirror/lang-javascript"
import {python, pythonLanguage} from "@codemirror/lang-python"
import {html} from "@codemirror/lang-html"
import {java, javaLanguage} from "@codemirror/lang-java"
import {cpp, cppLanguage} from "@codemirror/lang-cpp"
import {toggleLineWrapping, toggleHighlightActiveLine, toggleYellowBackground} from "./toggle-extension.mjs"
import {createAutoLanguageExtension} from "./auto-language.mjs"
import {cursorTooltip} from "./cursor-tooltip.mjs"

// --- JSDoc Autocomplete for JavaScript ---
import {syntaxTree} from "@codemirror/language"

// --- Python Keyword Autocomplete ---
const pythonKeywords = [
  // Snippet completions for control flow
  {label: "for", type: "keyword", apply: "for i in range():\n    ", info: "Python for loop", boost: 100},
  {label: "while", type: "keyword", apply: "while :\n    ", info: "Python while loop", boost: 100},
  {label: "if", type: "keyword", apply: "if :\n    ", info: "Python if statement", boost: 100},
  {label: "elif", type: "keyword", apply: "elif :\n    ", info: "Python elif statement", boost: 100},
  {label: "else", type: "keyword", apply: "else:\n    ", info: "Python else statement", boost: 100},
  // Standard keywords
  ...[
    "and", "as", "assert", "break", "class", "continue", "def", "del", "elif", "else", "except",
    "False", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "None",
    "nonlocal", "not", "or", "pass", "raise", "return", "True", "try", "while", "with", "yield"
  ].map(word => ({label: word, type: "keyword"}))
];

function pythonKeywordCompletion(context) {
  let word = context.matchBefore(/\w*/);
  if (!word || (word.from == word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: pythonKeywords,
    validFor: /^\w*$/
  };
}

const pythonCompletions = pythonLanguage.data.of({
  autocomplete: pythonKeywordCompletion
});

// --- C++ Keyword Autocomplete ---
const cppKeywords = [
  // Snippet completions for control flow
  {label: "for", type: "keyword", apply: "for (int i = 0; i < n; i++) {\n    \n}", info: "C++ for loop", boost: 100},
  {label: "while", type: "keyword", apply: "while () {\n    \n}", info: "C++ while loop", boost: 100},
  {label: "if", type: "keyword", apply: "if () {\n    \n}", info: "C++ if statement", boost: 100},
  {label: "switch", type: "keyword", apply: "switch () {\n    case :\n        break;\n    default:\n        break;\n}", info: "C++ switch statement", boost: 100},
  // Standard keywords
  ...[
    "alignas", "alignof", "and", "and_eq", "asm", "auto", "bitand", "bitor", "bool", "break", "case", "catch", "char", "char16_t", "char32_t", "class", "compl", "const", "constexpr", "const_cast", "continue", "decltype", "default", "delete", "do", "double", "dynamic_cast", "else", "enum", "explicit", "export", "extern", "false", "float", "for", "friend", "goto", "if", "inline", "int", "long", "mutable", "namespace", "new", "noexcept", "not", "not_eq", "nullptr", "operator", "or", "or_eq", "private", "protected", "public", "register", "reinterpret_cast", "return", "short", "signed", "sizeof", "static", "static_assert", "static_cast", "struct", "switch", "template", "this", "thread_local", "throw", "true", "try", "typedef", "typeid", "typename", "union", "unsigned", "using", "virtual", "void", "volatile", "wchar_t", "while", "xor", "xor_eq"
  ].map(word => ({label: word, type: "keyword"}))
];

function cppKeywordCompletion(context) {
  let word = context.matchBefore(/\w*/);
  if (!word || (word.from == word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: cppKeywords,
    validFor: /^\w*$/
  };
}

const cppCompletions = cppLanguage.data.of({
  autocomplete: cppKeywordCompletion
});

// --- Java Keyword Autocomplete ---
const javaKeywords = [
  // Snippet completions for control flow
  {label: "for", type: "keyword", apply: "for (int i = 0; i < n; i++) {\n    \n}", info: "Java for loop", boost: 100},
  {label: "while", type: "keyword", apply: "while () {\n    \n}", info: "Java while loop", boost: 100},
  {label: "if", type: "keyword", apply: "if () {\n    \n}", info: "Java if statement", boost: 100},
  {label: "switch", type: "keyword", apply: "switch () {\n    case :\n        break;\n    default:\n        break;\n}", info: "Java switch statement", boost: 100},
  // Standard keywords
  ...[
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class",
    "const", "continue", "default", "do", "double", "else", "enum", "extends", "final",
    "finally", "float", "goto", "implements", "import", "instanceof", "int",
    "interface", "long", "native", "new", "package", "private", "protected", "public",
    "return", "short", "static", "strictfp", "super", "synchronized", "this",
    "throw", "throws", "transient", "try", "void", "volatile"
  ].map(word => ({label: word, type: "keyword"}))
];

function javaKeywordCompletion(context) {
  let word = context.matchBefore(/\w*/);
  if (!word || (word.from == word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: javaKeywords,
    validFor: /^\w*$/
  };
}

const javaCompletions = javaLanguage.data.of({
  autocomplete: javaKeywordCompletion
});

const tagOptions = [
  "constructor", "deprecated", "link", "param", "returns", "type"
].map(tag => ({label: "@" + tag, type: "keyword"}))

function completeJSDoc(context) {
  let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)
  if (nodeBefore.name != "BlockComment" ||
      context.state.sliceDoc(nodeBefore.from, nodeBefore.from + 3) != "/**")
    return null
  let textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
  let tagBefore = /@\w*$/.exec(textBefore)
  if (!tagBefore && !context.explicit) return null
  return {
    from: tagBefore ? nodeBefore.from + tagBefore.index : context.pos,
    options: tagOptions,
    validFor: /^(@\w*)?$/
  }
}

const jsDocCompletions = javascriptLanguage.data.of({
  autocomplete: completeJSDoc
})

// Create compartments for dynamic configuration
const languageCompartment = new Compartment()
const tabSizeCompartment = new Compartment()
const themeCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const autocompleteCompartment = new Compartment()

// Custom themes
const lightTheme = EditorView.theme({
  ".cm-content": {
    fontFamily: '"Fira Code", monospace',
    fontSize: "14px"
  },
  ".cm-line": {
    padding: "0 4px",
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
  }
});

const darkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4"
  },
  ".cm-content": {
    fontFamily: '"Fira Code", monospace',
    fontSize: "14px"
  },
  ".cm-line": {
    padding: "0 4px",
    lineHeight: "1.6"
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#80bfff"
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "#264f78"
  },
  ".cm-gutters": {
    backgroundColor: "#333333",
    color: "#858585",
    border: "none"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#333333"
  },
  ".cm-activeLine": {
    backgroundColor: "#282828"
  }
});

console.log('[CodeMirrorTest] editor.mjs loaded');

// Sample JavaScript code to display initially
const initialCode = `// Welcome to CodeMirror 6
function greet(name) {
  return \`Hello, ${name}!\`;
}

// Try folding this function (click the arrow in the gutter)
function calculateSum(a, b) {
  // You can also try autocompletion by typing
  // Just start typing and press Ctrl+Space
  const result = a + b;
  return result;
}

// Try selecting this text to see matching highlights
console.log(greet("World"));
console.log(calculateSum(5, 10));
`;

// Create the editor state with compartments
const state = EditorState.create({
  doc: initialCode,
  extensions: [
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
    syntaxHighlighting(defaultHighlightStyle),
    bracketMatching(),
    closeBrackets(),
    
    // Autocompletion (toggled via compartment)
    autocompleteCompartment.of(autocompletion()),
    jsDocCompletions,
    javaCompletions,
    pythonCompletions,
    cppCompletions,
    
    // Line highlighting
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    
    // Compartments for dynamic configuration
    languageCompartment.of(javascript()),
    tabSizeCompartment.of(EditorState.tabSize.of(2)),
    themeCompartment.of(lightTheme),
    readOnlyCompartment.of(EditorState.readOnly.of(false)),
    
    // Private compartments for toggling features
    ...toggleLineWrapping("Alt-w", false),
    ...toggleHighlightActiveLine("Alt-h", true),
    ...toggleYellowBackground("Mod-o", false),
    
    // Automatic language detection
    createAutoLanguageExtension(languageCompartment),

    // Cursor position tooltip
    ...cursorTooltip(),
    
    // Keymaps for various features
    keymap.of([
      // Custom TAB handler: accept completion if active, else insert spaces/indent
      {
        key: "Tab",
        run: (view) => {
          // Accept autocomplete if active
          if (acceptCompletion(view)) return true;
          const tabSize = view.state.facet(EditorState.tabSize) || 2;
          const tabString = " ".repeat(tabSize);
          const {state} = view;
          let changes = state.changeByRange(range => {
            if (!range.empty) {
              // If selection, indent selection
              return indentWithTab(view, range) ? {range, changes: []} : {range, changes: []};
            } else {
              // Insert spaces at cursor
              return {
                changes: {from: range.from, to: range.to, insert: tabString},
                range: EditorSelection.cursor(range.from + tabString.length)
              };
            }
          });
          view.dispatch(changes, {userEvent: "input"});
          return true;
        },
        shift: indentWithTab
      },
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap
    ])
  ]
});

// Create the editor view
const editorContainer = document.getElementById('editor-container');
if (!editorContainer) {
  console.error('[CodeMirrorTest] #editor-container not found!');
  // Show a visible error on the page
  const errorDiv = document.createElement('div');
  errorDiv.style.color = 'red';
  errorDiv.style.fontWeight = 'bold';
  errorDiv.textContent = '[CodeMirrorTest] Error: #editor-container not found!';
  document.body.prepend(errorDiv);
} else {
  let editor = new EditorView({
    state,
    parent: editorContainer
  });
  // Attach editor to window for debugging
  window.editor = editor;
}

// Functions to dynamically change editor configuration
function setLanguage(language) {
  const code = editor.state.doc.toString();
  const outputArea = document.getElementById('output-area');

  switch(language) {
    case 'javascript':
      editor.dispatch({ effects: languageCompartment.reconfigure(javascript()) });
      break;
    case 'python':
      editor.dispatch({ effects: languageCompartment.reconfigure(python()) });
      break;
    case 'html':
      editor.dispatch({ effects: languageCompartment.reconfigure(html()) });
      break;
    case 'java':
      editor.dispatch({ effects: languageCompartment.reconfigure(java()) });
      break;
    case 'cpp':
      editor.dispatch({ effects: languageCompartment.reconfigure(cpp()) });
      break;
  }
}

function setTabSize(size) {
  editor.dispatch({
    effects: tabSizeCompartment.reconfigure(EditorState.tabSize.of(size))
  });
}
// Autocomplete toggle
function setAutocompleteEnabled(enabled) {
  editor.dispatch({
    effects: autocompleteCompartment.reconfigure(enabled ? autocompletion() : [])
  });
}
window.setAutocompleteEnabled = setAutocompleteEnabled;
// Ensure global is updated for dropdown
window.setTabSize = setTabSize;

function setTheme(theme) {
  editor.dispatch({
    effects: themeCompartment.reconfigure(theme === 'dark' ? darkTheme : lightTheme)
  });
}

function setReadOnly(readOnly) {
  editor.dispatch({
    effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly))
  });
}

// Function to get editor content
function getEditorContent() {
  return editor.state.doc.toString();
}

// Always define global functions, even if editor is not initialized
if (typeof window.getEditorContent !== 'function') {
  window.getEditorContent = () => '[CodeMirrorTest] Editor not initialized.';
}
if (typeof window.setLanguage !== 'function') {
  window.setLanguage = () => {};
}
if (typeof window.setTabSize !== 'function') {
  window.setTabSize = () => {};
}
if (typeof window.setTheme !== 'function') {
  window.setTheme = () => {};
}
if (typeof window.setReadOnly !== 'function') {
  window.setReadOnly = () => {};
}

// If editor initialized, override with real implementations
if (typeof editor !== 'undefined') {
  window.getEditorContent = getEditorContent;
  window.setLanguage = setLanguage;
  window.setTabSize = setTabSize;
  window.setTheme = setTheme;
  window.setReadOnly = setReadOnly;
}