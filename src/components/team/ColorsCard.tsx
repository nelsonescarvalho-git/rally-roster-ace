import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';

interface ColorsCardProps {
  teamName: string;
  primaryColor: string;
  secondaryColor: string;
  saving: boolean;
  onPrimaryColorChange: (value: string) => void;
  onSecondaryColorChange: (value: string) => void;
  onSave: () => void;
}

export function ColorsCard({
  teamName,
  primaryColor,
  secondaryColor,
  saving,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onSave,
}: ColorsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Cores da Equipa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="primary-color" className="text-xs">Cor Primária</Label>
            <div className="flex items-center gap-2">
              <div 
                className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer overflow-hidden"
                style={{ backgroundColor: primaryColor }}
              >
                <input
                  type="color"
                  id="primary-color"
                  value={primaryColor}
                  onChange={(e) => onPrimaryColorChange(e.target.value)}
                  className="w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <Input
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                placeholder="#3B82F6"
                className="font-mono text-xs h-10"
              />
            </div>
          </div>
          
          {/* Secondary Color */}
          <div className="space-y-2">
            <Label htmlFor="secondary-color" className="text-xs">Cor Secundária</Label>
            <div className="flex items-center gap-2">
              <div 
                className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer overflow-hidden"
                style={{ backgroundColor: secondaryColor }}
              >
                <input
                  type="color"
                  id="secondary-color"
                  value={secondaryColor}
                  onChange={(e) => onSecondaryColorChange(e.target.value)}
                  className="w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <Input
                value={secondaryColor}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                placeholder="#1E40AF"
                className="font-mono text-xs h-10"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div className="p-3 rounded-lg border bg-muted/30">
          <div className="text-xs text-muted-foreground mb-2">Pré-visualização</div>
          <div className="flex items-center gap-3">
            <div 
              className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-md"
              style={{ 
                backgroundColor: primaryColor, 
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              #7
            </div>
            <div className="flex-1">
              <div 
                className="h-2 rounded-full mb-1"
                style={{ backgroundColor: primaryColor }}
              />
              <div 
                className="h-2 rounded-full w-2/3"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
            <div 
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ 
                backgroundColor: primaryColor, 
                color: '#fff',
              }}
            >
              {teamName}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={onSave} 
          disabled={saving}
          className="w-full"
          size="sm"
        >
          {saving ? 'A guardar...' : 'Guardar Alterações'}
        </Button>
      </CardContent>
    </Card>
  );
}
