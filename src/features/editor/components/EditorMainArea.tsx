import React from 'react';
import { FileText } from 'lucide-react';
import CodeMirrorEditor from '@/editor/CodeMirrorEditor';
import EditorTabBar from '@/components/editor/EditorTabBar';
import OutputPanel from '@/components/OutputPanel';
import type { OpenFile } from '../types';

interface EditorMainAreaProps {
  // File management
  openFiles: (OpenFile & { id?: string })[];
  activeFileIndex: number;
  activeFile: (OpenFile & { id?: string }) | undefined;
  setActiveFileIndex: (index: number) => void;
  closeFile: (index: number) => void;
  updateFileContent: (content: string) => void;
  
  // Editor settings
  tabSize: number;
  autocomplete: boolean;
  syntaxTheme: string;
  
  // Layout
  editorHeight: number;
  setEditorHeight: (height: number) => void;
  isSidebarCollapsed: boolean;
  isChatPanelCollapsed: boolean;
  fileExplorerWidth: number;
  chatPanelWidth: number;
  
  // Code execution
  output: string;
  setOutput: (output: string) => void;
  isRunning: boolean;
  stdin: string;
  setStdin: (stdin: string) => void;
  compileScript: string;
  setCompileScript: (script: string) => void;
  runScript: string;
  setRunScript: (script: string) => void;
}

export function EditorMainArea({
  openFiles,
  activeFileIndex,
  activeFile,
  setActiveFileIndex,
  closeFile,
  updateFileContent,
  tabSize,
  autocomplete,
  syntaxTheme,
  editorHeight,
  setEditorHeight,
  isSidebarCollapsed,
  isChatPanelCollapsed,
  fileExplorerWidth,
  chatPanelWidth,
  output,
  setOutput,
  isRunning,
  stdin,
  setStdin,
  compileScript,
  setCompileScript,
  runScript,
  setRunScript,
}: EditorMainAreaProps) {
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startY = e.clientY;
    const startHeight = editorHeight;
    const container = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!container) return;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newEditorHeight = startHeight + (delta / container.height * 100);
      setEditorHeight(Math.max(10, Math.min(90, newEditorHeight)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
  };

  return (
    <div 
      className="flex-1 flex flex-col overflow-hidden relative bg-gray-900"
      style={{
        minWidth: 0,
        width: `calc(100% - ${isSidebarCollapsed ? '4px' : `${fileExplorerWidth}px`} - ${isChatPanelCollapsed ? '4px' : `${chatPanelWidth}px`})`,
        transition: 'width 0.2s ease-out, margin 0.2s ease-out',
        marginLeft: 0,
        marginRight: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* File Tabs - with padding to avoid collapse tab overlap */}
      <div className="pl-4 pr-4">
        <EditorTabBar
          openFiles={openFiles}
          activeFileIndex={activeFileIndex}
          setActiveFileIndex={setActiveFileIndex}
          closeFile={closeFile}
        />
      </div>

      {/* Main Editor and Output Container */}
      <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
        {/* Editor Section */}
        <div className="overflow-hidden" style={{ height: `${editorHeight}%`, minHeight: 100 }}>
          {openFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full w-full text-center select-none">
              <div className="mx-auto max-w-md p-8 rounded-lg bg-gray-900/80 border border-gray-700 shadow-lg">
                <h2 className="text-2xl font-bold mb-2 text-blue-400">Welcome to the Code Editor</h2>
                <p className="text-gray-300 mb-4">To get started, open or create a file from the file explorer panel on the left.</p>
                <div className="flex justify-center">
                  <FileText className="h-10 w-10 text-blue-400" />
                </div>
              </div>
            </div>
          ) : (
            activeFile && (
              <CodeMirrorEditor
                value={activeFile.content.toString()}
                language={activeFile.language}
                tabSize={tabSize}
                autocomplete={autocomplete}
                syntaxTheme={syntaxTheme}
                ytext={activeFile.ytext}
                provider={activeFile.provider}
                onChange={updateFileContent}
              />
            )
          )}
        </div>

        {/* Output Panel with custom resize handle */}
        <div 
          className="relative flex flex-col bg-gray-800 border-t border-gray-700" 
          style={{ 
            height: `${100 - editorHeight}%`,
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Resize handle */}
          <div 
            className="h-2 w-full bg-gray-700 hover:bg-blue-500 cursor-row-resize active:bg-blue-600 relative z-10"
            onMouseDown={handleResizeStart}
          />
          
          {/* Output panel content */}
          <div className="flex-1 overflow-auto">
            <OutputPanel 
              output={output}
              setOutput={setOutput}
              isRunning={isRunning}
              stdin={stdin}
              setStdin={setStdin}
              compileScript={compileScript}
              setCompileScript={setCompileScript}
              runScript={runScript}
              setRunScript={setRunScript}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
