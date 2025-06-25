import React, { useEffect, useRef, useState, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { Extension, Transaction } from "@codemirror/state";
import { history } from "@codemirror/commands";
import * as Y from 'yjs';
import { UndoRedoControls } from "./UndoRedoControls";
import { yCollab } from 'y-codemirror.next';
import { getYjsProviderForRoom } from '@liveblocks/yjs';
import { useRoom } from '@liveblocks/react/suspense';

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

interface User {
  name: string;
  color: string;
  clientId?: number;
}

interface CodeMirrorEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  tabSize?: number; // Number of spaces for tab (default 4)
  autocomplete?: boolean; // Enable/disable autocomplete (default true)
  roomId?: string; // Room ID for collaborative editing
  userName?: string; // Optional custom username
  onUsersChange?: (users: Map<number, User>) => void; // Callback for user list changes
}

const generateRandomColor = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
const generateRandomName = () => `User ${Math.floor(Math.random() * 1000)}`;

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  language,
  onChange,
  tabSize = 4,
  autocomplete = true,
  roomId = 'default-room',
  userName = generateRandomName(),
  onUsersChange
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [currentUser, setCurrentUser] = useState<User>({ 
    name: userName,
    color: generateRandomColor() 
  });
  const [users, setUsers] = useState<Map<number, User>>(new Map());
  // --- Liveblocks Collaborative Setup ---
  const room = useRoom();
  const yProvider = room ? getYjsProviderForRoom(room) : null;
  
  // Set user data in awareness when it changes
  useEffect(() => {
    if (yProvider) {
      // Get the client ID from the Yjs awareness instance
      // @ts-ignore - clientID is not in the type definition but exists at runtime
      const clientId = yProvider.awareness.clientID || yProvider.awareness.clientId;
      
      yProvider.awareness.setLocalStateField('user', {
        name: currentUser.name,
        color: currentUser.color,
        clientId: clientId
      });
    }
  }, [yProvider, currentUser.name, currentUser.color]);

  useEffect(() => {
    let cleanupCollaboration: (() => void) | null = null;
    let localEditorView: EditorView | null = null;
    let handleYjsUpdate: ((event: Y.YTextEvent) => void) | null = null;

    if (editorRef.current && yProvider && room) {
      import("./editor.mjs").then(async (mod) => {
        // Clean up previous editor instance
        if (viewRef.current) {
          viewRef.current.destroy();
          viewRef.current = null;
        }

        // Get Yjs doc and text from Liveblocks provider
        const ydoc = yProvider.getYDoc();
        const ytext = ydoc.getText('codemirror');
        
        // Handle initial content sync
        const handleInitialContent = () => {
          const currentYText = ytext.toString();
          
          // If Yjs is empty but we have initial value, use that
          if (currentYText === '' && value) {
            ytext.insert(0, value);
          } 
          // If Yjs has content but it's different from props, and props has content
          else if (currentYText !== value && value) {
            // Only update if the content is significantly different
            if (currentYText.trim() !== value.trim()) {
              ytext.doc?.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, value);
              });
            }
          }
        };
        
        // Set up Yjs update listener before making any changes
        handleYjsUpdate = (event: Y.YTextEvent) => {
          // Skip if editor view isn't ready
          if (!localEditorView) return;
          
          // Get the current Yjs content
          const ytextContent = ytext.toString();
          const currentContent = localEditorView.state.doc.toString();
          
          // Only update if content is different
          if (ytextContent !== currentContent) {
            localEditorView.dispatch({
              changes: {
                from: 0,
                to: localEditorView.state.doc.length,
                insert: ytextContent
              },
              // Mark as remote change to prevent loops
              annotations: [Transaction.remote.of(true)]
            });
          }
        };
        
        // Listen for Yjs updates
        ytext.observe(handleYjsUpdate);
        
        // Set initial content
        handleInitialContent();

        // Undo manager
        const undoManager = new Y.UndoManager(ytext);
        
        // Collaborative extension with minimal options to prevent cursor jumping
        const collabExtension = yCollab(
          ytext, 
          yProvider.awareness, 
          { 
            undoManager,
            // Disable cursor tracking to prevent jumping
            cursorOptions: {
              permanentUserData: null,
              selectionBinding: false
            }
          } as any // Type assertion to avoid type errors with yCollab options
        );

        // Editor extensions
        const extensions: Extension[] = [
          history(),
          collabExtension,
          // Handle editor updates and sync with Yjs
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              const currentContent = update.state.doc.toString();
              
              // Only update Yjs if this is a local change (not from Yjs)
              if (update.transactions.some(tr => tr.annotation(Transaction.userEvent))) {
                // Update Yjs with the new content
                ytext.doc?.transact(() => {
                  ytext.delete(0, ytext.length);
                  if (currentContent) {
                    ytext.insert(0, currentContent);
                  }
                }, localEditorView);
                
                // Notify parent component of changes
                if (onChange) {
                  onChange(currentContent);
                }
              }
            }
          })
        ];

        // Create the editor
        localEditorView = mod.createEditorView({
          parent: editorRef.current,
          doc: ytext.toString(),
          language,
          // Remove the direct onChange handler to prevent loops
          // All changes are now handled by the updateListener
          tabSize,
          autocomplete: false, // Keep autocomplete disabled for now
          extensions,
        });
        
        // Initial sync with Yjs
        if (ytext.toString() !== localEditorView.state.doc.toString()) {
          const transaction = localEditorView.state.update({
            changes: {
              from: 0,
              to: localEditorView.state.doc.length,
              insert: ytext.toString()
            }
          });
          localEditorView.dispatch(transaction);
        }

        viewRef.current = localEditorView;
        setEditorView(localEditorView);
        
        // Set initial focus without scrolling
        requestAnimationFrame(() => {
          if (localEditorView) {
            localEditorView.focus();
            // Set cursor to the end of the document
            const docLength = localEditorView.state.doc.length;
            localEditorView.dispatch({
              selection: { anchor: docLength },
              scrollIntoView: true
            });
          }
        });
        // Awareness updates
        const handleAwarenessUpdate = () => {
          const states = yProvider.awareness.getStates();
          const usersMap = new Map<number, User>();
          states.forEach((state: any, clientId: number) => {
            if (state.user) {
              usersMap.set(clientId, {
                ...state.user,
                clientId,
              });
            }
          });
          setUsers(usersMap);
          if (onUsersChange) onUsersChange(usersMap);
        };
        yProvider.awareness.on('change', handleAwarenessUpdate);
        handleAwarenessUpdate();
        // Cleanup for listeners only
        cleanupCollaboration = () => {
          yProvider.awareness.off('change', handleAwarenessUpdate);
        };
      });
    }
    // Clean up on unmount or dependency change
    return () => {
      if (yProvider && handleYjsUpdate) {
        const ydoc = yProvider.getYDoc();
        const ytext = ydoc.getText('codemirror');
        try {
          ytext.unobserve(handleYjsUpdate);
        } catch (e) {
          console.warn('Failed to unobserve Yjs update handler:', e);
        }
      }
      if (cleanupCollaboration) {
        cleanupCollaboration();
      }
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      handleYjsUpdate = null;
    };
  }, [room, yProvider, currentUser.name, currentUser.color, language, onChange, tabSize, autocomplete, value, onUsersChange]);


  // Live update tabSize and autocomplete settings
  useEffect(() => {
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
  }, [tabSize, autocomplete]);

  // Removed global tab key handler - CodeMirror handles tab natively

  return (
    <div 
      key={`editor-container-${roomId}`}
      style={{ 
        position: 'relative', 
        height: '100%', 
        width: '100%' 
      }}
    >
      <div 
        ref={editorRef} 
        style={{ 
          height: '100%', 
          width: '100%' 
        }} 
      />
      {editorView && <UndoRedoControls view={editorView} />}
    </div>
  );

};

export default CodeMirrorEditor;
