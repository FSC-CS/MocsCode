import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

import { useApi } from '@/contexts/ApiContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UserAvatarProps {
  avatar_url: string | null;
  fallbackInitials?: string;
  fallbackColor?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function UserAvatar({
  avatar_url,
  fallbackInitials = 'U',
  fallbackColor,
  className = '',
  size = 'md',
}: UserAvatarProps) {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(!!avatar_url);
  // Generate a consistent color based on the fallback string
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return 'hsl(221 83.2% 53.3%)';
  };
  const backgroundColor = fallbackColor || stringToColor(fallbackInitials);

  // Resolve avatar image (with signed URL if needed)
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!avatar_url) {
      setSignedUrl(null);
      return;
    }
    if (avatar_url.startsWith('http')) {
      setSignedUrl(avatar_url);
      return;
    }
    // Supabase storage path
    let cancelled = false;
    supabase.storage
      .from('avatar-images')
      .createSignedUrl(avatar_url, 60 * 60 * 24 * 365)
      .then(({ data: signed, error }) => {
        if (!cancelled) {
          setSignedUrl(signed?.signedUrl || null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [avatar_url]);

  const imageSrc = signedUrl && !hasError ? signedUrl : undefined;

  // Handler for image load
  const handleImageLoad = () => setIsLoading(false);
  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {imageSrc && !hasError && (
        <AvatarImage
          src={imageSrc}
          alt={fallbackInitials}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      <AvatarFallback
        className={
          `text-white font-medium flex items-center justify-center ` +
          (isLoading ? 'bg-neutral-300' : '')
        }
        style={isLoading ? undefined : { backgroundColor }}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-label="Loading avatar" />
        ) : (
          <User size={18} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
