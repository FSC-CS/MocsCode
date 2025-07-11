/**
 * Utility functions for generating language-specific compile and run scripts
 */

interface ScriptTemplates {
  compile: string;
  run: string;
}

/**
 * Get default compile and run scripts based on programming language
 * @param language The programming language identifier
 * @returns Object with compile and run script templates
 */
export function getLanguageScripts(language: string | undefined): ScriptTemplates {
  // Default to empty compile script and generic run script
  const defaultTemplates: ScriptTemplates = {
    compile: '',
    run: 'echo "Please add a custom run and/or compile script"'
  };

  if (!language) return defaultTemplates;
  
  // Normalize the language string
  const normalizedLang = language.toLowerCase().trim();
  
  switch (normalizedLang) {
    case 'java':
      return {
        compile: 'javac src/Main.java',
        run: 'java src/Main.java'
      };
    
    case 'python':
    case 'py':
      return {
        compile: '', // Python doesn't need compilation
        run: 'python main.py'
      };
    
    case 'javascript':
    case 'js':
      return {
        compile: '', // JavaScript doesn't need compilation
        run: 'node index.js'
      };
    
    case 'typescript':
    case 'ts':
      return {
        compile: 'tsc index.ts',
        run: 'node index.js'
      };
    
    case 'c++':
    case 'cpp':
      return {
        compile: 'g++ -std=c++17 main.cpp -o program',
        run: './program'
      };
    
    case 'c':
      return {
        compile: 'gcc main.c -o program',
        run: './program'
      };
    
    case 'go':
      return {
        compile: 'go build -o program',
        run: './program'
      };
    
    case 'rust':
      return {
        compile: 'rustc main.rs -o program',
        run: './program'
      };
    
    case 'php':
      return {
        compile: '',
        run: 'php index.php'
      };
    
    case 'ruby':
    case 'rb':
      return {
        compile: '',
        run: 'ruby main.rb'
      };

    case 'csharp':
    case 'c#':
    case 'cs':
      return {
        compile: 'dotnet build',
        run: 'dotnet run'
      };

    default:
      return defaultTemplates;
  }
}
