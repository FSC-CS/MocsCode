import React, { useEffect, useRef } from "react";

interface CodeMirrorEditorProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  tabSize?: number;
  autocomplete?: boolean;
  ytext?: any;
  provider?: any;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({ 
  value, 
  language, 
  onChange = () => {}, 
  tabSize = 4, 
  autocomplete = true, 
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

        const view = mod.createEditorView({
          parent: editorRef.current,
          doc: value,
          language,
          onChange: safeOnChange,
          tabSize,
          autocomplete,
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
  }, []); // Dependency array simplified

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