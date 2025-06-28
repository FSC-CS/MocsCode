import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { basicSetup } from 'codemirror';
import { yCollab } from 'y-codemirror.next';
import { useCollaborativeEditor } from '../hooks/useCollaborativeEditor';
import * as Y from 'yjs';

// Language configuration
const languageMap = {
  javascript: javascript(),
  python: python(),
  java: java(),
  cpp: cpp(),
  html: html(),
  // Add more languages as needed
};

// Theme configuration
const theme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'white',
    color: '#1f2937',
  },
  '.cm-content': {
    caretColor: 'var(--vervet-color)',
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--vervet-color)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#dbeafe',
  },
  '.cm-gutters': {
    backgroundColor: '#f9fafb',
    borderRight: '1px solid #e5e7eb',
    color: '#6b7280',
  },
  '.cm-activeLine': {
    backgroundColor: '#f3f4f6',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e5e7eb',
  },
});

interface CollaborativeCodeEditorProps {
  roomId: string;
  language?: string;
  className?: string;
  initialContent?: string;
  onChange?: (content: string) => void;
}

export function CollaborativeCodeEditor({
  roomId,
  language = 'javascript',
  className = '',
  initialContent = '',
  onChange,
}: CollaborativeCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [isEditorLoading, setIsEditorLoading] = useState(true);
  const { 
    content, 
    updateContent, 
    updateCursor, 
    isLoading, 
    room, 
    yText, 
    getYjsBindings, 
  } = useCollaborativeEditor({ 
    roomId, 
    initialContent: initialContent || '' 
  });

  // Initialize editor with Yjs
  useEffect(() => {
    if (!editorRef.current || !yText) return;

    // Get Yjs bindings
    const yjsBindings = getYjsBindings?.() || [];

    // Set up the editor with Yjs bindings
    const state = EditorState.create({
      doc: yText.toString(),
      extensions: [
        basicSetup,
        keymap.of([...defaultKeymap, indentWithTab]),
        languageMap[language as keyof typeof languageMap] || javascript(),
        theme,
        ...yjsBindings,
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            updateContent(content);
            onChange?.(content);
          }
          if (update.selectionSet) {
            updateCursor(update.state.selection);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;
    setIsEditorLoading(false);

    // Cleanup
    return () => {
      if (view) {
        view.destroy();
      }
    };
  }, [yText, language, onChange, updateContent, updateCursor, getYjsBindings]);

  // Handle language changes
  const languageCompartment = useRef(new Compartment());
  useEffect(() => {
    if (!editorViewRef.current) return;
    
    const lang = languageMap[language as keyof typeof languageMap] || javascript();
    editorViewRef.current.dispatch({
      effects: languageCompartment.current.reconfigure(lang),
    });
  }, [language]);

  // Handle window resize with debounce
  const handleResize = useCallback(() => {
    if (editorViewRef.current) {
      editorViewRef.current.requestMeasure();
    }
  }, []);

  useEffect(() => {
    const debouncedResize = debounce(handleResize, 100);
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      debouncedResize.cancel();
    };
  }, [handleResize]);
  
  // Simple debounce function
  function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ) {
    let timeout: NodeJS.Timeout;
    const debounced = (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
    debounced.cancel = () => clearTimeout(timeout);
    return debounced;
  }

  if (isLoading || isEditorLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-500">Loading editor...</span>
      </div>
    );
  }

  return (
    <div 
      ref={editorRef} 
      className={`h-full w-full overflow-auto bg-white ${className}`}
      style={{
        '--vervet-color': '#4f46e5', // Custom property for cursor color
      } as React.CSSProperties}
    />
  );
}
