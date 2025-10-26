import { useState, useRef, DragEvent } from 'react';
import { Button } from './ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

// handlers for drag-and-drop functionality
const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  if (!disabled) {
    setIsDragging(true);
  }
};

// reset "dragging" UI state when pointer leaves the drop zone
const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  setIsDragging(false);
};

// stops the browser’s default “open this file” behavior on drop, clear dragging state
// and pick the first dropped file to send to handleFile
const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  setIsDragging(false);
  if (disabled) return;

  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    handleFile(files[0]);
  }
};

// when user selects via picker, send first file to handleFile
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
};
// validate type/size
const handleFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    toast.error('Please select an image file');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Image size must be less than 5MB');
    return;
  }
//upload then convert to base64 data URL 
  setIsUploading(true);
  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onChange(result);
      toast.success('Image uploaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file); 
  } catch (error) {
    console.log(`Error uploading image: ${error}`);
    toast.error('Failed to upload image');
  } finally {
    setIsUploading(false);
  }
};

// clear current image and reset hidden input element
const handleRemove = () => {
  onChange('');
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};

// if we already have a value, show the preview with a remove button.
// otherwise render a drag-and-drop target that also opens the hidden file picker on click.
return (
  <div>
    {value ? (
      <div className="relative">
        <img
          src={value}
          alt="Upload preview"
          className="w-full h-64 object-cover rounded-lg border border-gray-200"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute top-2 right-2"
          onClick={handleRemove}
          disabled={disabled}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    ) : (
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              {isDragging ? (
                <Upload className="w-6 h-6 text-blue-600" />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-gray-700">
                {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>
    )}
  </div>
);
}