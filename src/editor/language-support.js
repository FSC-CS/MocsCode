// language-support.js - Language extensions and autocomplete
import { syntaxTree } from "@codemirror/language"
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript"
import { python, pythonLanguage } from "@codemirror/lang-python"
import { html, htmlLanguage } from "@codemirror/lang-html"
import { java, javaLanguage } from "@codemirror/lang-java"
import { cpp, cppLanguage } from "@codemirror/lang-cpp"

// HTML Tag Autocomplete
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

// Python Keyword Autocomplete
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

const pythonCompletions = pythonLanguage.data.of({
  autocomplete: context => {
    let word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: pythonKeywords,
      validFor: /^\w*$/
    };
  }
});

// C++ Keyword Autocomplete
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

const cppCompletions = cppLanguage.data.of({
  autocomplete: context => {
    let word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: cppKeywords,
      validFor: /^\w*$/
    };
  }
});

// Java Keyword Autocomplete
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

const javaCompletions = javaLanguage.data.of({
  autocomplete: context => {
    let word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: javaKeywords,
      validFor: /^\w*$/
    };
  }
});

// JSDoc Autocomplete
const tagOptions = [
  "constructor", "deprecated", "link", "param", "returns", "type"
].map(tag => ({label: "@" + tag, type: "keyword"}))

const jsDocCompletions = javascriptLanguage.data.of({
  autocomplete: context => {
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
});

// Language configuration mapping
export const languageConfigs = {
  javascript: {
    extension: javascript(),
    completions: [jsDocCompletions]
  },
  python: {
    extension: python(),
    completions: [pythonCompletions]
  },
  html: {
    extension: html(),
    completions: [htmlCompletions]
  },
  java: {
    extension: java(),
    completions: [javaCompletions]
  },
  cpp: {
    extension: cpp(),
    completions: [cppCompletions]
  }
};

// Get language extension with completions
export function getLanguageExtension(language) {
  const config = languageConfigs[language] || languageConfigs.javascript;
  return [config.extension, ...config.completions];
}