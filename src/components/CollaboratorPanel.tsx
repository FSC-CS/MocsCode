
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Crown, Eye, Edit } from 'lucide-react';

interface Collaborator {
  id: number;
  name: string;
  color: string;
  cursor: { line: number; column: number } | null;
  isTyping: boolean;
}

interface CollaboratorPanelProps {
  collaborators: Collaborator[];
}

const CollaboratorPanel = ({ collaborators }: CollaboratorPanelProps) => {
  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Collaborators</h3>
        
        {/* Current User */}
        <Card className="p-3 bg-gray-700 border-gray-600 mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-white">You</span>
                <Crown className="h-3 w-3 text-yellow-400" />
              </div>
              <span className="text-xs text-gray-400">Project Owner</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {collaborators.map((collaborator) => (
          <Card key={collaborator.id} className="p-3 bg-gray-700 border-gray-600">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: collaborator.color }}
              >
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white">{collaborator.name}</span>
                  {collaborator.isTyping && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      Typing...
                    </Badge>
                  )}
                </div>
                {collaborator.cursor && (
                  <span className="text-xs text-gray-400">
                    Line {collaborator.cursor.line}, Col {collaborator.cursor.column}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <Badge 
                variant="outline" 
                className="text-xs border-gray-500 text-gray-300"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit Access
              </Badge>
              
              <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-400 hover:text-white">
                Manage
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          Invite Collaborator
        </Button>
      </div>
    </div>
  );
};

export default CollaboratorPanel;
