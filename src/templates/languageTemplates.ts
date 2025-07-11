// Default templates for new projects

export const languageTemplates: Record<string, { filename: string, content: string }[]> = {
  'java': [
    {
      filename: 'Main.java',
      content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`
    }
  ],
  'python': [
    {
      filename: 'main.py',
      content: `def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()`
    }
  ],
  'javascript': [
    {
      filename: 'index.js',
      content: `// Welcome to your new JavaScript project!
console.log('Hello, World!');

// Start coding here...`
    }
  ],
  'c': [
    {
      filename: 'main.c',
      content: `#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}`
    }
  ],
  'c++': [
    {
      filename: 'main.cpp',
      content: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`
    }
  ],
  'markdown': [
    {
      filename: 'README.md',
      content: '# README\n\nAdd your documentation here.'
    }
  ],
  'txt': [
    {
      filename: 'README.txt',
      content: 'Add your documentation here.'
    }
  ]
};

export interface TemplateFile {
  filename: string;
  content: string;
}

// Map file extensions to language keys
const extensionToLanguage: Record<string, string> = {
  'java': 'java',
  'py': 'python',
  'js': 'javascript',
  'c': 'c',
  'cpp': 'c++',
  'cs': 'c#',
  'txt': 'txt',
  'md': 'markdown',
};

export const getTemplateForLanguage = (language: string): TemplateFile[] => {
  if (!language) return [];
  const lang = language.toLowerCase();
  const mappedLang = extensionToLanguage[lang] || lang;
  return languageTemplates[mappedLang] || [];
};
