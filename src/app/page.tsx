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
    valueForMoney: undefined,
  });

  const [isQuestionnaireComplete, setIsQuestionnaireComplete] = useState(false);
  
  // State for uploaded files
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // State for analysis results
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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
      
      // Update status to processing
      updatedFiles[index] = {
        ...updatedFiles[index],
        status: 'processing',
      };
      setFiles([...updatedFiles]);
      
      try {
        // Parse the file
        const content = await parseFile(fileToProcess.file, fileToProcess.type);
        
        // Update with parsed content
        updatedFiles[index] = {
          ...updatedFiles[index],
          status: 'completed',
          parsedContent: content,
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
  const canAnalyse = isQuestionnaireComplete && files.length > 0 && 
    files.every((f) => f.status === 'completed');

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

    // Scroll to loading animation
    setTimeout(() => {
      document.getElementById('loading-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      // Prepare request payload
      const requestData = {
        profile,
        files: files.map((f) => ({
          fileName: f.file.name,
          content: f.parsedContent || '',
          type: f.type,
        })),
      };

      // Call the analyse API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      // Store the analysis result
      setAnalysisResult(result.data.analysis);

      // Scroll to results
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Analysis error:', error);
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
          <h1 className="text-4xl font-bold text-primary mb-2">
            Portfolio Analysis & Advisory Tool
          </h1>
          <p className="text-neutral-500 text-lg">
            Powered by BackPro AI
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
            <CardContent>
              <FileUploadZone
                files={files}
                onFilesChange={handleFilesChange}
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
            <LoadingAnimation />
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
              <PortfolioCharts chartData={analysisResult.chartData} />
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
                  <div className="prose prose-slate max-w-none prose-headings:text-primary prose-a:text-primary">
                    <ReactMarkdown>{analysisResult.markdown}</ReactMarkdown>
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
