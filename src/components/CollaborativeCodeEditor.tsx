import React, { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { basicSetup } from 'codemirror';
import { useCollaborativeEditor } from '../hooks/useCollaborativeEditor';

const languageMap = {
  javascript: javascript(),
  python: python(),
  java: java(),
  cpp: cpp(),
  html: html(),
  // Add more languages as needed
};

interface CollaborativeCodeEditorProps {
  roomId: string;
  initialContent?: string;
  language?: string;
  className?: string;
  onChange?: (content: string) => void;
}

export function CollaborativeCodeEditor({
  roomId,
  initialContent = '',
  language = 'javascript',
  className = '',
  onChange,
}: CollaborativeCodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const { content, updateContent, updateCursor, isLoading } = useCollaborativeEditor({
    roomId,
    initialContent,
  });

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || isLoading) return;

    const extensions = [
      basicSetup,
      keymap.of([...defaultKeymap, indentWithTab]),
      languageMap[language as keyof typeof languageMap] || javascript(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          updateContent(newContent);
          onChange?.(newContent);
        }
        if (update.selectionSet) {
          updateCursor(update.state.selection);
        }
      }),
    ];

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [isLoading, language, onChange, roomId]);

  // Update editor content when it changes from other users
  useEffect(() => {
    if (!editorViewRef.current || isLoading) return;
    
    const currentContent = editorViewRef.current.state.doc.toString();
    if (content !== currentContent) {
      const transaction = editorViewRef.current.state.update({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: content,
        },
      });
      editorViewRef.current.dispatch(transaction);
    }
  }, [content, isLoading]);

  return <div ref={editorRef} className={`h-full w-full ${className}`} />;
}
