import React, { useState, useEffect, useRef } from 'react';

interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  label?: string;
  className?: string;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  placeholder = 'Click to edit',
  multiline = false,
  maxLength,
  label,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline) {
        const textarea = inputRef.current as HTMLTextAreaElement;
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }
  }, [isEditing, multiline]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isEditing) {
    return (
      <div className={`group ${className}`}>
        {label && (
          <label className="block text-xs uppercase tracking-[0.2em] text-muted mb-2">
            {label}
          </label>
        )}
        <div
          className="cursor-pointer hover:bg-white/5 px-3 py-2 rounded-lg transition-colors relative"
          onClick={() => setIsEditing(true)}
        >
          <p className={`${multiline ? 'whitespace-pre-wrap' : 'truncate'} ${!value ? 'text-muted italic' : ''}`}>
            {value || placeholder}
          </p>
          <i className="fas fa-pen absolute top-2 right-2 text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs uppercase tracking-[0.2em] text-muted mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-surface-2 border border-accent/30 rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none min-h-[100px]"
            rows={4}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-surface-2 border border-accent/30 rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        )}
        {maxLength && (
          <span className="absolute bottom-2 right-2 text-xs text-muted">
            {editValue.length}/{maxLength}
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <i className="fas fa-check mr-1"></i>
          Save
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-1.5 bg-surface-2 text-foreground rounded-lg text-sm font-medium hover:bg-surface/80 transition-colors"
        >
          <i className="fas fa-times mr-1"></i>
          Cancel
        </button>
      </div>
      {multiline && (
        <p className="text-xs text-muted mt-1">Press Ctrl+Enter to save, Esc to cancel</p>
      )}
    </div>
  );
};
