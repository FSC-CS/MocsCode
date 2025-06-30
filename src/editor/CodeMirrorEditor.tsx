import React, { useEffect, useRef } from "react";

// Dynamically import updateEditorSettings for live config changes
let updateEditorSettings: any = null;
let destroyCollaborative: any = null;
let getCollaborativeInfo: any = null;

import("./editor.mjs").then((mod) => {
  updateEditorSettings = mod.updateEditorSettings;
  destroyCollaborative = mod.destroyCollaborative;
  getCollaborativeInfo = mod.getCollaborativeInfo;
});

interface CodeMirrorEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  tabSize?: number;
  autocomplete?: boolean;
  file_name: string;
  // *** NEW: Collaborative editing props ***
  collaborative?: {
    roomId: string;
    userName?: string;
    userColor?: { color: string; light: string };
    onUserJoin?: (user: any, clientId: string) => void;
    onUserLeave?: (clientId: string) => void;
    onContentChange?: (delta: any, content: string) => void;
  };
  // *** NEW: Collaborative status callback ***
  onCollaborativeStatus?: (status: {
    connectedUsers: any[];
    isConnected: boolean;
    roomId: string;
  } | null) => void;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({ 
  value, 
  language, 
  onChange, 
  tabSize = 4, 
  autocomplete = true, 
  file_name,
  collaborative,
  onCollaborativeStatus
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const sessionRef = useRef(0);
  const latestOnChangeRef = useRef(onChange);
  const collaborativeStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Always keep latest onChange in the ref
  useEffect(() => {
    latestOnChangeRef.current = onChange;
  }, [onChange]);

  // *** NEW: Collaborative status monitoring ***
  useEffect(() => {
    if (viewRef.current && collaborative && onCollaborativeStatus && getCollaborativeInfo) {
      // Poll collaborative status every 2 seconds
      collaborativeStatusIntervalRef.current = setInterval(() => {
        const status = getCollaborativeInfo(viewRef.current);
        onCollaborativeStatus(status);
      }, 2000);

      // Get initial status
      setTimeout(() => {
        const status = getCollaborativeInfo(viewRef.current);
        onCollaborativeStatus(status);
      }, 500);

      return () => {
        if (collaborativeStatusIntervalRef.current) {
          clearInterval(collaborativeStatusIntervalRef.current);
        }
      };
    }
  }, [collaborative, onCollaborativeStatus]);

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
          // Clean up previous collaborative instance
          if (destroyCollaborative) {
            destroyCollaborative(viewRef.current);
          }
          viewRef.current.destroy();
        }

        const view = mod.createEditorView({
          parent: editorRef.current,
          doc: value,
          language,
          onChange: safeOnChange,
          tabSize,
          autocomplete,
          file_name,
          // *** NEW: Pass collaborative config ***
          collaborative: {
            roomId: file_name,
            userName: collaborative.name,
            userColor: collaborative.color,
            onUserJoin: collaborative.onUserJoin,
            onUserLeave: collaborative.onUserLeave,
            onContentChange: collaborative.onContentChange
          }
        });

        viewRef.current = view;
        view.focus();

        // *** NEW: Log collaborative setup ***
        if (collaborative) {
          console.log('🚀 Collaborative editor created for room:', file_name);
        }
      });
    }

    return () => {
      cancelled = true;
      if (viewRef.current) {
        // Clean up collaborative instance
        if (destroyCollaborative) {
          destroyCollaborative(viewRef.current);
        }
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (collaborativeStatusIntervalRef.current) {
        clearInterval(collaborativeStatusIntervalRef.current);
      }
    };
  }, [language, collaborative?.roomId]); // *** UPDATED: Re-run when room changes ***

  // Update document if value changes externally (disabled for collaborative mode)
  useEffect(() => {
    if (viewRef.current && !collaborative && viewRef.current.state.doc.toString() !== value) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: value },
      });
    }
  }, [value, collaborative]);

  // Live update tabSize and autocomplete settings
  useEffect(() => {
    if (viewRef.current && updateEditorSettings) {
      updateEditorSettings(viewRef.current, { tabSize, autocomplete });
    }
  }, [tabSize, autocomplete]);

  return (
    <div className="w-full h-full bg-[#1e1e1e] rounded-b-lg border border-gray-700 overflow-hidden">
      {/* *** NEW: Collaborative status indicator *** */}
      {collaborative && (
        <div className="bg-gray-800 px-3 py-1 text-xs text-gray-300 border-b border-gray-700 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Room: {collaborative.roomId}</span>
          </div>
        </div>
      )}
      
      <div
        ref={editorRef}
        className={`cm-editor h-full w-full ${collaborative ? 'h-[calc(100%-2rem)]' : ''}`}
        tabIndex={0}
        data-testid="codemirror-editor"
      />
    </div>
  );
};

export default CodeMirrorEditor;