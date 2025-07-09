import { ProjectFilesApi } from './project-files';
import { ApiResponse, ProjectFile } from './types';

/**
 * Creates language-specific template files for a new project
 */
export async function createLanguageSpecificFiles(
  projectId: string,
  language: string,
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Define templates for different languages
  switch (language.toLowerCase()) {
    case 'java':
      await createJavaTemplate(projectId, projectFilesApi);
      break;
    case 'python':
      await createPythonTemplate(projectId, projectFilesApi);
      break;
    case 'javascript':
    case 'js':
      await createJavaScriptTemplate(projectId, projectFilesApi);
      break;
    case 'typescript':
    case 'ts':
      await createTypeScriptTemplate(projectId, projectFilesApi);
      break;
    case 'c++':
    case 'cpp':
      await createCppTemplate(projectId, projectFilesApi);
      break;
    case 'go':
      await createGoTemplate(projectId, projectFilesApi);
      break;
    case 'rust':
      await createRustTemplate(projectId, projectFilesApi);
      break;
    case 'c#':
    case 'csharp':
      await createCSharpTemplate(projectId, projectFilesApi);
      break;
    default:
      // Default to a simple README if language is not supported
      await createDefaultTemplate(projectId, projectFilesApi, language);
      break;
  }
}

/**
 * Creates a Java project template
 */
async function createJavaTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Create src folder
  const srcFolder = await projectFilesApi.createFile({
    project_id: projectId,
    name: 'src',
    path: '/src',
    file_type: 'directory',
    parent_id: null,
    content: '',
  });
  
  if (!srcFolder.data) return;
  
  // Create Main.java
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'Main.java',
    path: '/src/Main.java',
    file_type: 'file',
    mime_type: 'text/x-java',
    parent_id: srcFolder.data.id,
    content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  });
  
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# Java Project

A simple Java project created with MocsCode.

## Getting Started

Compile: \`javac src/Main.java\`

Run: \`java -cp src Main\``,
  });
}

/**
 * Creates a Python project template
 */
async function createPythonTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Create main.py
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'main.py',
    path: '/main.py',
    file_type: 'file',
    mime_type: 'text/x-python',
    parent_id: null,
    content: `def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`,
  });
  
  // Create requirements.txt
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'requirements.txt',
    path: '/requirements.txt',
    file_type: 'file',
    mime_type: 'text/plain',
    parent_id: null,
    content: `# Python dependencies
# Add your dependencies here
`,
  });
  
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# Python Project

A simple Python project created with MocsCode.

## Getting Started

Run: \`python main.py\`

Install dependencies: \`pip install -r requirements.txt\`
`,
  });
}

/**
 * Creates a JavaScript project template
 */
async function createJavaScriptTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Create index.js
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'index.js',
    path: '/index.js',
    file_type: 'file',
    mime_type: 'application/javascript',
    parent_id: null,
    content: `console.log("Hello, World!");

function main() {
  console.log("Welcome to MocsCode!");
}

main();
`,
  });
  
  // Create package.json
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'package.json',
    path: '/package.json',
    file_type: 'file',
    mime_type: 'application/json',
    parent_id: null,
    content: `{
  "name": "javascript-project",
  "version": "1.0.0",
  "description": "A JavaScript project created with MocsCode",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
`,
  });
  
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# JavaScript Project

A simple JavaScript project created with MocsCode.

## Getting Started

Run: \`node index.js\`

or

\`npm start\`
`,
  });
}

/**
 * Creates a TypeScript project template
 */
async function createTypeScriptTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Create src folder
  const srcFolder = await projectFilesApi.createFile({
    project_id: projectId,
    name: 'src',
    path: '/src',
    file_type: 'directory',
    parent_id: null,
    content: '',
  });
  
  if (!srcFolder.data) return;
  
  // Create index.ts
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'index.ts',
    path: '/src/index.ts',
    file_type: 'file',
    mime_type: 'application/typescript',
    parent_id: srcFolder.data.id,
    content: `interface Message {
  text: string;
  priority: number;
}

function displayMessage(message: Message): void {
  console.log(\`Message [\${message.priority}]: \${message.text}\`);
}

function main(): void {
  const greeting: Message = {
    text: "Hello, TypeScript World!",
    priority: 1
  };
  
  displayMessage(greeting);
}

main();
`,
  });
  
  // Create tsconfig.json
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'tsconfig.json',
    path: '/tsconfig.json',
    file_type: 'file',
    mime_type: 'application/json',
    parent_id: null,
    content: `{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
`,
  });
  
  // Create package.json
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'package.json',
    path: '/package.json',
    file_type: 'file',
    mime_type: 'application/json',
    parent_id: null,
    content: `{
  "name": "typescript-project",
  "version": "1.0.0",
  "description": "A TypeScript project created with MocsCode",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "tsc && node dist/index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "typescript": "^4.9.5"
  }
}
`,
  });
  
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# TypeScript Project

A TypeScript project created with MocsCode.

## Getting Started

Build: \`npm run build\`

Run: \`npm start\`
`,
  });
}

/**
 * Creates a C++ project template
 */
async function createCppTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Create src folder
  const srcFolder = await projectFilesApi.createFile({
    project_id: projectId,
    name: 'src',
    path: '/src',
    file_type: 'directory',
    parent_id: null,
    content: '',
  });
  
  if (!srcFolder.data) return;
  
  // Create main.cpp
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'main.cpp',
    path: '/src/main.cpp',
    file_type: 'file',
    mime_type: 'text/x-c++src',
    parent_id: srcFolder.data.id,
    content: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`,
  });
  
  // Create CMakeLists.txt
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'CMakeLists.txt',
    path: '/CMakeLists.txt',
    file_type: 'file',
    mime_type: 'text/plain',
    parent_id: null,
    content: `cmake_minimum_required(VERSION 3.10)
project(CppProject)

set(CMAKE_CXX_STANDARD 17)

add_executable(main src/main.cpp)
`,
  });
  
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# C++ Project

A C++ project created with MocsCode.

## Getting Started

Build with CMake:

\`\`\`bash
mkdir -p build && cd build
cmake ..
make
\`\`\`

Run:
\`\`\`bash
./main
\`\`\`
`,
  });
}

/**
 * Creates a Go project template
 */
async function createGoTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Create main.go
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'main.go',
    path: '/main.go',
    file_type: 'file',
    mime_type: 'text/x-go',
    parent_id: null,
    content: `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`,
  });
  
  // Create go.mod
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'go.mod',
    path: '/go.mod',
    file_type: 'file',
    mime_type: 'text/plain',
    parent_id: null,
    content: `module example.com/goproject

go 1.21
`,
  });
  
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# Go Project

A Go project created with MocsCode.

## Getting Started

Run: \`go run main.go\`

Build: \`go build\`
`,
  });
}

/**
 * Creates a Rust project template
 */
async function createRustTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Create src folder
  const srcFolder = await projectFilesApi.createFile({
    project_id: projectId,
    name: 'src',
    path: '/src',
    file_type: 'directory',
    parent_id: null,
    content: '',
  });
  
  if (!srcFolder.data) return;
  
  // Create main.rs
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'main.rs',
    path: '/src/main.rs',
    file_type: 'file',
    mime_type: 'text/x-rustsrc',
    parent_id: srcFolder.data.id,
    content: `fn main() {
    println!("Hello, World!");
}
`,
  });
  
  // Create Cargo.toml
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'Cargo.toml',
    path: '/Cargo.toml',
    file_type: 'file',
    mime_type: 'text/plain',
    parent_id: null,
    content: `[package]
name = "rust_project"
version = "0.1.0"
edition = "2021"

[dependencies]
`,
  });
  
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# Rust Project

A Rust project created with MocsCode.

## Getting Started

Build and run: \`cargo run\`

Build only: \`cargo build\`
`,
  });
}

/**
 * Creates a C# project template
 */
async function createCSharpTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi
): Promise<void> {
  // Create Program.cs
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'Program.cs',
    path: '/Program.cs',
    file_type: 'file',
    mime_type: 'text/x-csharp',
    parent_id: null,
    content: `using System;

namespace CSharpProject
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, World!");
        }
    }
}
`,
  });
  
  // Create project file
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'CSharpProject.csproj',
    path: '/CSharpProject.csproj',
    file_type: 'file',
    mime_type: 'text/xml',
    parent_id: null,
    content: `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

</Project>
`,
  });
  
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# C# Project

A C# project created with MocsCode.

## Getting Started

Build: \`dotnet build\`

Run: \`dotnet run\`
`,
  });
}

/**
 * Creates a default template with just a README
 */
async function createDefaultTemplate(
  projectId: string, 
  projectFilesApi: ProjectFilesApi,
  language: string
): Promise<void> {
  // Create README.md
  await projectFilesApi.createFile({
    project_id: projectId,
    name: 'README.md',
    path: '/README.md',
    file_type: 'file',
    mime_type: 'text/markdown',
    parent_id: null,
    content: `# ${language} Project

A project created with MocsCode.

## Getting Started

Add your ${language} code files to get started.
`,
  });
}