import React from 'react';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { StateField } from '@codemirror/state';
import { history, undoDepth, redoDepth } from '@codemirror/commands';

interface UndoRedoControlsProps {
  view: EditorView | null;
  className?: string;
}

export function UndoRedoControls({ view, className = '' }: UndoRedoControlsProps) {
  const canUndo = view ? undoDepth(view.state) > 0 : false;
  const canRedo = view ? redoDepth(view.state) > 0 : false;

  const handleUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    if (view) {
      undo({ state: view.state, dispatch: view.dispatch });
      // Focus the editor after undo
      view.focus();
    }
  };

  const handleRedo = (e: React.MouseEvent) => {
    e.preventDefault();
    if (view) {
      redo({ state: view.state, dispatch: view.dispatch });
      // Focus the editor after redo
      view.focus();
    }
  };

  return (
    <div className={`flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-md shadow-md p-1 border border-gray-200 dark:border-gray-700 ${className}`}>
      <button 
        onClick={handleUndo}
        className={`p-1.5 rounded-md transition-colors ${
          canUndo 
            ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700' 
            : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
        }`}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14 4 9l5-5"/>
          <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
        </svg>
      </button>
      <button 
        onClick={handleRedo}
        className={`p-1.5 rounded-md transition-colors ${
          canRedo 
            ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700' 
            : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
        }`}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 14 5-5-5-5"/>
          <path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
        </svg>
      </button>
    </div>
  );
}

// Import and use the history extension
const historyExtension = history();
