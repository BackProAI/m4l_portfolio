'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { QuestionnaireSection } from '@/components/QuestionnaireSection';
import { FileUploadZone } from '@/components/FileUploadZone';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { PortfolioCharts } from '@/components/PortfolioCharts';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import type { InvestorProfile, UploadedFile, AnalysisResult } from '@/types';
import { parseFile } from '@/lib/fileParser';
import { generatePortfolioPDF } from '@/lib/pdfGeneratorV2';

export default function Home() {
  // State for investor profile
  const [profile, setProfile] = useState<InvestorProfile>({
    name: '',
    investorType: '',
    phase: '',
    ageRange: '',
    fundCommentary: undefined,
    includeRiskSummary: undefined,
    isIndustrySuperFund: undefined,
    industrySuperFundName: undefined,
    industrySuperFundRiskProfile: undefined,
  });

  const [isQuestionnaireComplete, setIsQuestionnaireComplete] = useState(false);
  
  // State for uploaded files
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for pasted content (alternative to file upload)
  const [pastedContent, setPastedContent] = useState<string>('');

  // State for analysis results
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<number | undefined>(undefined);
  const [analysisProgressLabel, setAnalysisProgressLabel] = useState<string | undefined>(undefined);

  // State for PDF download
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Handle file changes and auto-parse
  const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    
    // Find files that need parsing (status = 'pending' and no parsedContent)
    const filesToParse = newFiles.filter(
      (f) => f.status === 'pending' && !f.parsedContent
    );
    
    if (filesToParse.length === 0) return;
    
    setIsProcessing(true);
    
    // Parse each file
    const updatedFiles = [...newFiles];
    
    for (const fileToProcess of filesToParse) {
      const index = updatedFiles.findIndex((f) => f.id === fileToProcess.id);
      
      if (index === -1) continue;
      
      // Update status to processing with appropriate message
      updatedFiles[index] = {
        ...updatedFiles[index],
        status: 'processing',
      };
      setFiles([...updatedFiles]);
      
      try {
        // Parse the file (returns { text, isScanned?, base64Data? })
        const result = await parseFile(fileToProcess.file, fileToProcess.type);
        
        // Update with parsed content
        updatedFiles[index] = {
          ...updatedFiles[index],
          status: 'completed',
          parsedContent: result.text,
          isScanned: result.isScanned,
          base64Data: result.base64Data,
        };
      } catch (error) {
        // Update with error
        updatedFiles[index] = {
          ...updatedFiles[index],
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to parse file',
        };
      }
      
      setFiles([...updatedFiles]);
    }
    
    setIsProcessing(false);

    // Scroll to analyze button after file upload completes
    const allCompleted = updatedFiles.every((f) => f.status === 'completed');
    if (allCompleted && updatedFiles.length > 0) {
      setTimeout(() => {
        document.getElementById('analyse-button-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, []);

  // Check if ready to analyse
  const hasFiles = files.length > 0 && files.every((f) => f.status === 'completed');
  const hasPastedContent = pastedContent.trim().length > 0;
  const hasConflict = hasFiles && hasPastedContent;
  
  const canAnalyse = isQuestionnaireComplete && (hasFiles || hasPastedContent) && !hasConflict;

  // Auto-scroll to file upload when questionnaire is complete
  useEffect(() => {
    if (isQuestionnaireComplete) {
      setTimeout(() => {
        document.getElementById('file-upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [isQuestionnaireComplete]);

  // Handle analysis submission
  const handleAnalyse = async () => {
    setIsAnalysing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalysisProgress(undefined);
    setAnalysisProgressLabel(undefined);

    // Scroll to loading animation
    setTimeout(() => {
      document.getElementById('loading-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      // Prepare request payload
      let documentsToSend;

      if (hasPastedContent) {
        documentsToSend = [
          {
            fileName: 'pasted-content.txt',
            content: pastedContent,
            type: 'docx' as const, // Use docx type for plain text to avoid OCR processing
          },
        ];
      } else {
        documentsToSend = files.map((f) => ({
          fileName: f.file.name,
          content: f.parsedContent || '',
          type: f.type,
          // Include scanned PDF data for OCR processing
          isScanned: f.isScanned,
          base64Data: f.base64Data,
        }));
      }

      const requestData = { profile, files: documentsToSend };

      // Open SSE stream
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as any).error || 'Analysis failed');
      }

      // Read Server-Sent Events
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      let totalBytesReceived = 0;

      console.log('[Client] 🚀 SSE STREAM START:', {
        timestamp: Date.now(),
        responseOk: response.ok,
        status: response.status
      });

      while (true) {
        const { done, value } = await reader.read();
        
        if (value) {
          chunkCount++;
          totalBytesReceived += value.length;
          console.log('[Client] 📦 CHUNK RECEIVED:', {
            chunkNumber: chunkCount,
            chunkBytes: value.length,
            totalBytes: totalBytesReceived,
            timestamp: Date.now()
          });
        }
        
        if (done) {
          console.log('[Client] ✅ STREAM DONE:', {
            timestamp: Date.now(),
            totalChunks: chunkCount,
            totalBytesReceived,
            bufferRemaining: buffer.length,
            bufferContent: buffer.substring(0, 200)
          });
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        console.log('[Client] 📝 BUFFER UPDATE:', {
          bufferLength: buffer.length,
          bufferSizeKB: (buffer.length / 1024).toFixed(2),
          timestamp: Date.now()
        });

        // SSE lines are delimited by "\n\n"
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? ''; // keep incomplete tail

        console.log('[Client] ✂️ SPLIT BUFFER:', {
          messageParts: parts.length,
          remainingBuffer: buffer.length,
          timestamp: Date.now()
        });

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          console.log('[Client] 🔍 PARSING MESSAGE:', {
            lineLength: line.length,
            preview: line.substring(0, 100),
            timestamp: Date.now()
          });

          let event: any;
          try {
            event = JSON.parse(line.slice(6));
            console.log('[Client] ✅ PARSED EVENT:', {
              type: event.type,
              timestamp: Date.now()
            });
          } catch (parseError) {
            console.error('[Client] ❌ JSON PARSE ERROR:', {
              error: parseError,
              lineLength: line.length,
              linePreview: line.substring(0, 200),
              lineSuffix: line.substring(Math.max(0, line.length - 200)),
              timestamp: Date.now()
            });
            continue;
          }

          if (event.type === 'progress') {
            const pct = Math.round((event.step / event.total) * 100);
            console.log('[Client] ⏳ PROGRESS UPDATE:', {
              step: event.step,
              total: event.total,
              percent: pct,
              label: event.label
            });
            setAnalysisProgress(pct);
            setAnalysisProgressLabel(event.label ?? undefined);
          } else if (event.type === 'result') {
            console.log('[Client] 🎉 RESULT RECEIVED:', {
              timestamp: Date.now(),
              dataKeys: Object.keys(event.data.analysis),
              hasMarkdown: !!event.data.analysis.markdown,
              hasChartData: !!event.data.analysis.chartData,
              markdownLength: event.data.analysis.markdown?.length,
              chartDataKeys: event.data.analysis.chartData ? Object.keys(event.data.analysis.chartData) : [],
              totalSize: JSON.stringify(event.data).length,
              totalSizeKB: (JSON.stringify(event.data).length / 1024).toFixed(2)
            });
            setAnalysisResult(event.data.analysis);
            setAnalysisProgress(100);
            setTimeout(() => {
              document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          } else if (event.type === 'error') {
            console.error('[Client] ❌ ERROR EVENT:', {
              error: event.error,
              timestamp: Date.now()
            });
            throw new Error(event.error || 'Analysis failed');
          }
        }
      }
    } catch (error) {
      console.error('[Client] 💥 ANALYSIS ERROR:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
      setAnalysisError(
        error instanceof Error ? error.message : 'Failed to analyse portfolio. Please try again.'
      );
    } finally {
      setIsAnalysing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <img 
            src="/logo.png" 
            alt="BackPro AI" 
            className="mx-auto mb-6 h-32 w-auto"
          />
          <h1 className="text-4xl font-bold text-primary mb-2">
            AI Portfolio Analysis Tool
          </h1>
          <p className="text-neutral-500 text-lg">
            Powered by BackPro
          </p>
        </div>

        {/* Questionnaire Section */}
        <QuestionnaireSection
          profile={profile}
          onChange={setProfile}
          onComplete={setIsQuestionnaireComplete}
        />

        {/* File Upload Section */}
        {isQuestionnaireComplete && (
          <Card id="file-upload-section">
            <CardHeader>
              <CardTitle>Upload Portfolio Document</CardTitle>
              <CardDescription>
                Upload your portfolio statement, fund report, or investment document 
                (PDF, Word, or Excel file)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Important Warning */}
              <div className="border-l-4 border-warning bg-warning/10 p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <div className="text-warning text-2xl flex-shrink-0 mt-0.5">⚠️</div>
                  <div className="space-y-3 flex-1">
                    <h3 className="font-bold text-lg text-neutral-900">Portfolio Documents Only</h3>
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      This tool is designed to analyse <strong className="text-neutral-900">portfolio holdings only</strong>. 
                      If your document contains multiple sections (e.g., goals, expenses, estate planning, 
                      income, liabilities, etc.) with the portfolio on just one page or section:
                    </p>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
                        <span className="text-success text-lg">✓</span>
                        Do This Instead:
                      </p>
                      <p className="text-sm text-neutral-800 leading-relaxed">
                        Copy and paste <strong className="text-neutral-900">ONLY the portfolio section</strong> using the
                        <strong className="text-neutral-900"> "Copy & Paste Portfolio Data"</strong> field below, rather than uploading the entire document.
                      </p>
                    </div>
                    <div className="text-xs text-neutral-700 pl-4 italic border-l-2 border-neutral-300">
                      <strong className="text-neutral-900 not-italic">Example:</strong> If your document has a table of contents showing "Your Goals, 
                      Your Income, Your Expenses, Your Assets, Your Liabilities, Your Superannuation, 
                      Estate Planning, Market Review... <em className="text-neutral-900">Portfolio (page 17)</em>", 
                      copy just the portfolio section from page 17, not the whole document.
                    </div>
                  </div>
                </div>
              </div>

              <FileUploadZone
                files={files}
                onFilesChange={handleFilesChange}
                pastedContent={pastedContent}
                onPastedContentChange={setPastedContent}
                disabled={isProcessing}
                maxFiles={1}
                maxSizeMB={10}
              />
            </CardContent>
          </Card>
        )}

        {/* Analyse Button */}
        {canAnalyse && !analysisResult && !isAnalysing && (
          <div id="analyse-button-section" className="flex justify-center">
            <Button
              size="lg"
              onClick={handleAnalyse}
              disabled={isProcessing}
            >
              Analyse Portfolio
            </Button>
          </div>
        )}

        {/* Loading Animation */}
        {isAnalysing && (
          <div id="loading-section">
            <LoadingAnimation progress={analysisProgress} progressLabel={analysisProgressLabel} />
          </div>
        )}

        {/* Error Message */}
        {analysisError && (
          <Alert variant="error" title="Analysis Error">
            {analysisError}
          </Alert>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div id="results" className="space-y-6">
            {/* Charts Section */}
            <div id="portfolio-charts">
              <PortfolioCharts 
                chartData={analysisResult.chartData} 
                holdingsPerformance={analysisResult.chartData.holdingsPerformance}
              />
            </div>

            {/* Detailed Analysis */}
            <div id="detailed-analysis">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Analysis</CardTitle>
                  <CardDescription>
                    Comprehensive analysis based on your investor profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="analysis-markdown">
                    <ReactMarkdown>{stripAssetClassMetrics(analysisResult.markdown)}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Download Error */}
            {downloadError && (
              <Alert variant="error" title="Download Error">
                {downloadError}
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mt-12">
              <Button
                variant="secondary"
                onClick={() => {
                  setAnalysisResult(null);
                  setFiles([]);
                  setDownloadError(null);
                }}
              >
                Start New Analysis
              </Button>
              <Button 
                variant="primary" 
                onClick={async () => {
                  setIsDownloading(true);
                  setDownloadError(null);
                  try {
                    await generatePortfolioPDF({
                      chartData: analysisResult.chartData,
                      analysisMarkdown: analysisResult.markdown,
                      userName: profile.name,
                    });
                    
                    // Show custom modal after successful download
                    setShowContactModal(true);
                  } catch (error) {
                    setDownloadError(
                      error instanceof Error 
                        ? error.message 
                        : 'Failed to download PDF. Please try again.'
                    );
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                disabled={isDownloading}
              >
                {isDownloading ? 'Generating PDF...' : 'Download Results'}
              </Button>
            </div>
          </div>
        )}

        {/* Contact James Modal */}
        <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)}>
          <ModalHeader>Would you like to contact James Walker-Powell to discuss your portfolio analysis?</ModalHeader>
          <ModalBody>
            <p className="mb-2">
              Click OK to open your email client.
            </p>
            <p className="font-semibold text-primary">
              Please remember to attach the downloaded PDF to your email.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => setShowContactModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                // Get last name for subject line
                const lastName = profile.name.trim().split(' ').pop() || 'Portfolio';
                
                // Prepare mailto link
                const mailtoSubject = encodeURIComponent(`${lastName} Portfolio Analysis Discussion`);
                const mailtoBody = encodeURIComponent(
                  'Hi James,\n\n' +
                  'I would like to discuss my portfolio analysis with you.\n\n' +
                  'Please find the Portfolio Analysis Report attached.\n\n' +
                  'Looking forward to hearing from you.\n\n' +
                  'Best regards,\n' +
                  profile.name
                );
                
                // Open mailto link
                window.location.href = `mailto:james@mlfs.com.au?subject=${mailtoSubject}&body=${mailtoBody}`;
                
                // Close modal
                setShowContactModal(false);
              }}
            >
              OK
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </div>
  );
}

function stripAssetClassMetrics(markdown: string): string {
  if (!markdown) return markdown;

  const lines = markdown.split(/\r?\n/);
  const filtered: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!skipping && /asset[-\s]?class metrics/i.test(trimmed)) {
      skipping = true;
      continue;
    }

    if (skipping) {
      const isTableLike = trimmed.includes('|');
      if (trimmed === '' || !isTableLike) {
        skipping = false;
      } else {
        continue;
      }
    }

    filtered.push(line);
  }

  return filtered.join('\n');
}
