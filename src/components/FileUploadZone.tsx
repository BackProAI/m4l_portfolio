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
  pastedContent: string;
  onPastedContentChange: (content: string) => void;
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
  pastedContent,
  onPastedContentChange,
  disabled = false,
  maxFiles = 1,
  maxSizeMB = 10,
}: FileUploadZoneProps) {
  const [error, setError] = React.useState<string>('');
  
  // Mutual exclusivity validation
  const hasFiles = files.length > 0;
  const hasPastedContent = pastedContent.trim().length > 0;
  const hasConflict = hasFiles && hasPastedContent;

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
    <div className="space-y-6">
      {/* Drag & Drop Section */}
      <div className="space-y-4">
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
                ${
                  disabled || hasPastedContent
                    ? 'opacity-50 cursor-not-allowed pointer-events-none'
                    : ''
                }
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
                    : hasPastedContent
                    ? 'Drag & drop disabled (using pasted content)'
                    : 'Drag & drop your portfolio documents here'}
                </p>
                {!hasPastedContent && (
                  <p className="text-sm text-neutral-500 mt-1">
                    or{' '}
                    <span className="text-primary font-medium">
                      click to browse
                    </span>
                  </p>
                )}
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
                            ? file.isScanned 
                              ? 'Ready (OCR)'
                              : 'Ready'
                            : file.status === 'processing'
                            ? file.isScanned
                              ? 'Analyzing scanned PDF...'
                              : 'Processing...'
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

      {/* OR Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-xl font-bold text-neutral-500">OR</span>
        </div>
      </div>

      {/* Copy & Paste Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900">Copy & Paste Portfolio Data</h3>
                <p className="text-sm text-neutral-600">Paste your portfolio information directly from a PDF or document</p>
              </div>
            </div>
            
            <textarea
              value={pastedContent}
              onChange={(e) => onPastedContentChange(e.target.value)}
              disabled={disabled || hasFiles}
              placeholder="Paste your portfolio data here (copied from PDF, Word, Excel, etc.)..."
              className={`w-full min-h-[200px] px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y ${
                hasFiles ? 'bg-neutral-100 cursor-not-allowed' : 'bg-white border-neutral-300'
              }`}
            />
            
            {hasPastedContent && !hasConflict && (
              <div className="flex items-center gap-2 text-sm text-success">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Content ready for analysis ({pastedContent.length.toLocaleString()} characters)</span>
              </div>
            )}
            
            {hasPastedContent && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPastedContentChange('')}
                disabled={disabled}
              >
                Clear Pasted Content
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conflict Error Alert */}
      {hasConflict && (
        <Alert variant="error" title="Cannot use both methods">
          Please use either drag & drop OR copy & paste, not both. Clear one method before proceeding.
        </Alert>
      )}
      
      {/* Upload Error Alert */}
      {error && !hasConflict && (
        <Alert variant="error" title="Upload Error">
          {error}
        </Alert>
      )}
    </div>
  );
}
