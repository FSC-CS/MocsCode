import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function UserAvatar({ 
  src, 
  name, 
  email, 
  className = '',
  size = 'md' 
}: UserAvatarProps) {
  const [hasError, setHasError] = React.useState(false);
  const displayName = name || email?.split('@')[0] || 'U';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate a consistent color based on the user's name or email
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  };

  const backgroundColor = stringToColor(displayName);

  // Don't try to load the image if we've already had an error
  const imageSrc = src && !hasError ? src : undefined;

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {imageSrc ? (
        <AvatarImage 
          src={imageSrc} 
          alt={name || ''}
          onError={() => setHasError(true)}
        />
      ) : null}
      <AvatarFallback 
        className="text-white font-medium flex items-center justify-center"
        style={{ backgroundColor }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
