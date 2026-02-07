import { useState, useRef, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogoUploadCardProps {
  teamId: string;
  currentLogoUrl: string | null;
  onUpload: (teamId: string, file: File) => Promise<string | null>;
  onRemove: (teamId: string) => Promise<boolean>;
}

export function LogoUploadCard({ 
  teamId, 
  currentLogoUrl, 
  onUpload, 
  onRemove 
}: LogoUploadCardProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: 'Erro', 
        description: 'Apenas imagens são permitidas',
        variant: 'destructive'
      });
      return;
    }

    // Validação de tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ 
        title: 'Erro', 
        description: 'Ficheiro demasiado grande (máx. 2MB)',
        variant: 'destructive'
      });
      return;
    }

    // Preview local
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    // Upload
    setUploading(true);
    const result = await onUpload(teamId, file);
    setUploading(false);
    
    // Limpar preview se upload foi bem sucedido
    if (result) {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(teamId);
    setRemoving(false);
  };

  const displayUrl = preview || currentLogoUrl;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Logótipo da Equipa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          {/* Preview Area */}
          <div 
            className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
            onClick={() => inputRef.current?.click()}
          >
            {displayUrl ? (
              <img 
                src={displayUrl} 
                alt="Logótipo" 
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <div className="text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-1">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4" />
              {currentLogoUrl ? 'Alterar' : 'Carregar'}
            </Button>
            
            {currentLogoUrl && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-destructive hover:text-destructive"
                onClick={handleRemove}
                disabled={removing || uploading}
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remover
              </Button>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG ou SVG (máx. 2MB)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
