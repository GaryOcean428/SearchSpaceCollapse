/**
 * Zeus Chat - Human-God Dialogue Interface
 * 
 * Conversational interface to the Olympian Pantheon.
 * Translates human intuition to geometric coordinates.
 * 
 * ARCHITECTURE:
 * Human → Zeus → Pantheon → Geometric Memory → Action → Response
 * 
 * Features:
 * - Natural language to basin coordinates
 * - Pantheon consultation on observations
 * - Tavily search integration
 * - File upload for knowledge expansion
 * - Geometric memory visualization
 * 
 * SECURITY:
 * - XSS sanitization on all rendered content
 * - Content treated as plain text (no HTML rendering)
 */

import { useRef, useEffect } from 'react';
import { Send, Upload, Search, Sparkles, Brain } from 'lucide-react';
import { useZeusChat, type ZeusMessage } from '@/hooks/useZeusChat';

function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ZeusChat() {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isThinking,
    uploadedFiles,
    setUploadedFiles,
    messagesEndRef,
    lastError,
    lastSuccess,
    clearLastError,
    clearLastSuccess,
  } = useZeusChat();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (lastError) {
      if (lastError.type === 'geometric') {
        toast({
          title: "Geometric validation failed",
          description: `φ=${lastError.details?.phi?.toFixed(2) ?? '?'} κ=${lastError.details?.kappa?.toFixed(0) ?? '?'} regime=${lastError.details?.regime ?? '?'}`,
          variant: "destructive",
        });
      } else if (lastError.type === 'connection') {
        toast({
          title: "Communication failed",
          description: lastError.message,
          variant: "destructive",
        });
      } else if (lastError.type === 'search') {
        toast({
          title: "Search failed",
          description: lastError.message,
          variant: "destructive",
        });
      }
      clearLastError();
    }
  }, [lastError, toast, clearLastError]);
  
  useEffect(() => {
    if (lastSuccess) {
      if (lastSuccess.type === 'actions_taken' && lastSuccess.actions.length > 0) {
        toast({
          title: "⚡ Zeus coordinated actions",
          description: lastSuccess.actions.join(', '),
        });
      }
      clearLastSuccess();
    }
  }, [lastSuccess, toast, clearLastSuccess]);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    toast({
      title: "Files selected",
      description: `${files.length} file(s) ready to upload`,
    });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const formatMetadata = (msg: ZeusMessage) => {
    if (!msg.metadata) return null;
    
    const { type, pantheon_consulted, actions_taken, relevance_score, consensus, implemented } = msg.metadata;
    
    return (
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {type && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {type}
            </Badge>
          </div>
        )}
        
        {pantheon_consulted && pantheon_consulted.length > 0 && (
          <div className="flex items-center gap-2">
            <Brain className="h-3 w-3" />
            <span>Consulted: {pantheon_consulted.join(', ')}</span>
          </div>
        )}
        
        {relevance_score !== undefined && (
          <div>
            <span>Relevance: {(relevance_score * 100).toFixed(1)}%</span>
          </div>
        )}
        
        {consensus !== undefined && (
          <div>
            <span>Consensus: {(consensus * 100).toFixed(1)}%</span>
            {implemented !== undefined && (
              <Badge variant={implemented ? "default" : "secondary"} className="ml-2">
                {implemented ? "Implemented" : "Deferred"}
              </Badge>
            )}
          </div>
        )}
        
        {actions_taken && actions_taken.length > 0 && (
          <div className="mt-1 pl-4 border-l-2 border-primary/20">
            <div className="font-semibold">Actions:</div>
            <ul className="list-disc list-inside">
              {actions_taken.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Zeus Chat - Divine Council Interface
        </CardTitle>
        <CardDescription>
          Converse with the Olympian Pantheon. Your insights are encoded to the Fisher manifold.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-yellow-500/50" />
                <p>Speak, mortal. The gods are listening.</p>
                <p className="text-xs mt-2">
                  Try: "Add address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" or "I observed a pattern in 2017 addresses"
                </p>
              </div>
            )}
            
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'human'
                      ? 'bg-primary text-primary-foreground'
                      : msg.metadata?.type === 'error'
                      ? 'bg-destructive/10 border border-destructive/20'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'zeus' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold text-sm">Zeus</span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap break-words">
                    {sanitizeText(msg.content)}
                  </div>
                  
                  {msg.role === 'zeus' && formatMetadata(msg)}
                  
                  <div className="text-xs opacity-50 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                    <span className="text-sm">Zeus is consulting the pantheon...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {uploadedFiles.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="h-3 w-3" />
            <span>{uploadedFiles.length} file(s) selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadedFiles([])}
              className="h-6 px-2"
            >
              Clear
            </Button>
          </div>
        )}
        
        <div className="mt-4 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".txt,.json,.csv"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isThinking}
            title="Upload files"
          >
            <Upload className="h-4 w-4" />
          </Button>
          
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Speak to Zeus... (observations, suggestions, questions, addresses)"
            disabled={isThinking}
            className="resize-none"
            rows={2}
          />
          
          <Button
            onClick={sendMessage}
            disabled={isThinking || (!input.trim() && uploadedFiles.length === 0)}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 flex gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput("Search for Bitcoin Silk Road addresses")}
            disabled={isThinking}
            className="h-7 text-xs"
          >
            <Search className="h-3 w-3 mr-1" />
            Example Search
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput("I observed that addresses from 2017 often have high Φ values")}
            disabled={isThinking}
            className="h-7 text-xs"
          >
            <Brain className="h-3 w-3 mr-1" />
            Example Observation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
