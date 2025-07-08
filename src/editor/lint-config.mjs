import { linter } from "@codemirror/lint";
import { javascriptLanguage } from "@codemirror/lang-javascript";

// JavaScript/TypeScript linter using JSHint
const javascriptLinter = javascriptLanguage.data.of({
  async lint(update) {
    const { Linter } = await import('jshint');
    
    const code = update.state.doc.toString();
    const linter = new Linter();
    
    // Configure JSHint options
    const options = {
      esversion: 2021,
      browser: true,
      node: true,
      esnext: true,
    };
    
    // Add globals if needed
    const globals = {
      // Add any global variables your code uses
      console: false,
      document: false,
      window: false,
      module: false,
      require: false,
      process: false,
      __dirname: false,
    };
    
    try {
      linter.verify(code, options, globals);
      
      return linter.errors.map(error => ({
        from: error.line ? update.state.doc.line(error.line).from : 0,
        to: error.line ? update.state.doc.line(error.line).to : 0,
        severity: error.code && error.code.startsWith('W') ? 'warning' : 'error',
        message: error.reason,
        source: 'JSHint',
      }));
    } catch (e) {
      console.error('Linting error:', e);
      return [];
    }
  }
});

// Create a linter extension for a given language
export function createLinter(language) {
  if (language === 'javascript' || language === 'typescript') {
    return javascriptLinter;
  }
  
  // Return a no-op linter for unsupported languages
  return linter(() => []);
}

// Get the appropriate linter based on file extension
export function getLinterForFile(filename) {
  if (!filename) return linter(() => []);
  
  const extension = filename.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascriptLinter;
    default:
      return linter(() => []);
  }
}
