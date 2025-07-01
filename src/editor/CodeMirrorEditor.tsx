import React, { useEffect, useRef, useState, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { history } from "@codemirror/commands";
import { UndoRedoControls } from "./UndoRedoControls";

// Dynamically import updateEditorSettings for live config changes
let updateEditorSettings: any = null;
let editorModule: any = null;

interface CodeMirrorEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  tabSize?: number;
  autocomplete?: boolean;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  language,
  onChange,
  tabSize = 4,
  autocomplete = true
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  // Only recreate the editor when language, tabSize, or autocomplete changes
  useEffect(() => {
    let localEditorView: EditorView | null = null;
    let isMounted = true;

    const initializeEditor = async () => {
      if (!editorRef.current) return;
      
      const mod = await import("./editor.mjs");
      
      // Clean up previous editor instance
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }

      // Only proceed if component is still mounted
      if (!isMounted) return;

      // Create the editor
      localEditorView = mod.createEditorView({
        parent: editorRef.current,
        doc: value,
        language,
        extensions: [
          history(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const currentContent = update.state.doc.toString();
              // Only call onChange if the content actually changed
              if (currentContent !== value) {
                onChange(currentContent);
              }
            }
          })
        ],
        tabSize,
        autocomplete
      });

      viewRef.current = localEditorView;
      setEditorView(localEditorView);

      // Set initial focus without scrolling
      requestAnimationFrame(() => {
        if (localEditorView && isMounted) {
          localEditorView.focus();
          // Set cursor to the end of the document
          const docLength = localEditorView.state.doc.length;
          localEditorView.dispatch({
            selection: { anchor: docLength },
            scrollIntoView: true
          });
        }
      });
    };

    initializeEditor();

    // Cleanup function
    return () => {
      isMounted = false;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [language, tabSize, autocomplete, value, onChange]);

  // Live update tabSize and autocomplete settings
  useEffect(() => {
    const updateSettings = async () => {
      if (!updateEditorSettings) {
        const mod = await import("./editor.mjs");
        updateEditorSettings = mod.updateEditorSettings;
        editorModule = mod;
      }

      if (viewRef.current && updateEditorSettings) {
        // Only update if the values have actually changed
        const currentState = viewRef.current.state;
        const currentTabSize = currentState.tabSize;
        
        if (currentTabSize !== tabSize || autocomplete !== undefined) {
          updateEditorSettings(viewRef.current, { 
            tabSize, 
            autocomplete: autocomplete ?? true 
          });
        }
      }
    };

    updateSettings();
  }, [tabSize, autocomplete]);

  // Handle cursor position updates
  const handleCursorChange = useCallback((cursor: { x: number; y: number } | null) => {
    // No-op for now
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={editorRef} className="h-full w-full" />
      {editorView && (
        <UndoRedoControls
          view={editorView}
          className="absolute top-2 right-2 z-10"
        />
      )}
    </div>
  );
};

export default CodeMirrorEditor;
