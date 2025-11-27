import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Key, 
  Shield, 
  AlertTriangle, 
  Copy, 
  Check,
  FileText,
  Lock,
  Wallet
} from "lucide-react";
import { useState } from "react";

interface RecoveryBundle {
  filename: string;
  address: string;
  passphrase?: string;
  timestamp: string;
  qigMetrics?: {
    phi: number;
    kappa: number;
    regime: string;
  };
  fileSize: number;
  createdAt: string;
  error?: string;
}

interface RecoveryDetail {
  passphrase: string;
  address: string;
  privateKeyHex: string;
  privateKeyWIF: string;
  privateKeyWIFCompressed: string;
  publicKeyHex: string;
  publicKeyHexCompressed: string;
  timestamp: string;
  qigMetrics?: {
    phi: number;
    kappa: number;
    regime: string;
  };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2"
      data-testid={`button-copy-${label}`}
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function RecoveryCard({ recovery, onSelect }: { recovery: RecoveryBundle; onSelect: () => void }) {
  return (
    <Card 
      className="hover-elevate cursor-pointer transition-all"
      onClick={onSelect}
      data-testid={`card-recovery-${recovery.filename}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-mono truncate max-w-[180px]">
              {recovery.address}
            </CardTitle>
          </div>
          {recovery.qigMetrics && (
            <Badge variant={recovery.qigMetrics.regime === 'geometric' ? 'default' : 'secondary'}>
              Φ={recovery.qigMetrics.phi.toFixed(2)}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Found: {new Date(recovery.timestamp || recovery.createdAt).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {recovery.passphrase && (
          <p className="text-xs text-muted-foreground font-mono truncate">
            Phrase: {recovery.passphrase}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecoveryDetailView({ filename, onBack }: { filename: string; onBack: () => void }) {
  const { data: detail, isLoading, error } = useQuery<RecoveryDetail>({
    queryKey: ['/api/recoveries', filename],
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  
  if (error || !detail) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load recovery details</p>
          <Button variant="outline" onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const txtFilename = filename.replace('.json', '.txt');
  
  return (
    <div className="space-y-4" data-testid="recovery-detail-view">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} data-testid="button-back">
          ← Back to List
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/recoveries/${filename}/download`, '_blank')}
            data-testid="button-download-json"
          >
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/recoveries/${txtFilename}/download`, '_blank')}
            data-testid="button-download-txt"
          >
            <FileText className="h-4 w-4 mr-1" />
            Instructions
          </Button>
        </div>
      </div>
      
      <Card className="border-green-500 dark:border-green-400">
        <CardHeader className="pb-2 bg-green-50 dark:bg-green-950/30">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-700 dark:text-green-400">
              Recovery Successful
            </CardTitle>
          </div>
          <CardDescription>
            Found: {new Date(detail.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Bitcoin Address</span>
              <CopyButton text={detail.address} label="address" />
            </div>
            <p className="font-mono text-sm break-all" data-testid="text-address">
              {detail.address}
            </p>
          </div>
          
          {detail.qigMetrics && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">
                Φ = {detail.qigMetrics.phi.toFixed(3)}
              </Badge>
              <Badge variant="outline">
                κ = {detail.qigMetrics.kappa.toFixed(1)}
              </Badge>
              <Badge variant={detail.qigMetrics.regime === 'geometric' ? 'default' : 'secondary'}>
                {detail.qigMetrics.regime}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="border-amber-500">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-700 dark:text-amber-400">
              Passphrase (Brain Wallet)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Original Passphrase</span>
              <CopyButton text={detail.passphrase} label="passphrase" />
            </div>
            <p className="font-mono text-sm break-all font-medium" data-testid="text-passphrase">
              {detail.passphrase}
            </p>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Write this on paper and store securely. Never type into any website!
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>Private Keys (WIF Format)</CardTitle>
          </div>
          <CardDescription>
            Import these directly into Bitcoin Core or Electrum
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">WIF (Uncompressed)</span>
              <CopyButton text={detail.privateKeyWIF} label="wif-uncompressed" />
            </div>
            <p className="font-mono text-xs break-all" data-testid="text-wif-uncompressed">
              {detail.privateKeyWIF}
            </p>
          </div>
          
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">WIF (Compressed)</span>
              <CopyButton text={detail.privateKeyWIFCompressed} label="wif-compressed" />
            </div>
            <p className="font-mono text-xs break-all" data-testid="text-wif-compressed">
              {detail.privateKeyWIFCompressed}
            </p>
          </div>
          
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Private Key (Hex)</span>
              <CopyButton text={detail.privateKeyHex} label="hex" />
            </div>
            <p className="font-mono text-xs break-all text-muted-foreground" data-testid="text-hex">
              {detail.privateKeyHex}
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-destructive">
        <CardHeader className="pb-2 bg-destructive/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Security Warnings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-destructive">•</span>
              NEVER enter this key into ANY website (including block explorers)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive">•</span>
              Use Bitcoin Core or Electrum for import - download from official sites only
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive">•</span>
              Move funds to a hardware wallet (Ledger, Trezor) as soon as possible
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive">•</span>
              Delete digital copies after securing on paper/hardware
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RecoveryResults() {
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  
  const { data, isLoading, error } = useQuery<{ recoveries: RecoveryBundle[]; count: number }>({
    queryKey: ['/api/recoveries'],
  });
  
  if (selectedFilename) {
    return (
      <RecoveryDetailView 
        filename={selectedFilename} 
        onBack={() => setSelectedFilename(null)} 
      />
    );
  }
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load recoveries</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!data?.recoveries.length) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No recoveries found yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Found passphrases will appear here with full recovery instructions
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4" data-testid="recovery-results">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Found Recoveries
        </h3>
        <Badge variant="secondary">{data.count} total</Badge>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-3 pr-4">
          {data.recoveries.map((recovery) => (
            <RecoveryCard
              key={recovery.filename}
              recovery={recovery}
              onSelect={() => setSelectedFilename(recovery.filename)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
