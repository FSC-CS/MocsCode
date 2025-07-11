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
  syntaxTheme?: string;
  ytext?: any;
  provider?: any;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({ 
  value, 
  language, 
  onChange, 
  tabSize = 4, 
  autocomplete = true, 
  syntaxTheme = 'default',
  ytext,
  provider,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const sessionRef = useRef(0);
  const latestOnChangeRef = useRef(onChange);

  // Always keep latest onChange in the ref
  useEffect(() => {
    latestOnChangeRef.current = onChange;
  }, [onChange]);

  // Only recreate the editor when provider changes
  useEffect(() => {
    let cancelled = false;
    const thisSession = ++sessionRef.current;

    if (editorRef.current) {
      import("./editor.mjs").then((mod) => {
        if (cancelled || thisSession !== sessionRef.current) return;

        // Wrap onChange so it always uses the latest handler
        const safeOnChange = (val: string) => {
          latestOnChangeRef.current(val);
        };

        if (viewRef.current) {
          viewRef.current.destroy();
        }

        console.log("CURSOR");

        const view = mod.createEditorView({
          parent: editorRef.current,
          doc: value,
          language,
          onChange: safeOnChange,
          tabSize,
          autocomplete,
          syntaxTheme,
          ytext,
          provider,
        });

        viewRef.current = view;
        view.focus();
      });
    }

    return () => {
      cancelled = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [provider]); // Dependency array simplified

  // Update document if value changes externally
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== value) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: value },
      });
    }
  }, [value]);

  // Live update editor settings
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
        
        updateEditorSettings(viewRef.current, { 
          tabSize, 
          autocomplete: autocomplete ?? true,
          syntaxTheme
        });
      }
    };

    updateSettings();
  }, [tabSize, autocomplete, syntaxTheme]);

  return (
    <div className="relative h-full w-full">
      <div ref={editorRef} className="h-full w-full" />
      {viewRef.current && (
        <UndoRedoControls
          view={viewRef.current}
          className="absolute top-2 right-2 z-10"
        />
      )}
    </div>
  );
};

export default CodeMirrorEditor;