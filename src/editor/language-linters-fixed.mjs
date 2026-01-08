import { linter } from '@codemirror/lint';
import { Decoration, EditorView } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

// Custom lint marker styling with more transparent colors
const lintMarkTheme = EditorView.theme({
  '.cm-lintRange': {
    backgroundSize: '1em 0.2em',
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'left bottom',
    paddingBottom: '0.2em',
    position: 'relative',
    opacity: '0.7',
  },
  '.cm-lintRange-error': {
    backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%226%22%20height%3D%223%22%3E%3Cpath%20fill%3D%22%23fca5a5%22%20d%3D%22M0%201.5L1.5%200l1.5%201.5L4.5%200%206%201.5%204.5%203%203%201.5%201.5%203%200%201.5z%22%2F%3E%3C%2Fsvg%3E")',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%226%22%20height%3D%223%22%3E%3Cpath%20fill%3D%22%23fcd34d%22%20d%3D%22M0%201.5L1.5%200l1.5%201.5L4.5%200%206%201.5%204.5%203%203%201.5%201.5%203%200%201.5z%22%2F%3E%3C%2Fsvg%3E")',
  },
  '.cm-lintRange-info': {
    backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%226%22%20height%3D%223%22%3E%3Cpath%20fill%3D%2293c5fd%22%20d%3D%22M0%201.5L1.5%200l1.5%201.5L4.5%200%206%201.5%204.5%203%203%201.5%201.5%203%200%201.5z%22%2F%3E%3C%2Fsvg%3E")',
  },
  '.cm-lintPoint': {
    position: 'relative',
  },
  '.cm-lintPoint::after': {
    position: 'absolute',
    content: '""',
    left: '0',
    top: '0',
    bottom: '0',
    width: '2px',
    marginLeft: '-1px',
    opacity: '0.5',
  },
  '.cm-lintPoint-error::after': {
    backgroundColor: '#fca5a5',
  },
  '.cm-lintPoint-warning::after': {
    backgroundColor: '#fcd34d',
  },
  '.cm-lintPoint-info::after': {
    backgroundColor: '#93c5fd',
  },
  '.cm-tooltip-lint': {
    backgroundColor: '#1e1e1e',
    border: '1px solid #333',
    color: '#f0f0f0',
    fontFamily: 'inherit',
    maxWidth: '40em',
    padding: '0.5em',
    borderRadius: '0.25rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
});

// Create workers for each language
const workers = new Map();
const callbacks = new Map();
let requestId = 0;
const TIMEOUT_MS = 10000; // 10 second timeout

// Language-specific linting rules
const lintRules = {
  python: {
    name: 'python-linter',
    rules: [
      {
        pattern: /^\s*if\s+.*[^:]\s*$/,
        message: 'Missing colon after if statement',
        severity: 'error'
      },
      {
        pattern: /\b(undefined_var_example)\b/g,
        message: 'Potentially undefined variable: $1',
        severity: 'warning'
      },
      {
        pattern: /^\s*\t/,
        message: 'Use spaces instead of tabs for indentation',
        severity: 'warning'
      }
    ]
  },
  java: {
    name: 'java-linter',
    rules: [
      {
        pattern: /^\s*(\w+\s+)*\w+\s*=.*[^;{]\s*$/,
        exclude: [/\/\//, /\b(if|for|while)\b/],
        message: 'Missing semicolon',
        severity: 'error'
      },
      {
        pattern: /class\s+([a-z][a-zA-Z0-9_]*)/,
        message: 'Class names should start with uppercase letter',
        severity: 'warning'
      },
      {
        pattern: /^\s*(if|for|while)\s*\([^)]*\)\s*[^{].*[^{]\s*$/,
        exclude: [/;/],
        message: 'Consider using braces for single-line statements',
        severity: 'warning'
      }
    ]
  },
  cpp: {
    name: 'cpp-linter',
    rules: [
      {
        pattern: /^\s*\w+.*[^;{}]\s*$/,
        exclude: [/\/\//, /#/, /\b(if|for|while|namespace|class|struct)\b/],
        message: 'Missing semicolon',
        severity: 'error'
      },
      {
        test: (line, code) => line.includes('cout') && !code.includes('#include <iostream>'),
        message: 'Missing #include <iostream>',
        severity: 'error',
        highlight: 'cout'
      },
      {
        test: (line, code) => line.includes('cout') && !code.includes('using namespace std') && !line.includes('std::'),
        message: 'Use std::cout or add "using namespace std"',
        severity: 'warning',
        highlight: 'cout'
      }
    ]
  }
};

// Serialize regex patterns and functions for the worker
function serializeRules(rules) {
  return JSON.parse(JSON.stringify(rules, (key, value) => {
    if (value instanceof RegExp) {
      return {
        __regex: true,
        source: value.source,
        flags: value.flags
      };
    }
    if (typeof value === 'function') {
      return {
        __function: true,
        body: value.toString()
      };
    }
    if (Array.isArray(value)) {
      return value.map(item => 
        item instanceof RegExp || typeof item === 'function' 
          ? serializeRules({ item }).item 
          : item
      );
    }
    return value;
  }));
}

// Create a worker for linting
function createLintWorker() {
  const serializedRules = serializeRules(lintRules);
  
  const workerCode = `
    // Deserialize regex patterns and functions
    function deserializeRules(rules) {
      return JSON.parse(JSON.stringify(rules), (key, value) => {
        if (value && value.__regex) {
          return new RegExp(value.source, value.flags);
        }
        if (value && value.__function) {
          return new Function('return ' + value.body)();
        }
        return value;
      });
    }
    
    const lintRules = deserializeRules(${JSON.stringify(serializedRules)});
    
    function runLinter(code, language) {
      const rules = lintRules[language];
      if (!rules || !rules.rules) return [];
      
      const diagnostics = [];
      const lines = code.split('\\n');
      
      lines.forEach((line, index) => {
        rules.rules.forEach(rule => {
          try {
            // Handle exclude patterns
            if (rule.exclude && rule.exclude.some(ex => {
              try {
                return ex.test(line);
              } catch (e) {
                console.warn('Error in exclude pattern:', e);
                return false;
              }
            })) {
              return;
            }
            
            // Handle pattern matching
            if (rule.pattern) {
              // Create a regex with the 'g' flag to find all matches
              const regex = new RegExp(rule.pattern, 'g' + (rule.pattern.ignoreCase ? 'i' : ''));
              let match;
              let lastIndex = 0;
              
              // Reset lastIndex in case the regex is reused
              regex.lastIndex = 0;
              
              // Reset lastIndex for global regex
              regex.lastIndex = 0;
              
              while ((match = regex.exec(line)) !== null) {
                // If we're stuck in an infinite loop, break out
                if (match.index === regex.lastIndex) {
                  regex.lastIndex++;
                }
                
                const message = rule.message.replace(/\$(\d+)/g, (_, n) => match[parseInt(n, 10)] || '');
                const highlight = rule.highlight || match[0];
                const matchStart = match.index;
                const matchEnd = match.index + (match[0] ? match[0].length : 0);
                
                // Add the match with exact positions
                diagnostics.push({
                  line: index,
                  from: matchStart,
                  to: matchEnd,
                  message: message,
                  severity: rule.severity || 'error',
                  source: rules.name
                });
                
                // If we're not using global flag, break after first match
                if (!regex.global) break;
                
                if (!regex.global) break;
              }
            } 
            // Handle test functions
            else if (typeof rule.test === 'function') {
              try {
                const testResult = rule.test(line, code, index);
                if (testResult) {
                  let highlight = rule.highlight;
                  let from = 0;
                  let to = line.length;
                  
                  // If test returns an object with position information, use that
                  if (testResult && typeof testResult === 'object') {
                    if (testResult.pos !== undefined || testResult.start !== undefined) {
                      from = testResult.pos ?? testResult.start ?? 0;
                      to = testResult.end ?? (from + (highlight?.length || 1));
                      highlight = highlight || line.slice(from, to);
                    } else if (!highlight) {
                      // If no highlight text is provided, use the whole line
                      from = 0;
                      to = line.length;
                      highlight = line.trim();
                    }
                  }
                  
                  // If we have highlight text but no specific positions, find it in the line
                  if (highlight && from === 0 && to === line.length) {
                    const start = line.indexOf(highlight);
                    if (start >= 0) {
                      from = start;
                      to = start + highlight.length;
                    }
                  }
                  
                  // Ensure we don't have invalid ranges
                  from = Math.max(0, Math.min(from, line.length));
                  to = Math.max(from, Math.min(to, line.length));
                  
                  // Only add if we have a valid range
                  if (from < to) {
                    diagnostics.push({
                      line: index,
                      from: from,
                      to: to,
                      message: rule.message,
                      severity: rule.severity || 'error',
                      source: rules.name
                    });
                  }
                }
              } catch (e) {
                console.warn('Error in test function:', e);
              }
            }
          } catch (e) {
            console.warn('Error processing lint rule:', e);
          }
        });
      });
      
      return diagnostics;
    }
    
    self.onmessage = function(e) {
      const { id, language, code } = e.data;
      try {
        const diagnostics = runLinter(code, language);
        self.postMessage({ id, diagnostics });
      } catch (error) {
        self.postMessage({ id, error: error.message });
      }
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

// Get or create a worker for a specific language
function getOrCreateWorker(language) {
  if (!workers.has(language)) {
    const worker = createLintWorker();
    
    worker.onmessage = (e) => {
      const { id, diagnostics, error } = e.data;
      const callback = callbacks.get(id);
      if (callback) {
        callback(error || null, diagnostics);
        callbacks.delete(id);
      }
    };
    
    worker.onerror = (error) => {
      console.error(`Worker error for ${language}:`, error);
      // Clean up callbacks for this worker's language
      callbacks.forEach((_, callbackId) => {
        const [callbackLanguage] = callbackId.split('_');
        if (callbackLanguage === language) {
          callbacks.get(callbackId)(`Worker error for ${language}`, []);
          callbacks.delete(callbackId);
        }
      });
    };
    
    workers.set(language, worker);
  }
  
  return workers.get(language);
}

// Base linter function that uses a language-specific worker
function createWorkerLinter(language) {
  const lintExtension = linter(async (view) => {
    const code = view.state.doc.toString();
    const id = `${language}_${requestId++}`;
    
    return new Promise((resolve) => {
      const worker = getOrCreateWorker(language);
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (callbacks.has(id)) {
          callbacks.delete(id);
          console.warn(`Linting timeout for ${language}`);
          resolve([]);
        }
      }, TIMEOUT_MS);
      
      callbacks.set(id, (error, diagnostics) => {
        clearTimeout(timeoutId);
        
        if (error) {
          console.error(`Linting error for ${language}:`, error);
          resolve([]);
          return;
        }
        
        // Convert worker diagnostics to CodeMirror format
        const converted = (diagnostics || []).map(diag => {
          try {
            // Get the line from the document (1-based to 0-based line number)
            const lineNumber = Math.max(0, diag.line);
            const lineObj = view.state.doc.line(lineNumber + 1);
            
            // Calculate the absolute positions in the document
            const lineStart = lineObj.from;
            const lineEnd = lineObj.to;
            const lineText = lineObj.text;
            
            // Calculate the relative positions within the line
            const fromInLine = Math.max(0, Math.min(diag.from || 0, lineText.length));
            let toInLine = Math.min(diag.to || lineText.length, lineText.length);
            
            // If no explicit range is provided, highlight the whole line
            if (fromInLine === 0 && toInLine === 0) {
              toInLine = lineText.length;
            }
            
            // Ensure we have a valid range (at least one character)
            if (toInLine <= fromInLine) {
              // For zero-width ranges, highlight the character at the cursor position
              toInLine = Math.min(fromInLine + 1, lineText.length);
            }
            
            // Convert to absolute positions in the document
            let from = lineStart + fromInLine;
            let to = lineStart + toInLine;
            
            // Ensure the range is valid and within the line bounds
            if (from < lineStart) {
              from = lineStart;
            }
            if (to > lineEnd) {
              to = lineEnd;
            }
            // Ensure the range is at least one character long
            if (from >= to) {
              to = Math.min(from + 1, lineEnd);
            }
            
            // If we still have an invalid range, log a warning and skip
            if (from >= to || from < lineStart || to > lineEnd) {
              console.warn('Invalid diagnostic range after adjustment:', { 
                from, 
                to, 
                lineStart, 
                lineEnd, 
                lineNumber,
                lineTextLength: lineText.length,
                diag 
              });
              return null;
            }
            
            return {
              from,
              to,
              severity: diag.severity || 'error',
              message: diag.message || 'Unknown error',
              source: diag.source || `${language}-linter`,
              // Add line and character information for better tooltips
              line: diag.line,
              fromLine: diag.line,
              toLine: diag.line,
              fromCharacter: fromInLine,
              toCharacter: toInLine
            };
          } catch (e) {
            console.warn('Error converting diagnostic:', e, diag);
            return null;
          }
        }).filter(Boolean);
        
        resolve(converted);
      });
      
      worker.postMessage({ id, language, code });
    });
  });
  
  return [lintMarkTheme, lintExtension];
}

// Language-specific linters
export function createJavaLinter() {
  return createWorkerLinter('java');
}

export function createPythonLinter() {
  return createWorkerLinter('python');
}

export function createCppLinter() {
  return createWorkerLinter('cpp');
}

// Enhanced language linters map
const languageLinters = {
  'java': createJavaLinter,
  'python': createPythonLinter,
  'cpp': createCppLinter,
  'c++': createCppLinter,
  'c': createCppLinter,
  'javascript': null,
  'typescript': null,
  'jsx': null,
  'tsx': null
};

// Get the appropriate linter for a language
export function getLinterForLanguage(language) {
  const lang = language.toLowerCase();
  const linterFactory = languageLinters[lang];
  
  if (!linterFactory) {
    console.warn('No linter available for language: ' + language);
    return [];
  }
  
  try {
    return [linterFactory()];
  } catch (error) {
    console.error('Failed to initialize linter for ' + language + ':', error);
    return [];
  }
}

// Clean up all workers when done
export function cleanup() {
  // Terminate all workers
  workers.forEach(worker => worker.terminate());
  workers.clear();
  
  // Clear all callbacks
  callbacks.clear();
  
  // Reset request ID
  requestId = 0;
}
