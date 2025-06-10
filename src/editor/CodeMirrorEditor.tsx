import React, { useEffect, useRef } from "react";

// Import your CodeMirror logic from the .mjs bundle
// We'll assume editor.bundle.js exposes a global window.CodeMirrorEditorAPI for integration
// If not, you can adjust this import to use your modularized .mjs files directly

interface CodeMirrorEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({ value, language, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);

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
        view = mod.createEditorView({
          parent: editorRef.current,
          doc: value,
          language,
          onChange,
        });
        viewRef.current = view;
        // Focus the editor immediately on mount so CodeMirror receives keyboard events
        view.focus();
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

  // Removed global tab key handler - CodeMirror handles tab natively

  return (
    <div className="w-full h-full bg-[#1e1e1e] rounded-b-lg border border-gray-700 overflow-hidden">
      <div
        ref={editorRef}
        className="cm-editor h-full w-full"
        tabIndex={0}
        data-testid="codemirror-editor"
      />
    </div>
  );
};

export default CodeMirrorEditor;
