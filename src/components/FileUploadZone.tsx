'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import type { UploadedFile, FileType, UploadStatus } from '@/types';

// ============================================================================
// FileUploadZone Component - Drag & Drop for portfolio documents
// ============================================================================

export interface FileUploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
};

export function FileUploadZone({
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 1,
  maxSizeMB = 10,
}: FileUploadZoneProps) {
  const [error, setError] = React.useState<string>('');

  // Determine file type from file
  const getFileType = (file: File): FileType | null => {
    const ext = file.name.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'pdf' as FileType;
      case 'docx':
        return 'docx' as FileType;
      case 'xlsx':
        return 'xlsx' as FileType;
      case 'xls':
        return 'xls' as FileType;
      default:
        return null;
    }
  };

  // Handle file drops
  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError('');

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const reasons = rejectedFiles.map((f) => {
          if (f.errors[0]?.code === 'file-too-large') {
            return `${f.file.name} is too large (max ${maxSizeMB}MB)`;
          }
          if (f.errors[0]?.code === 'file-invalid-type') {
            return `${f.file.name} is not a supported file type`;
          }
          return `${f.file.name} was rejected`;
        });
        setError(reasons.join('; '));
        return;
      }

      // Check max files limit
      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Process accepted files
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => {
        const fileType = getFileType(file);
        
        return {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          type: fileType || ('pdf' as FileType),
          status: 'pending' as UploadStatus,
          metadata: {
            size: file.size,
          },
        };
      });

      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange, maxFiles, maxSizeMB]
  );

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled,
    multiple: true,
  });

  // Remove file
  const removeFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file icon based on type
  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'docx':
        return '📝';
      case 'xlsx':
      case 'xls':
        return '📊';
      default:
        return '📎';
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card>
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`
              relative p-8 border-2 border-dashed rounded-xl cursor-pointer
              transition-all duration-200 ease-in-out
              ${
                isDragActive
                  ? 'border-primary bg-primary-50 scale-[1.02]'
                  : 'border-border hover:border-primary-400 hover:bg-background-tertiary'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center justify-center text-center space-y-4">
              {/* Upload Icon */}
              <div
                className={`
                w-16 h-16 rounded-full flex items-center justify-center
                transition-colors
                ${
                  isDragActive
                    ? 'bg-primary text-white'
                    : 'bg-primary-100 text-primary'
                }
              `}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>

              {/* Text */}
              <div>
                <p className="text-lg font-medium text-neutral-800">
                  {isDragActive
                    ? 'Drop your files here'
                    : 'Drag & drop your portfolio documents here'}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  or{' '}
                  <span className="text-primary font-medium">
                    click to browse
                  </span>
                </p>
              </div>

              {/* File types */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="default" size="sm">
                  PDF
                </Badge>
                <Badge variant="default" size="sm">
                  Word (.docx)
                </Badge>
                <Badge variant="default" size="sm">
                  Excel (.xlsx)
                </Badge>
              </div>

              {/* Limits */}
              <p className="text-xs text-neutral-500">
                Maximum {maxFiles} file{maxFiles > 1 ? 's' : ''} • {maxSizeMB}MB per file
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Upload Error">
          {error}
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-800">
            Uploaded File{files.length > 1 ? 's' : ''} ({files.length}/{maxFiles})
          </h3>

          {files.map((file) => (
            <Card key={file.id} variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0 text-3xl">
                    {getFileIcon(file.type)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {file.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-neutral-500">
                        {formatFileSize(file.metadata?.size || 0)}
                      </p>
                      <Badge
                        variant={
                          file.status === 'completed'
                            ? 'success'
                            : file.status === 'error'
                            ? 'error'
                            : file.status === 'processing'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {file.status === 'completed'
                          ? 'Ready'
                          : file.status === 'processing'
                          ? 'Processing...'
                          : file.status === 'error'
                          ? 'Error'
                          : 'Pending'}
                      </Badge>
                    </div>
                    {file.error && (
                      <p className="text-xs text-error mt-1">{file.error}</p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={disabled}
                    className="flex-shrink-0"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
