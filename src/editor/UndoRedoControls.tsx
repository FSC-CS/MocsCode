import React from 'react';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { StateField } from '@codemirror/state';
import { history, undoDepth, redoDepth } from '@codemirror/commands';

interface UndoRedoControlsProps {
  view: EditorView | null;
}

export function UndoRedoControls({ view }: UndoRedoControlsProps) {
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
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 10,
      display: 'flex',
      gap: '8px',
      background: 'var(--editor-bg)',
      padding: '4px',
      borderRadius: '4px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }}>
      <button 
        onClick={handleUndo}
        disabled={!canUndo}
        style={{
          background: 'none',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: canUndo ? 'pointer' : 'not-allowed',
          opacity: canUndo ? 1 : 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-color)'
        }}
        title="Undo (Ctrl+Z)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14 4 9l5-5"/>
          <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
        </svg>
      </button>
      <button 
        onClick={handleRedo}
        disabled={!canRedo}
        style={{
          background: 'none',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: canRedo ? 'pointer' : 'not-allowed',
          opacity: canRedo ? 1 : 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-color)'
        }}
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
