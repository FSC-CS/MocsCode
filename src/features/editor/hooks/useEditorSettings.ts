import { useState, useCallback, useEffect, useRef } from 'react';
import type { EditorSettings } from '../types';

interface UseEditorSettingsReturn extends EditorSettings {
  setTabSize: (size: number) => void;
  setAutocomplete: (enabled: boolean) => void;
  setSyntaxTheme: (theme: string) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  updateEditorRef: (ref: any) => void;
}

export function useEditorSettings(
  initialSettings: Partial<EditorSettings> = {}
): UseEditorSettingsReturn {
  const [tabSize, setTabSize] = useState(initialSettings.tabSize ?? 4);
  const [autocomplete, setAutocomplete] = useState(initialSettings.autocomplete ?? true);
  const [syntaxTheme, setSyntaxTheme] = useState(initialSettings.syntaxTheme ?? 'default');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const editorRef = useRef<any>(null);

  const updateEditorRef = useCallback((ref: any) => {
    editorRef.current = ref;
  }, []);

  // Sync settings with editor when they change
  useEffect(() => {
    if (editorRef.current?.updateSettings) {
      editorRef.current.updateSettings({
        tabSize,
        autocomplete,
        syntaxTheme,
      });
    }
  }, [tabSize, autocomplete, syntaxTheme]);

  return {
    tabSize,
    setTabSize,
    autocomplete,
    setAutocomplete,
    syntaxTheme,
    setSyntaxTheme,
    settingsOpen,
    setSettingsOpen,
    updateEditorRef,
  };
}
