import React from 'react';
import { Play, Share, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditorSettingsPopover } from './EditorSettingsPopover';
import type { UserRole } from '../types';

interface EditorToolbarProps {
  // Settings
  tabSize: number;
  setTabSize: (size: number) => void;
  autocomplete: boolean;
  setAutocomplete: (enabled: boolean) => void;
  syntaxTheme: string;
  setSyntaxTheme: (theme: string) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  
  // Actions
  currentUserRole: UserRole;
  isRunning: boolean;
  onRunCode: () => void;
  onShare: () => void;
  onSave: () => void;
  canManageMembers: boolean;
}

export function EditorToolbar({
  tabSize,
  setTabSize,
  autocomplete,
  setAutocomplete,
  syntaxTheme,
  setSyntaxTheme,
  settingsOpen,
  setSettingsOpen,
  currentUserRole,
  isRunning,
  onRunCode,
  onShare,
  onSave,
  canManageMembers,
}: EditorToolbarProps) {
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor';

  return (
    <>
      {/* Editor Settings Dropdown */}
      <EditorSettingsPopover
        tabSize={tabSize}
        setTabSize={setTabSize}
        autocomplete={autocomplete}
        setAutocomplete={setAutocomplete}
        syntaxTheme={syntaxTheme}
        setSyntaxTheme={setSyntaxTheme}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
      />

      {/* Run button - only for editors and owners */}
      {canEdit && (
        <Button
          onClick={onRunCode}
          disabled={isRunning}
          className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
        >
          <Play className="h-4 w-4 sm:mr-2 flex-shrink-0" />
          <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Run Code'}</span>
        </Button>
      )}
      
      {/* Share button - only for members who can manage */}
      {canManageMembers && (
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
          onClick={onShare}
        >
          <Share className="h-4 w-4 sm:mr-2 flex-shrink-0" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      )}

      {/* Save button - for editors and owners */}
      {canEdit && (
        <Button
          onClick={(e) => {
            e.preventDefault();
            onSave();
          }}
          variant="outline"
          className="border-gray-600 text-gray-600 hover:bg-gray-700 hover:text-white px-3 sm:px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
        >
          <Check className="h-4 w-4 sm:mr-2 flex-shrink-0" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      )}
    </>
  );
}
