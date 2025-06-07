
import React, { useState, useRef, useCallback } from 'react';
import CodeMirrorEditor from '../editor/CodeMirrorEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Share, Users, FileText, Settings, User, X } from 'lucide-react';
import FileExplorer from './FileExplorer';
import CollaboratorPanel from './CollaboratorPanel';
import OutputPanel from './OutputPanel';
import ChatPanel from './ChatPanel';
import SourceControlPanel from './SourceControlPanel';
import ResizablePanel from './ResizablePanel'; // Add this import

interface CodeEditorProps {
  project: any;
  onBack: () => void;
}

interface OpenFile {
  name: string;
  content: string;
  language: string;
}

const CodeEditor = ({ project, onBack }: CodeEditorProps) => {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([
    {
      name: 'main.java',
      content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeCollab!");
        
        // Start coding your assignment here
        // This is a collaborative space for your team
    }
}`,
      language: 'java'
    }
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [editorHeight, setEditorHeight] = useState(400);
  const [fileExplorerWidth, setFileExplorerWidth] = useState(256);
  const [chatPanelWidth, setChatPanelWidth] = useState(320);
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    const file = openFiles[activeFileIndex];
    if (!file) {
      setOutput('No file selected.');
      setIsRunning(false);
      return;
    }
    // Judge0 language IDs
    const langMap: { [key: string]: number } = {
      'cpp': 54,
      'java': 62,
      'python': 71,
      'javascript': 63,
      'c': 50,
      'csharp': 51,
      'plaintext': 43,
      'markdown': 60,
      'html': 42
    };
    const language_id = langMap[file.language] || 43;
    const endpoint = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': '5e11628ca4msh0cac24bb162a655p1257c7jsnde986d9f6d3a',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        body: JSON.stringify({
          source_code: file.content,
          language_id,
        })
      });
      const data = await response.json();
      let output = '';
      if (data.stdout) output += data.stdout;
      if (data.stderr) output += '\n[stderr]\n' + data.stderr;
      if (data.compile_output) output += '\n[compiler]\n' + data.compile_output;
      if (data.message) output += '\n[message]\n' + data.message;
      setOutput(output || '[No output]');
    } catch (err: any) {
      setOutput('Error running code: ' + err.message);
    }
    setIsRunning(false);
  };

  const getLanguageFromFile = (filename: string) => {
    const extension = filename.split('.').pop();
    const languageMap: { [key: string]: string } = {
      'java': 'java',
      'py': 'python',
      'js': 'javascript',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const openFile = (filename: string) => {
    // Check if file is already open
    const existingIndex = openFiles.findIndex(file => file.name === filename);
    if (existingIndex !== -1) {
      setActiveFileIndex(existingIndex);
      return;
    }

    // Create new file content based on filename
    const getDefaultContent = (name: string) => {
      const extension = name.split('.').pop();
      switch (extension) {
        case 'java':
          return `public class ${name.replace('.java', '')} {\n    // Add your code here\n}`;
        case 'py':
          return `# ${name}\n# Add your Python code here\n`;
        case 'js':
          return `// ${name}\n// Add your JavaScript code here\n`;
        case 'md':
          return `# ${name.replace('.md', '')}\n\nAdd your documentation here.\n`;
        default:
          return `// ${name}\n// Add your code here\n`;
      }
    };

    const newFile: OpenFile = {
      name: filename,
      content: getDefaultContent(filename),
      language: getLanguageFromFile(filename)
    };

    setOpenFiles([...openFiles, newFile]);
    setActiveFileIndex(openFiles.length);
  };

  const closeFile = (index: number) => {
    if (openFiles.length === 1) return; // Don't close the last file
    
    const newOpenFiles = openFiles.filter((_, i) => i !== index);
    setOpenFiles(newOpenFiles);
    
    // Adjust active file index
    if (index === activeFileIndex) {
      setActiveFileIndex(Math.max(0, index - 1));
    } else if (index < activeFileIndex) {
      setActiveFileIndex(activeFileIndex - 1);
    }
  };

  const updateFileContent = (content: string) => {
    const updatedFiles = [...openFiles];
    updatedFiles[activeFileIndex] = {
      ...updatedFiles[activeFileIndex],
      content: content
    };
    setOpenFiles(updatedFiles);
  };

  // Mock collaborators
  const collaborators = [
    { id: 1, name: 'Alice Chen', color: '#3B82F6', cursor: { line: 4, column: 12 }, isTyping: true, accessLevel: 'edit' as const },
    { id: 2, name: 'Bob Smith', color: '#10B981', cursor: { line: 7, column: 0 }, isTyping: false, accessLevel: 'edit' as const },
    { id: 3, name: 'Carol Johnson', color: '#F59E0B', cursor: null, isTyping: false, accessLevel: 'view' as const }
  ];

  const activeFile = openFiles[activeFileIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center space-x-3">
              <h1 className="text-lg font-semibold text-white">{project?.name}</h1>
              <Badge className="bg-orange-100 text-orange-800">{project?.language}</Badge>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={runCode}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Code'}
            </Button>
            
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowCollaborators(!showCollaborators)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Collaborators ({collaborators.length})
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Resizable File Explorer with Source Control */}
        <ResizablePanel
          direction="horizontal"
          initialSize={fileExplorerWidth}
          minSize={180}
          maxSize={600}
          onResize={setFileExplorerWidth}
          className="bg-gray-800 border-r border-gray-700 flex flex-col"
        >
          <div className="flex-1">
            <FileExplorer currentFile={activeFile?.name || ''} onFileSelect={openFile} />
          </div>
          <div className="h-64">
            <SourceControlPanel />
          </div>
        </ResizablePanel>

        {/* Editor and Output */}
        <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
          {/* File Tabs */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
            <div className="flex items-center space-x-1 overflow-x-auto">
              {openFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-t-lg text-sm cursor-pointer group min-w-0 ${
                    index === activeFileIndex
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveFileIndex(index)}
                >
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                  {openFiles.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeFile(index);
                      }}
                      className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Collaboration Indicators */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Active collaborators:</span>
              <div className="flex space-x-2">
                {collaborators.filter(c => c.isTyping || c.cursor).map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center space-x-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: collaborator.color }}
                    />
                    <span className="text-xs text-gray-300">{collaborator.name}</span>
                    {collaborator.isTyping && (
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse delay-100" />
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse delay-200" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Editor and Output Container */}
          <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
            {/* Editor Section */}
            <div className="overflow-hidden" style={{ height: editorHeight, minHeight: 100 }}>
              {activeFile && (
                <CodeMirrorEditor
                  value={activeFile.content}
                  language={activeFile.language}
                  onChange={updateFileContent}
                />
              )}
            </div>

            {/* Resize Handle */}
            <div 
              className="h-2 w-full bg-gray-700 hover:bg-blue-500 cursor-row-resize active:bg-blue-600 relative z-10"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const startY = e.clientY;
                const startHeight = editorHeight;
                const container = e.currentTarget.parentElement?.getBoundingClientRect();
                if (!container) return;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = moveEvent.clientY - startY;
                  const newHeight = startHeight + delta;
                  // Ensure we don't go below min height or above max height
                  const minHeight = 100;
                  const maxHeight = window.innerHeight - 200; // Leave some space for other UI
                  const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                  setEditorHeight(constrainedHeight);
                };

                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
              }}
            />

            {/* Output Panel */}
            <div className="bg-gray-800 border-t border-gray-700 flex-1 min-h-[100px] overflow-auto" style={{ minHeight: 100 }}>
              <OutputPanel output={output} isRunning={isRunning} />
            </div>
          </div>
        </div>

        {/* Resizable Chat Panel */}
        <ResizablePanel
          direction="horizontal"
          initialSize={chatPanelWidth}
          minSize={200}
          maxSize={600}
          onResize={setChatPanelWidth}
          className="bg-gray-800 border-l border-gray-700"
        >
          <ChatPanel collaborators={collaborators} />
        </ResizablePanel>

        {/* Collaborator Panel - Still toggleable */}
        {showCollaborators && (
          <div className="w-64 bg-gray-800 border-l border-gray-700">
            <CollaboratorPanel collaborators={collaborators} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;