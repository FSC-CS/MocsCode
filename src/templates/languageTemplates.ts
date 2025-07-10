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
  'c#': [
    {
      filename: 'Program.cs',
      content: `using System;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Hello, World!");
    }
}`
    }
  ]
};

export interface TemplateFile {
  filename: string;
  content: string;
}

export const getTemplateForLanguage = (language: string): TemplateFile[] => {
  if (!language) return [];
  const lang = language.toLowerCase();
  return languageTemplates[lang] || [];
};
