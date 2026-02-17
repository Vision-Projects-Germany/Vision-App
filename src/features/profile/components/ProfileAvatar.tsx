import React, { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

interface ProfileAvatarProps {
  photoURL: string | null;
  displayName: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onUpload?: (fileUrl: string) => void;
}

const sizeClasses = {
  sm: 'w-12 h-12 text-lg',
  md: 'w-16 h-16 text-2xl',
  lg: 'w-24 h-24 text-4xl',
  xl: 'w-32 h-32 text-5xl',
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  photoURL,
  displayName,
  size = 'lg',
  editable = false,
  onUpload,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleAvatarClick = async () => {
    if (!editable) return;

    try {
      setIsUploading(true);
      
      // Use Tauri dialog to select file
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
        }]
      });

      if (selected && typeof selected === 'string') {
        // Convert the file path to a URL that can be used in the app
        const fileUrl = convertFileSrc(selected);
        
        if (onUpload) {
          onUpload(fileUrl);
        }
      }
    } catch (error) {
      console.error('Error selecting avatar:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-[#50fa7b] bg-surface-2 flex items-center justify-center font-semibold transition-all duration-300 ${
          editable ? 'cursor-pointer hover:border-[#3dff7d] hover:opacity-90' : ''
        } ${isUploading ? 'opacity-50' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleAvatarClick}
      >
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName || 'User avatar'}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <span className="text-muted select-none">{getInitials(displayName)}</span>
        )}
        
        {editable && isHovered && !isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <i className="fas fa-camera text-white text-xl"></i>
          </div>
        )}
        
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <i className="fas fa-spinner fa-spin text-white text-xl"></i>
          </div>
        )}
      </div>

      {editable && (
        <button
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          onClick={handleAvatarClick}
          disabled={isUploading}
        >
          <i className="fas fa-pen text-xs"></i>
        </button>
      )}
    </div>
  );
};
