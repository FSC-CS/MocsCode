import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X as XIcon, ArrowLeft, Play, Share, Settings } from 'lucide-react';
import { FaSave } from 'react-icons/fa';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface EditorToolbarProps {
  project: any;
  isRenaming: boolean;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  setIsRenaming: (renaming: boolean) => void;
  handleRenameProject: () => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
  canManageProject: () => boolean;
  currentUserRole: 'owner' | 'editor' | 'viewer' | null;
  tabSize: number;
  setTabSize: (size: number) => void;
  autocomplete: boolean;
  setAutocomplete: (val: boolean) => void;
  runCode: () => void;
  isRunning: boolean;
  saveCurrentFile: () => void;
  setShowShareDialog: (show: boolean) => void;
  onBack: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  project,
  isRenaming,
  newProjectName,
  setNewProjectName,
  setIsRenaming,
  handleRenameProject,
  handleRenameKeyDown,
  canManageProject,
  currentUserRole,
  tabSize,
  setTabSize,
  autocomplete,
  setAutocomplete,
  runCode,
  isRunning,
  saveCurrentFile,
  setShowShareDialog,
  onBack,
}) => {
  return (
    <div className="flex items-center justify-between w-full">
  <div className="flex items-center space-x-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mr-2 text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {isRenaming ? (
          <div className="flex items-center space-x-2">
            <Input
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              autoFocus
              className="w-48 text-lg font-semibold bg-gray-800 text-white border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-500 hover:bg-green-100"
              onClick={handleRenameProject}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-red-500 hover:bg-red-100"
              onClick={() => setIsRenaming(false)}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center group">
            <h1 className="text-lg font-semibold text-white">{project?.name}</h1>
            {canManageProject() && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white hover:bg-gray-700"
                onClick={() => {
                  setNewProjectName(project.name);
                  setIsRenaming(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
        <Badge className="bg-orange-100 text-orange-800">{project?.language}</Badge>
        {currentUserRole && (
          <Badge variant="outline" className="text-gray-300 border-gray-500">
            {currentUserRole === 'owner' ? 'Owner' : 
             currentUserRole === 'editor' ? 'Editor' : 'Viewer'}
          </Badge>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-2 text-gray-400 hover:text-white hover:bg-gray-700"
              aria-label="Editor Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-4">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Editor Settings</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="tab-size">Tab Size</Label>
                <select
                  id="tab-size"
                  value={tabSize}
                  onChange={e => setTabSize(Number(e.target.value))}
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={8}>8 spaces</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="autocomplete">Autocomplete</Label>
                <Switch
                  id="autocomplete"
                  checked={autocomplete}
                  onCheckedChange={setAutocomplete}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center space-x-3">
        {(currentUserRole === 'owner' || currentUserRole === 'editor') && (
          <Button
            onClick={runCode}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Code'}
          </Button>
        )}
        {canManageProject() && (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowShareDialog(true)}
          >
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
        {(currentUserRole === 'owner' || currentUserRole === 'editor') && (
          <Button
            onClick={saveCurrentFile}
            variant="outline"
            className="border-gray-600 text-gray-600 hover:bg-gray-700 hover:text-white"
          >
            <FaSave className="h-4 w-4 mr-2" />
            Save
          </Button>
        )}
      </div>
</div>
  );
};

export default EditorToolbar;
