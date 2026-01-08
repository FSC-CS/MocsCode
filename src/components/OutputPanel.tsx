import React, { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Trash2, Terminal, Settings, FileInput } from 'lucide-react';

interface OutputPanelProps {
  output: string;
  setOutput: React.Dispatch<React.SetStateAction<string>>;
  isRunning: boolean;
  stdin: string;
  setStdin: React.Dispatch<React.SetStateAction<string>>;
  compileScript: string;
  setCompileScript: React.Dispatch<React.SetStateAction<string>>;
  runScript: string;
  setRunScript: React.Dispatch<React.SetStateAction<string>>;
}

const OutputPanel = ({ 
  output,
  setOutput,
  isRunning,
  stdin,
  setStdin,
  compileScript,
  setCompileScript,
  runScript,
  setRunScript,
}: OutputPanelProps) => {
  const [activeTab, setActiveTab] = React.useState<'output' | 'input' | 'config'>('output');
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  // Auto-switch to output tab when code execution starts
  useEffect(() => {
    if (isRunning) {
      setActiveTab('output');
    }
  }, [isRunning]);

  return (
    <div className="h-full flex flex-col bg-gray-800 overflow-hidden">
      {/* Tabs Header */}
      <div className="px-6 py-2 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            <button
              className={`text-sm font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${activeTab === 'output' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
              onClick={() => setActiveTab('output')}
            >
              <Terminal className="w-4 h-4" />
              Output
            </button>
            <button
              className={`text-sm font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${activeTab === 'input' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
              onClick={() => setActiveTab('input')}
            >
              <FileInput className="w-4 h-4" />
              Input
            </button>
            <button
              className={`text-sm font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${activeTab === 'config' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
              onClick={() => setActiveTab('config')}
            >
              <Settings className="w-4 h-4" />
              Config
            </button>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
            onClick={() => setOutput('')}
            title="Clear output"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'output' && (
          <div className="flex-1 overflow-auto p-4 px-6 bg-gray-950">
            {isRunning ? (
              <div className="flex items-center space-x-2 text-yellow-400 p-2">
                <div className="animate-spin">
                  <Play className="h-4 w-4" />
                </div>
                <span className="text-sm font-mono">Running...</span>
              </div>
            ) : output ? (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono break-words p-2">
                {output}
                <div ref={outputEndRef} />
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Terminal className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Run your code to see output</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'input' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 px-6">
            <label className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
              <FileInput className="w-3.5 h-3.5" />
              Standard Input (stdin)
            </label>
            <textarea
              className="flex-1 w-full p-3 text-sm font-mono bg-gray-950 text-gray-200 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none placeholder-gray-600"
              value={stdin}
              onChange={e => setStdin(e.target.value)}
              placeholder="Enter input that your program will read from stdin..."
              spellCheck={false}
            />
            <p className="text-xs text-gray-500 mt-2">
              This input will be available to your program when it reads from stdin.
            </p>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="flex-1 overflow-auto p-4 px-6 space-y-4">
            <div>
              <label htmlFor="compile-sh" className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Compile Script (optional)
              </label>
              <textarea
                id="compile-sh"
                className="w-full p-3 text-sm font-mono bg-gray-950 text-gray-200 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none placeholder-gray-600"
                value={compileScript}
                onChange={e => setCompileScript(e.target.value)}
                placeholder="# Commands to compile your code..."
                spellCheck={false}
                rows={4}
              />
            </div>
            <div>
              <label htmlFor="run-sh" className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                Run Script
              </label>
              <textarea
                id="run-sh"
                className="w-full p-3 text-sm font-mono bg-gray-950 text-gray-200 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none placeholder-gray-600"
                value={runScript}
                onChange={e => setRunScript(e.target.value)}
                placeholder="# Commands to run your code..."
                spellCheck={false}
                rows={4}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
