import React, { useEffect, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { history } from "@codemirror/commands";
import { UndoRedoControls } from "./UndoRedoControls";

// Import your CodeMirror logic from the .mjs bundle
// We'll assume editor.bundle.js exposes a global window.CodeMirrorEditorAPI for integration
// If not, you can adjust this import to use your modularized .mjs files directly

// Dynamically import updateEditorSettings for live config changes
let updateEditorSettings: any = null;
let editorModule: any = null;
import("./editor.mjs").then((mod) => {
  updateEditorSettings = mod.updateEditorSettings;
  editorModule = mod;
});

interface CodeMirrorEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  tabSize?: number; // Number of spaces for tab (default 4)
  autocomplete?: boolean; // Enable/disable autocomplete (default true)
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({ value, language, onChange, tabSize = 4, autocomplete = true }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  useEffect(() => {
    let view: any;
    if (editorRef.current) {
      // Dynamically import the editor logic
      import("./editor.mjs").then((mod) => {
        // Initialize CodeMirror using your logic
        // mod.createEditorView should be a function you expose for React integration
        if (viewRef.current) {
          // If an editor already exists, destroy it
          viewRef.current.destroy();
        }
        // Create editor with history extension
        const extensions = [
          history(), // Add history extension for undo/redo
          // Add other extensions here if needed
        ];
        
        const editorView = mod.createEditorView({
          parent: editorRef.current,
          doc: value,
          language,
          onChange,
          tabSize,
          autocomplete,
          extensions, // Add the extensions
        });
        
        viewRef.current = editorView;
        setEditorView(editorView);
        // Focus the editor immediately on mount so CodeMirror receives keyboard events
        editorView.focus();
      });
    }
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
    // Only re-run if language or value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Update document if value changes externally
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== value) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: value },
      });
    }
  }, [value]);

  // Live update tabSize and autocomplete settings
  useEffect(() => {
    if (viewRef.current && updateEditorSettings) {
      updateEditorSettings(viewRef.current, { tabSize, autocomplete });
    }
  }, [tabSize, autocomplete]);

  // Removed global tab key handler - CodeMirror handles tab natively

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
      {editorView && <UndoRedoControls view={editorView} />}
    </div>
  );
};

export default CodeMirrorEditor;
