import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Progress } from '@/components/ui';
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface UploadResult {
  success: boolean;
  filename: string;
  words_processed: number;
  words_learned: number;
  unique_words?: number;
  total_occurrences?: number;
  sample_words?: string[];
  error?: string;
}

export function MarkdownUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/learning/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      setResult({
        success: false,
        filename: selectedFile?.name || 'unknown',
        words_processed: 0,
        words_learned: 0,
        error: error.message,
      });
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.md')) {
        setSelectedFile(file);
        setResult(null);
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  }, []);

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
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
          Upload .md files to extract and learn vocabulary
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
            Drag and drop a .md file here, or
          </p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".md"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file-markdown"
            />
            <span className="text-sm text-emerald-400 hover:underline font-mono">
              click to browse
            </span>
          </label>
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-mono" data-testid="text-selected-file">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              data-testid="button-upload-markdown"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload & Learn
                </>
              )}
            </Button>
          </div>
        )}

        {uploadMutation.isPending && (
          <div className="space-y-2">
            <Progress value={undefined} className="h-2" />
            <p className="text-xs text-muted-foreground font-mono text-center">
              Extracting vocabulary from markdown...
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
                {result.success ? 'Learning Complete' : 'Upload Failed'}
              </span>
            </div>

            {result.success ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  <div className="p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">Processed:</span>
                    <span className="ml-2 text-emerald-400" data-testid="text-words-processed">
                      {result.words_processed}
                    </span>
                  </div>
                  <div className="p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">Learned:</span>
                    <span className="ml-2 text-cyan-400" data-testid="text-words-learned">
                      {result.words_learned}
                    </span>
                  </div>
                </div>
                {result.sample_words && result.sample_words.length > 0 && (
                  <div className="text-xs text-muted-foreground font-mono">
                    <span>Sample words: </span>
                    <span className="text-foreground">
                      {result.sample_words.slice(0, 10).join(', ')}
                      {result.sample_words.length > 10 && '...'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-400 font-mono" data-testid="text-upload-error">
                {result.error}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
