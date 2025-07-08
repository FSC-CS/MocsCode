import { linter } from '@codemirror/lint';

// JSHint configuration
const jshintConfig = {
  // Environment
  browser: true,       // Browser globals (window, document, etc.)
  node: false,         // Not using Node.js
  esversion: 6,        // ES6 features
  jquery: false,       // Not using jQuery
  
  // Relaxing options
  devel: true,         // Allow console.log, etc.
  strict: false,       // Don't require "use strict"
  undef: true,         // Warn on use of undefined variables
  unused: 'vars',      // Warn about unused variables
  
  // Suppress specific warnings
  '-W031': true,       // Suppress warnings about using `new` for side effects
  '-W064': true,       // Suppress warnings about using [] when not a function
  
  // Maximum number of errors to report
  maxerr: 50,
  
  // Global variables that are always defined
  globals: {
    // Browser globals
    window: false,     // Read-only
    document: false,   // Read-only
    console: false,    // Read-only
    
    // CommonJS/Node.js globals (set to false to indicate they're not available)
    require: false,
    module: false,
    exports: false,
    __dirname: false,
    __filename: false,
    
    // Testing globals (if needed)
    describe: false,
    it: false,
    expect: false,
    before: false,
    after: false,
    beforeEach: false,
    afterEach: false
  }
};

let jshintLoaded = false;
let jshintPromise = null;

// Function to load JSHint from CDN
function loadJSHint() {
  if (jshintPromise) {
    return jshintPromise;
  }

  jshintPromise = new Promise((resolve, reject) => {
    if (typeof window.JSHINT !== 'undefined') {
      jshintLoaded = true;
      resolve();
      return;
    }

    // Remove integrity check to avoid hash mismatch issues
    const script = document.createElement('script');
    script.id = 'jshint-script';
    script.src = 'https://cdn.jsdelivr.net/npm/jshint@2.13.6/dist/jshint.min.js';
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      if (typeof window.JSHINT !== 'undefined') {
        jshintLoaded = true;
        console.log('JSHint loaded successfully');
        resolve();
      } else {
        console.error('JSHint loaded but JSHINT not available');
        tryFallback();
      }
    };
    
    script.onerror = (error) => {
      console.error('Failed to load JSHint from jsdelivr:', error);
      tryFallback();
    };

    function tryFallback() {
      // Remove the failed script
      script.remove();
      
      // Try fallback CDN
      const fallbackScript = document.createElement('script');
      fallbackScript.id = 'jshint-fallback-script';
      fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jshint/2.13.6/jshint.min.js';
      fallbackScript.crossOrigin = 'anonymous';
      
      fallbackScript.onload = () => {
        if (typeof window.JSHINT !== 'undefined') {
          jshintLoaded = true;
          console.log('JSHint loaded from fallback CDN');
          resolve();
        } else {
          console.error('JSHint fallback loaded but JSHINT not available');
          reject(new Error('JSHint not available after loading'));
        }
      };
      
      fallbackScript.onerror = (fallbackError) => {
        console.error('Failed to load JSHint from fallback CDN:', fallbackError);
        reject(new Error('Failed to load JSHint from any CDN'));
      };
      
      document.head.appendChild(fallbackScript);
    }

    document.head.appendChild(script);
  });

  return jshintPromise;
}

// Create a linter function that works with CodeMirror
export const createJSHintLinter = () => {
  return linter(async (view) => {
    try {
      if (!jshintLoaded) {
        await loadJSHint();
        if (!jshintLoaded) {
          console.warn('JSHint not available');
          return [];
        }
      }

      const code = view.state.doc.toString();
      
      // Run JSHint
      const success = window.JSHINT(code, jshintConfig);
      
      if (!window.JSHINT.errors || window.JSHINT.errors.length === 0) {
        return [];
      }
      
      return window.JSHINT.errors
        .filter(error => error && error.line && error.line > 0)
        .map(error => {
          try {
            const line = view.state.doc.line(error.line);
            const character = Math.max(0, (error.character || 1) - 1);
            const from = line.from + Math.min(character, line.length);
            const to = Math.min(from + (error.length || 1), line.to);
            
            return {
              from,
              to,
              severity: error.code && error.code.startsWith('W') ? 'warning' : 'error',
              message: error.reason || 'Unknown error',
              source: 'jshint',
            };
          } catch (e) {
            console.warn('Error processing JSHint error:', e, error);
            return null;
          }
        })
        .filter(Boolean); // Remove any null entries
    } catch (error) {
      console.error('Linting error:', error);
      return [];
    }
  });
};