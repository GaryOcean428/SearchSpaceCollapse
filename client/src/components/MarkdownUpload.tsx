import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Progress } from '@/components/ui';
import { Upload, FileText, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';

interface SingleFileResult {
  success: boolean;
  filename: string;
  words_processed: number;
  words_learned: number;
  unique_words?: number;
  total_occurrences?: number;
  sample_words?: string[];
  error?: string;
}

interface UploadResult {
  success: boolean;
  files_processed: number;
  total_words_processed: number;
  total_words_learned: number;
  results: SingleFileResult[];
}

export function MarkdownUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<UploadResult> => {
      const results: SingleFileResult[] = [];
      let totalWordsProcessed = 0;
      let totalWordsLearned = 0;

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/learning/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            results.push({
              success: false,
              filename: file.name,
              words_processed: 0,
              words_learned: 0,
              error: error.error || 'Upload failed',
            });
          } else {
            const data = await response.json();
            results.push({
              success: true,
              filename: file.name,
              words_processed: data.words_processed || 0,
              words_learned: data.words_learned || 0,
              unique_words: data.unique_words,
              sample_words: data.sample_words,
            });
            totalWordsProcessed += data.words_processed || 0;
            totalWordsLearned += data.words_learned || 0;
          }
        } catch (error: any) {
          results.push({
            success: false,
            filename: file.name,
            words_processed: 0,
            words_learned: 0,
            error: error.message || 'Network error',
          });
        }
      }

      return {
        success: results.some(r => r.success),
        files_processed: files.length,
        total_words_processed: totalWordsProcessed,
        total_words_learned: totalWordsLearned,
        results,
      };
    },
    onSuccess: (data) => {
      setResult(data);
      setSelectedFiles([]);
    },
    onError: (error: Error) => {
      setResult({
        success: false,
        files_processed: 0,
        total_words_processed: 0,
        total_words_learned: 0,
        results: [{
          success: false,
          filename: 'unknown',
          words_processed: 0,
          words_learned: 0,
          error: error.message,
        }],
      });
      setSelectedFiles([]);
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(
        file => file.name.toLowerCase().endsWith('.md')
      );
      if (files.length > 0) {
        setSelectedFiles(prev => [...prev, ...files]);
        setResult(null);
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(
        file => file.name.toLowerCase().endsWith('.md')
      );
      if (files.length > 0) {
        setSelectedFiles(prev => [...prev, ...files]);
        setResult(null);
      } else {
        setResult({
          success: false,
          files_processed: 0,
          total_words_processed: 0,
          total_words_learned: 0,
          results: [{
            success: false,
            filename: 'selected files',
            words_processed: 0,
            words_learned: 0,
            error: 'Only .md (markdown) files are accepted',
          }],
        });
      }
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  return (
    <Card className="bg-background/50 backdrop-blur border-emerald-500/20" data-testid="card-markdown-upload">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 font-mono">
          <FileText className="h-5 w-5 text-emerald-400" />
          Markdown Vocabulary Upload
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          Upload multiple .md files to extract and learn vocabulary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
            dragActive
              ? 'border-emerald-400 bg-emerald-400/10'
              : 'border-muted-foreground/30 hover:border-muted-foreground/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-testid="dropzone-markdown"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-mono">
            Drag and drop .md files here, or
          </p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".md"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file-markdown"
            />
            <span className="text-sm text-emerald-400 hover:underline font-mono">
              click to browse
            </span>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2" data-testid="section-selected-files">
            <div className="text-sm font-mono text-muted-foreground" data-testid="text-files-count">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-md"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm font-mono truncate" data-testid={`text-selected-file-${index}`}>
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => removeFile(index)}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="w-full"
              data-testid="button-upload-markdown"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload & Learn ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})
                </>
              )}
            </Button>
          </div>
        )}

        {uploadMutation.isPending && (
          <div className="space-y-2">
            <Progress value={undefined} className="h-2" />
            <p className="text-xs text-muted-foreground font-mono text-center">
              Extracting vocabulary from markdown files...
            </p>
          </div>
        )}

        {result && (
          <div
            className={`p-4 rounded-md border ${
              result.success
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
            data-testid="result-upload"
          >
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className="font-mono text-sm font-medium">
                {result.success 
                  ? `Learning Complete (${result.files_processed} file${result.files_processed > 1 ? 's' : ''})` 
                  : 'Upload Failed'}
              </span>
            </div>

            {result.success ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  <div className="p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">Processed:</span>
                    <span className="ml-2 text-emerald-400" data-testid="text-words-processed">
                      {result.total_words_processed}
                    </span>
                  </div>
                  <div className="p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">Learned:</span>
                    <span className="ml-2 text-cyan-400" data-testid="text-words-learned">
                      {result.total_words_learned}
                    </span>
                  </div>
                </div>
                {result.results.length > 1 && (
                  <div className="max-h-24 overflow-y-auto space-y-1 text-xs font-mono" data-testid="list-file-results">
                    {result.results.map((r, i) => (
                      <div key={i} className="flex items-center gap-2" data-testid={`row-file-result-${i}`}>
                        {r.success ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" data-testid={`icon-success-${i}`} />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-400" data-testid={`icon-error-${i}`} />
                        )}
                        <span className="truncate" data-testid={`text-filename-${i}`}>{r.filename}</span>
                        {r.success && (
                          <span className="text-muted-foreground" data-testid={`text-words-count-${i}`}>
                            ({r.words_learned} words)
                          </span>
                        )}
                        {!r.success && r.error && (
                          <span className="text-red-400 truncate" data-testid={`text-file-error-${i}`}>{r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {result.results.map((r, i) => (
                  <p key={i} className="text-sm text-red-400 font-mono" data-testid={`text-upload-error-${i}`}>
                    {r.filename}: {r.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
