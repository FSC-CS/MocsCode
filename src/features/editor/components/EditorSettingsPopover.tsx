import React from 'react';
import { Settings, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface EditorSettingsPopoverProps {
  tabSize: number;
  setTabSize: (size: number) => void;
  autocomplete: boolean;
  setAutocomplete: (enabled: boolean) => void;
  syntaxTheme: string;
  setSyntaxTheme: (theme: string) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

export function EditorSettingsPopover({
  tabSize,
  setTabSize,
  autocomplete,
  setAutocomplete,
  syntaxTheme,
  setSyntaxTheme,
  settingsOpen,
  setSettingsOpen,
}: EditorSettingsPopoverProps) {
  return (
    <div className="flex-shrink-0">
      <Popover onOpenChange={setSettingsOpen} open={settingsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
            aria-label="Editor Settings"
            onClick={(e) => {
              e.preventDefault();
              setSettingsOpen(!settingsOpen);
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          align="end" 
          className="w-56 p-4"
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[aria-label="Editor Settings"]')) {
              e.preventDefault();
            }
          }}
        >
          <div className="space-y-4">
            <h4 className="font-medium leading-none">Editor Settings</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="tab-size">Tab Size</Label>
              <select
                id="tab-size"
                value={tabSize}
                onChange={(e) => setTabSize(Number(e.target.value))}
                className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
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
                onCheckedChange={(checked) => {
                  setAutocomplete(checked);
                }}
                className="data-[state=checked]:bg-blue-600"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="syntax-theme">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>Syntax Theme</span>
                </div>
              </Label>
              <select
                id="syntax-theme"
                value={syntaxTheme}
                onChange={(e) => setSyntaxTheme(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="default">Default</option>
                <option value="dracula">Dracula</option>
                <option value="solarized-light">Solarized Light</option>
                <option value="monokai">Monokai</option>
              </select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
