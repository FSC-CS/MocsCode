import { linter } from '@codemirror/lint';

// Create worker for linting
let worker;
let requestId = 0;
const callbacks = new Map();
const TIMEOUT_MS = 10000; // 10 second timeout

function getWorker() {
  if (!worker) {
    // Create worker inline to avoid missing file issues
    const workerCode = '(function() {' +
      '"use strict";' +
      'const linters = {' +
      '  python: function(code) {' +
      '    const diagnostics = [];' +
      '    const lines = code.split("\\n");' +
      '    lines.forEach(function(line, index) {' +
      '      const lineNumber = index + 1;' +
      '      const trimmedLine = line.trim();' +
      '      if (trimmedLine.match(/^\\s*if\\s+.*[^:]\\s*$/)) {' +
      '        diagnostics.push({' +
      '          from: index * (line.length + 1),' +
      '          to: index * (line.length + 1) + line.length,' +
      '          severity: \'error\',' +
      '          message: \'Missing colon after if statement\',' +
      '          source: \'python-linter\'' +
      '        });' +
      '      }' +
      '      const undefinedVars = trimmedLine.match(/\\b([a-zA-Z_][a-zA-Z0-9_]*)\\b/g);' +
      '      if (undefinedVars) {' +
      '        undefinedVars.forEach(function(varName) {' +
      '          if (varName === \'undefined_var_example\') {' +
      '            diagnostics.push({' +
      '              from: index * (line.length + 1) + line.indexOf(varName),' +
      '              to: index * (line.length + 1) + line.indexOf(varName) + varName.length,' +
      '              severity: \'warning\',' +
      '              message: \'Potentially undefined variable: \' + varName,' +
      '              source: \'python-linter\'' +
      '            });' +
      '          }' +
      '        });' +
      '      }' +
      '      if (trimmedLine.length > 0 && line.match(/^\\s*\\t/)) {' +
      '        const firstNonTab = line.search(/[^\\t]/);' +
      '        diagnostics.push({' +
      '          from: index * (line.length + 1),' +
      '          to: firstNonTab > 0 ? index * (line.length + 1) + firstNonTab : index * (line.length + 1) + line.length,' +
      '          severity: \'warning\',' +
      '          message: \'Use spaces instead of tabs for indentation\',' +
      '          source: \'python-linter\'' +
      '        });' +
      '      }' +
      '    });' +
      '    return diagnostics;' +
      '  },' +
      '  java: function(code) {' +
      '    const diagnostics = [];' +
      '    const lines = code.split("\\n");' +
      '    lines.forEach(function(line, index) {' +
      '      const lineNumber = index + 1;' +
      '      const trimmedLine = line.trim();' +
      '      if (trimmedLine.match(/^\\s*(\\w+\\s+)*\\w+\\s*=.*[^;{]\\s*$/) && ' +
      '          !trimmedLine.includes("//") && ' +
      '          !trimmedLine.includes("if") && ' +
      '          !trimmedLine.includes("for") && ' +
      '          !trimmedLine.includes("while")) {' +
      '        diagnostics.push({' +
      '          from: index * (line.length + 1),' +
      '          to: index * (line.length + 1) + line.length,' +
      '          severity: \'error\',' +
      '          message: \'Missing semicolon\',' +
      '          source: \'java-linter\'' +
      '        });' +
      '      }' +
      '      const classMatch = trimmedLine.match(/class\\s+([a-z][a-zA-Z0-9_]*)/);' +
      '      if (classMatch) {' +
      '        diagnostics.push({' +
      '          from: index * (line.length + 1) + line.indexOf(classMatch[1]),' +
      '          to: index * (line.length + 1) + line.indexOf(classMatch[1]) + classMatch[1].length,' +
      '          severity: \'warning\',' +
      '          message: \'Class names should start with uppercase letter\',' +
      '          source: \'java-linter\'' +
      '        });' +
      '      }' +
      '      if (trimmedLine.match(/^\\s*(if|for|while)\\s*\\([^)]*\\)\\s*[^{].*[^{]\\s*$/) && ' +
      '          !trimmedLine.includes(";")) {' +
      '        diagnostics.push({' +
      '          from: index * (line.length + 1),' +
      '          to: index * (line.length + 1) + line.length,' +
      '          severity: \'warning\',' +
      '          message: \'Consider using braces for single-line statements\',' +
      '          source: \'java-linter\'' +
      '        });' +
      '      }' +
      '    });' +
      '    return diagnostics;' +
      '  },' +
      '  cpp: function(code) {' +
      '    const diagnostics = [];' +
      '    const lines = code.split("\\n");' +
      '    lines.forEach(function(line, index) {' +
      '      const lineNumber = index + 1;' +
      '      const trimmedLine = line.trim();' +
      '      if (trimmedLine.match(/^\\s*\\w+.*[^;{}]\\s*$/) && ' +
      '          !trimmedLine.includes("//") && ' +
      '          !trimmedLine.includes("#") &&' +
      '          !trimmedLine.includes("if") && ' +
      '          !trimmedLine.includes("for") && ' +
      '          !trimmedLine.includes("while") &&' +
      '          !trimmedLine.includes("namespace") &&' +
      '          !trimmedLine.includes("class") &&' +
      '          !trimmedLine.includes("struct")) {' +
      '        diagnostics.push({' +
      '          from: index * (line.length + 1),' +
      '          to: index * (line.length + 1) + line.length,' +
      '          severity: \'error\',' +
      '          message: \'Missing semicolon\',' +
      '          source: \'cpp-linter\'' +
      '        });' +
      '      }' +
      '      if (trimmedLine.includes("cout") && !code.includes("#include <iostream>")) {' +
      '        diagnostics.push({' +
      '          from: index * (line.length + 1) + line.indexOf("cout"),' +
      '          to: index * (line.length + 1) + line.indexOf("cout") + 4,' +
      '          severity: \'error\',' +
      '          message: \'Missing #include <iostream>\',' +
      '          source: \'cpp-linter\'' +
      '        });' +
      '      }' +
      '      if (trimmedLine.includes("cout") && !code.includes("using namespace std") && !trimmedLine.includes("std::")) {' +
      '        diagnostics.push({' +
      '          from: index * (line.length + 1) + line.indexOf("cout"),' +
      '          to: index * (line.length + 1) + line.indexOf("cout") + 4,' +
      '          severity: \'warning\',' +
      '          message: \'Use std::cout or add "using namespace std"\',' +
      '          source: \'cpp-linter\'' +
      '        });' +
      '      }' +
      '    });' +
      '    return diagnostics;' +
      '  }' +
      '};' +
      'self.onmessage = function(e) {' +
      '  const { id, language, code } = e.data;' +
      '  try {' +
      '    const linter = linters[language];' +
      '    if (!linter) {' +
      '      self.postMessage({' +
      '        id: id,' +
      '        error: \'No linter available for language: \' + language' +
      '      });' +
      '      return;' +
      '    }' +
      '    const diagnostics = linter(code);' +
      '    self.postMessage({' +
      '      id: id,' +
      '      diagnostics: diagnostics' +
      '    });' +
      '  } catch (error) {' +
      '    self.postMessage({' +
      '      id: id,' +
      '      error: error.message' +
      '    });' +
      '  }' +
      '};' +
      '})();';
                if (varName === 'undefined_var_example') {
                  diagnostics.push({
                    from: index * (line.length + 1) + line.indexOf(varName),
                    to: index * (line.length + 1) + line.indexOf(varName) + varName.length,
                    severity: 'warning',
                    message: 'Potentially undefined variable: ' + varName,
                    source: 'python-linter'
                  });
                }
              });
            }
            
            // Check for indentation issues
            if (trimmedLine.length > 0 && line.match(/^\\s*\\t/)) {
              const firstNonTab = line.search(/[^\\t]/);
              diagnostics.push({
                from: index * (line.length + 1),
                to: firstNonTab > 0 ? index * (line.length + 1) + firstNonTab : index * (line.length + 1) + line.length,
                severity: 'warning',
                message: 'Use spaces instead of tabs for indentation',
                source: 'python-linter'
              });
            }
          });
          
          return diagnostics;
        },
        
        java: (code) => {
          const diagnostics = [];
          const lines = code.split('\\n');
          
          lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();
            
            // Check for missing semicolons
            if (trimmedLine.match(/^\\s*(\\w+\\s+)*\\w+\\s*=.*[^;{]\\s*$/) && 
                !trimmedLine.includes('//') && 
                !trimmedLine.includes('if') && 
                !trimmedLine.includes('for') && 
                !trimmedLine.includes('while')) {
              diagnostics.push({
                from: index * (line.length + 1),
                to: index * (line.length + 1) + line.length,
                severity: 'error',
                message: 'Missing semicolon',
                source: 'java-linter'
              });
            }
            
            // Check for class naming convention
            const classMatch = trimmedLine.match(/class\\s+([a-z][a-zA-Z0-9_]*)/);
            if (classMatch) {
              diagnostics.push({
                from: index * (line.length + 1) + line.indexOf(classMatch[1]),
                to: index * (line.length + 1) + line.indexOf(classMatch[1]) + classMatch[1].length,
                severity: 'warning',
                message: 'Class names should start with uppercase letter',
                source: 'java-linter'
              });
            }
            
            // Check for missing braces
            if (trimmedLine.match(/^\\s*(if|for|while)\\s*\\([^)]*\\)\\s*[^{].*[^{]\\s*$/) && 
                !trimmedLine.includes(';')) {
              diagnostics.push({
                from: index * (line.length + 1),
                to: index * (line.length + 1) + line.length,
                severity: 'warning',
                message: 'Consider using braces for single-line statements',
                source: 'java-linter'
              });
            }
          });
          
          return diagnostics;
        },
        
        cpp: (code) => {
          const diagnostics = [];
          const lines = code.split('\\n');
          
          lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();
            
            // Check for missing semicolons
            if (trimmedLine.match(/^\\s*\\w+.*[^;{}]\\s*$/) && 
                !trimmedLine.includes('//') && 
                !trimmedLine.includes('#') &&
                !trimmedLine.includes('if') && 
                !trimmedLine.includes('for') && 
                !trimmedLine.includes('while') &&
                !trimmedLine.includes('namespace') &&
                !trimmedLine.includes('class') &&
                !trimmedLine.includes('struct')) {
              diagnostics.push({
                from: index * (line.length + 1),
                to: index * (line.length + 1) + line.length,
                severity: 'error',
                message: 'Missing semicolon',
                source: 'cpp-linter'
              });
            }
            
            // Check for missing includes
            if (trimmedLine.includes('cout') && !code.includes('#include <iostream>')) {
              diagnostics.push({
                from: index * (line.length + 1) + line.indexOf('cout'),
                to: index * (line.length + 1) + line.indexOf('cout') + 4,
                severity: 'error',
                message: 'Missing #include <iostream>',
                source: 'cpp-linter'
              });
            }
            
            // Check for missing std namespace
            if (trimmedLine.includes('cout') && !code.includes('using namespace std') && !trimmedLine.includes('std::')) {
              diagnostics.push({
                from: index * (line.length + 1) + line.indexOf('cout'),
                to: index * (line.length + 1) + line.indexOf('cout') + 4,
                severity: 'warning',
                message: 'Use std::cout or add "using namespace std"',
                source: 'cpp-linter'
              });
            }
          });
          
          return diagnostics;
        }
      };
      
      self.onmessage = (e) => {
        const { id, language, code } = e.data;
        
        try {
          const linter = linters[language];
          if (!linter) {
            self.postMessage({
              id,
              error: 'No linter available for language: ' + language
            });
            return;
          }
          
          const diagnostics = linter(code);
          self.postMessage({
            id,
            diagnostics
          });
        } catch (error) {
          self.postMessage({
            id,
            error: error.message
          });
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = (e) => {
      const { id, diagnostics, error } = e.data;
      const callback = callbacks.get(id);
      if (callback) {
        callback(error || null, diagnostics);
        callbacks.delete(id);
      }
    };
    
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Clean up all pending callbacks
      callbacks.forEach((callback, id) => {
        callback('Worker error', []);
      });
      callbacks.clear();
    };
  }
  return worker;
}

// Base linter function that uses the worker
function createWorkerLinter(language) {
  return linter(async (view) => {
    const code = view.state.doc.toString();
    const id = requestId++;
    
    return new Promise((resolve) => {
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
        } else {
          // Convert worker diagnostics to CodeMirror format
          const converted = (diagnostics || []).map(diag => {
            try {
              // Calculate proper positions in the document
              const doc = view.state.doc;
              const lines = code.split('\n');
              let from = 0;
              let to = 0;
              
              // If we have line-based positions, convert them
              if (diag.line !== undefined) {
                const line = doc.line(diag.line);
                from = line.from + (diag.column || 0);
                to = Math.min(from + (diag.length || 1), line.to);
              } else {
                // Use direct positions if available
                from = Math.max(0, diag.from || 0);
                to = Math.min(diag.to || from + 1, doc.length);
              }
              
              return {
                from,
                to,
                severity: diag.severity || 'error',
                message: diag.message || 'Unknown error',
                source: diag.source || `${language}-linter`
              };
            } catch (e) {
              console.warn('Error converting diagnostic:', e);
              return null;
            }
          }).filter(Boolean);
          
          resolve(converted);
        }
      });
      
      try {
        getWorker().postMessage({
          id,
          language,
          code
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Failed to send message to worker for ${language}:`, error);
        resolve([]);
      }
    });
  });
}

// ... (rest of the code remains the same)
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
  'c': createCppLinter, // Use C++ linter for C
  'javascript': null,  // Using JSHint for JS
  'typescript': null,  // Using JSHint for TS
  'jsx': null,        // Using JSHint for JSX
  'tsx': null         // Using JSHint for TSX
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

// Clean up worker when done
export function cleanup() {
  if (worker) {
    worker.terminate();
    worker = null;
    callbacks.clear();
  }
}
