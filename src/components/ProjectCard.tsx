import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollaboratorAvatar {
  id: string;
  initials: string;
  color: string;
  name?: string;
  email?: string;
}

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    language: string;
    last_modified: string;
    collaborators: number;
    is_owner?: boolean;
    description?: string;
    collaborator_avatars?: CollaboratorAvatar[];
    initials?: string;
    color?: string;
  };
  onOpen: (project: any) => void;
  onDelete?: (projectId: string) => Promise<void>;
  onLeave?: (projectId: string) => Promise<void>;
  isDeleting?: boolean;
  currentDeletingId?: string | null;
  isLeaving?: boolean;
  currentLeavingId?: string | null;
}

const getLanguageColor = (language: string) => {
  const colors: { [key: string]: string } = {
    'Java': 'bg-orange-100 text-orange-800',
    'JavaScript': 'bg-yellow-100 text-yellow-800',
    'Python': 'bg-blue-100 text-blue-800',
    'C': 'bg-gray-100 text-gray-800',
    'C++': 'bg-purple-100 text-purple-800',
    'C#': 'bg-green-100 text-green-800'
  };
  return colors[language] || 'bg-gray-100 text-gray-800';
};

const generateInitials = (name: string) => {
  const words = name.trim().split(' ');
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
};

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onOpen, 
  onDelete,
  onLeave,
  isDeleting = false,
  currentDeletingId = null,
  isLeaving = false,
  currentLeavingId = null
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      await onDelete(project.id);
    }
  };

  const handleLeaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLeave && window.confirm(`Are you sure you want to leave "${project.name}"?`)) {
      await onLeave(project.id);
    }
  };

  const hasCollaborators = Array.isArray(project.collaborator_avatars) && project.collaborator_avatars.length > 0;
  const avatars = hasCollaborators ? project.collaborator_avatars.slice(0, 3) : [];
  const extraAvatars = hasCollaborators ? Math.max(0, project.collaborator_avatars.length - 3) : 0;

  return (
    <Card
      className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 hover:border-blue-300 flex flex-col min-h-[200px] relative group"
      onClick={() => onOpen(project)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      aria-label={`Project: ${project.name}`}
      role="button"
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(project); }}
    >
      <div className="absolute top-2 right-2 flex space-x-1">
        {onLeave && !project.is_owner && (
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
              isLeaving && currentLeavingId === project.id ? 'opacity-100' : ''
            }`}
            onClick={handleLeaveClick}
            disabled={isLeaving && currentLeavingId === project.id}
            aria-label={`Leave project ${project.name}`}
          >
            {isLeaving && currentLeavingId === project.id ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              'Leave'
            )}
          </Button>
        )}
        {project.is_owner && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
              isDeleting && currentDeletingId === project.id ? 'opacity-100' : ''
            }`}
            onClick={handleDeleteClick}
            disabled={isDeleting && currentDeletingId === project.id}
            aria-label={`Delete project ${project.name}`}
          >
            {isDeleting && currentDeletingId === project.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
            )}
          </Button>
        )}
      </div>

      <div className="flex justify-between items-start mb-4">
        <h4 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1 leading-tight line-clamp-2">
          {project.name}
        </h4>
        {project.is_owner && (
          <Badge variant="secondary" className="text-xs">Owner</Badge>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="space-y-3 mt-auto">
        <Badge className={`${getLanguageColor(project.language)} text-xs font-medium`}>
          {project.language}
        </Badge>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasCollaborators ? (
              <>
                <div className="flex -space-x-1">
                  {avatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white shadow-sm hover:shadow-md transition-shadow"
                      style={{ 
                        backgroundColor: avatar.color,
                        cursor: 'help'
                      }}
                      title={avatar.name || `User ${avatar.initials}`}
                      aria-label={`Avatar for ${avatar.name || avatar.email || 'user'}`}
                    >
                      {avatar.initials}
                    </div>
                  ))}
                  {extraAvatars > 0 && (
                    <div 
                      className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 border-2 border-white shadow-sm"
                      title={`${extraAvatars} more collaborator${extraAvatars > 1 ? 's' : ''}`}
                    >
                      +{extraAvatars}
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {project.collaborators} collaborator{project.collaborators !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <div className="text-sm text-gray-500">
                
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">{project.last_modified}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
