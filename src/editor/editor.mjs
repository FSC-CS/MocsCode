import { EditorState, Compartment, EditorSelection } from "@codemirror/state"

// Compartment for dynamic tab size configuration
const tabSizeCompartment = new Compartment();
const autocompleteCompartment = new Compartment();
import { 
  autocompletion, 
  completionKeymap, 
  closeBrackets,
  closeBracketsKeymap,
  acceptCompletion,
  closeCompletion
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
import {javascript, javascriptLanguage} from "@codemirror/lang-javascript"
import {python, pythonLanguage} from "@codemirror/lang-python"
import {html, htmlLanguage} from "@codemirror/lang-html"
import {java, javaLanguage} from "@codemirror/lang-java"
import {cpp, cppLanguage} from "@codemirror/lang-cpp"
import {toggleLineWrapping, toggleHighlightActiveLine, toggleYellowBackground} from "./toggle-extension.mjs"
import {createAutoLanguageExtension} from "./auto-language.mjs"
import {cursorTooltip} from "./cursor-tooltip.mjs"
import {rangeHighlighting} from "./range-highlighting.mjs"

// --- JSDoc Autocomplete for JavaScript ---
import {syntaxTree} from "@codemirror/language"

// --- React-friendly factory for CodeMirror ---
/**
 * Create a CodeMirror EditorView for React
 * @param {Object} opts
 * @param {HTMLElement} opts.parent - DOM node to mount editor in
 * @param {string} opts.doc - Initial document content
 * @param {string} opts.language - Language string (e.g. 'python', 'java', ...)
 * @param {function} opts.onChange - Callback for document changes
 */
export function createEditorView({ parent, doc, language, onChange, tabSize = 4, autocomplete = true }) {
  let langExt;
  switch (language) {
    case 'python': 
      langExt = [
        python(),
        pythonCompletions
      ];
      break;
    case 'java': 
      langExt = [
        java(),
        javaCompletions
      ];
      break;
    case 'cpp': 
      langExt = [
        cpp(),
        cppCompletions
      ];
      break;
    case 'html': 
      langExt = [
        html(),
        htmlCompletions
      ];
      break;
    case 'javascript': 
    default: 
      langExt = [
        javascript(),
        jsDocCompletions
      ];
      break;
  }

  // Configure autocomplete extension based on the parameter
  const autocompleteExt = autocomplete ? [
    autocompletion({
      activateOnTyping: true,
      defaultKeymap: true
    })
  ] : [];

  const state = EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      foldGutter(),
      ...autocompleteExt,
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      rectangularSelection(),
      crosshairCursor(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle),
      bracketMatching(),
      closeBrackets(),
      cursorTooltip(),
      toggleLineWrapping(),
      toggleHighlightActiveLine(),
      toggleYellowBackground(),
      rangeHighlighting(),
      ...langExt, // Language extensions first
      tabSizeCompartment.of(EditorState.tabSize.of(tabSize)), // Tab size compartment after language
      EditorView.updateListener.of((v) => {
        if (v.docChanged && onChange) {
          onChange(v.state.doc.toString());
        }
      }),
      EditorView.theme({
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
        ".cm-scroller": {
          overflow: "auto"
        },
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
        ".cm-python .cm-variable": { color: "#e2e8f0" },
        ".cm-python .cm-builtin": { color: "#fca5a5" },
        ".cm-javascript .cm-variable": { color: "#e2e8f0" },
        ".cm-javascript .cm-property": { color: "#93c5fd" },
        ".cm-tag": { color: "#93c5fd" },
        ".cm-attribute": { color: "#f0abfc" },
        ".cm-type": { color: "#93c5fd" },
        ".cm-class-name": { color: "#93c5fd" }
      }),
      keymap.of([
        {
          key: 'Tab',
          run: (view) => {
            if (acceptCompletion(view)) return true;
            
            const tabSize = view.state.tabSize;
            const spaces = ' '.repeat(tabSize);
            const cursorPosition = view.state.selection.main.from;
            
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
        },
        ...closeBracketsKeymap,
        ...defaultKeymap.filter(binding => binding.key !== 'Tab'),
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap
      ]),
    ]
  });
  
  const view = new EditorView({
    state,
    parent,
  });

  // Remove the problematic calls to window.setTabSize and window.setAutocompleteEnabled
  // The configuration is now handled directly in the state creation above
  
  return view;
}

// --- JavaScript Completions ---
const javascriptCompletions = javascriptLanguage.data.of({
  autocomplete: context => {
    let word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: [
        {label: "function", type: "keyword", apply: "function ${1:name}(${2:params}) {\n  ${0}\n}"},
        {label: "const", type: "keyword", apply: "const ${1:name} = ${2:value};"},
        {label: "let", type: "keyword", apply: "let ${1:name} = ${2:value};"},
        {label: "if", type: "keyword", apply: "if (${1:condition}) {\n  ${0}\n}"},
        {label: "for", type: "keyword", apply: "for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n  ${0}\n}"},
        {label: "while", type: "keyword", apply: "while (${1:condition}) {\n  ${0}\n}"},
        {label: "return", type: "keyword", apply: "return ${1:value};"},
        {label: "console.log", type: "function", apply: "console.log(${1:value});"},
        {label: "import", type: "keyword", apply: "import { ${1:module} } from '${2:module}';"},
        {label: "export", type: "keyword", apply: "export ${1:const|let|function} ${2:name};"}
      ]
    };
  }
});

// --- HTML Tag Autocomplete ---
const htmlCompletions = htmlLanguage.data.of({
  autocomplete: context => {
    let word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: [
        {label: "div", type: "tag", apply: "<div>$0</div>"},
        {label: "span", type: "tag", apply: "<span>$0</span>"},
        {label: "p", type: "tag", apply: "<p>$0</p>"},
        {label: "a", type: "tag", apply: "<a href=\"$1\">$0</a>"},
        {label: "img", type: "tag", apply: "<img src=\"$1\" alt=\"$2\">$0"},
        {label: "ul", type: "tag", apply: "<ul>\n  <li>$0</li>\n</ul>"},
        {label: "ol", type: "tag", apply: "<ol>\n  <li>$0</li>\n</ol>"},
        {label: "li", type: "tag", apply: "<li>$0</li>"},
        {label: "table", type: "tag", apply: "<table>\n  <tr><th>$1</th></tr>\n  <tr><td>$0</td></tr>\n</table>"},
        {label: "form", type: "tag", apply: "<form action=\"$1\" method=\"$2\">\n  $0\n</form>"},
        {label: "input", type: "tag", apply: "<input type=\"$1\" name=\"$2\">$0"},
        {label: "button", type: "tag", apply: "<button type=\"$1\">$0</button>"},
        {label: "select", type: "tag", apply: "<select name=\"$1\">\n  <option value=\"$2\">$0</option>\n</select>"},
        {label: "textarea", type: "tag", apply: "<textarea name=\"$1\" rows=\"4\" cols=\"50\">$0</textarea>"},
        {label: "label", type: "tag", apply: "<label for=\"$1\">$0</label>"},
        {label: "h1", type: "tag", apply: "<h1>$0</h1>"},
        {label: "h2", type: "tag", apply: "<h2>$0</h2>"},
        {label: "h3", type: "tag", apply: "<h3>$0</h3>"},
        {label: "header", type: "tag", apply: "<header>\n  $0\n</header>"},
        {label: "footer", type: "tag", apply: "<footer>\n  $0\n</footer>"},
        {label: "section", type: "tag", apply: "<section>\n  $0\n</section>"},
        {label: "article", type: "tag", apply: "<article>\n  $0\n</article>"},
        {label: "nav", type: "tag", apply: "<nav>\n  $0\n</nav>"},
        {label: "main", type: "tag", apply: "<main>\n  $0\n</main>"},
        {label: "aside", type: "tag", apply: "<aside>\n  $0\n</aside>"},
        {label: "figure", type: "tag", apply: "<figure>\n  $0\n</figure>"},
        {label: "figcaption", type: "tag", apply: "<figcaption>$0</figcaption>"},
        {label: "time", type: "tag", apply: "<time datetime=\"$1\">$0</time>"},
        {label: "mark", type: "tag", apply: "<mark>$0</mark>"}
      ]
    };
  }
});

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
    "alignas", "alignof", "and", "and_eq", "asm", "auto", "bitand", "bitor", "bool", "break", "case", "catch", "char", "char16_t", "char32_t", "class", "compl", "const", "constexpr", "const_cast", "continue", "decltype", "default", "delete", "do", "double", "dynamic_cast", "else", "enum", "export", "extern", "false", "float", "for", "friend", "goto", "if", "inline", "int", "long", "mutable", "namespace", "new", "noexcept", "not", "not_eq", "nullptr", "operator", "or", "or_eq", "private", "protected", "public", "register", "reinterpret_cast", "return", "short", "signed", "sizeof", "static", "static_assert", "static_cast", "struct", "switch", "template", "this", "thread_local", "throw", "true", "try", "typedef", "typeid", "typename", "union", "unsigned", "using", "virtual", "void", "volatile", "wchar_t", "while", "xor", "xor_eq"
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
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum", "extends", "final",
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
const themeCompartment = new Compartment()
const readOnlyCompartment = new Compartment()

// Export compartments for external use
export { autocompleteCompartment, javascriptCompletions, htmlCompletions, pythonCompletions, cppCompletions, javaCompletions, jsDocCompletions };

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
    autocompleteCompartment.of(autocompletion({
      // Use a simpler configuration without overrides
      activateOnTyping: true,
      defaultKeymap: true
    })),
    
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
          
          return true; // Indicate we handled the key
        }
      },
      {
        key: "Shift-Tab", 
        run: (view) => {
          return indentWithTab.shift(view);
        }
      },
      ...closeBracketsKeymap,
      ...defaultKeymap.filter(binding => binding.key !== 'Tab'),
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap
    ])
  ]
});

// Only run DOM-based initialization if not in a module/React context
if (typeof window !== "undefined" && document.getElementById('editor-container')) {
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

// Dynamically update tab size for a given EditorView
function updateTabSize(view, newSize) {
  view.dispatch({
    effects: tabSizeCompartment.reconfigure(EditorState.tabSize.of(newSize))
  });
}

// For legacy global usage
function setTabSize(size) {
  updateTabSize(editor, size);
}
// Autocomplete toggle
function setAutocompleteEnabled(enabled) {
  if (!editor) {
    console.error('Editor not initialized');
    return;
  }
  
  editor.dispatch({
    effects: autocompleteCompartment.reconfigure(
      enabled ? autocompletion({
        activateOnTyping: true,
        defaultKeymap: true
      }) : []
    )
  });
}

// Dynamically update tab size and autocomplete for a given EditorView
export function updateEditorSettings(view, { tabSize, autocomplete }) {
  const effects = [];
  if (typeof tabSize === 'number') {
    effects.push(tabSizeCompartment.reconfigure(EditorState.tabSize.of(tabSize)));
  }
  if (typeof autocomplete === 'boolean') {
    effects.push(autocompleteCompartment.reconfigure(
      autocomplete 
        ? autocompletion({
            activateOnTyping: true,
            defaultKeymap: true
          })
        : []
    ));
  }
  if (effects.length > 0) {
    view.dispatch({ effects });
  }
}

// Export updateTabSize for external usage
export { updateTabSize };

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