

# Plano: Upload de Logótipos das Equipas

## Objetivo

Permitir o upload e exibição de logótipos/emblemas para cada equipa, utilizando o armazenamento do Lovable Cloud.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE UPLOAD                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Utilizador seleciona imagem                                     │
│         ↓                                                           │
│  2. Preview local (URL.createObjectURL)                             │
│         ↓                                                           │
│  3. Upload para bucket 'team-logos'                                 │
│         ↓                                                           │
│  4. Obter URL público                                               │
│         ↓                                                           │
│  5. Guardar logo_url na tabela teams                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### 1. Base de Dados - Storage Bucket

Criar um bucket público para armazenar os logótipos:

```sql
-- Criar bucket para logótipos das equipas
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true);

-- Política: qualquer pessoa pode ver logótipos (bucket público)
CREATE POLICY "Public read access for team logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

-- Política: qualquer pessoa pode fazer upload de logótipos
CREATE POLICY "Public upload access for team logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-logos');

-- Política: qualquer pessoa pode atualizar os seus uploads
CREATE POLICY "Public update access for team logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-logos');

-- Política: qualquer pessoa pode apagar logótipos
CREATE POLICY "Public delete access for team logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-logos');
```

### 2. Novo Componente - LogoUploadCard

Criar componente dedicado para upload e preview do logótipo:

| Ficheiro | Descrição |
|----------|-----------|
| `src/components/team/LogoUploadCard.tsx` | Card com upload, preview e remoção do logótipo |

**Funcionalidades:**
- Área de drop/clique para selecionar imagem
- Preview da imagem antes e depois do upload
- Botão para remover logótipo existente
- Validação de tipo (apenas imagens) e tamanho (max 2MB)
- Loading state durante upload

### 3. Atualizar Componentes Existentes

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useTeams.ts` | Adicionar funções `uploadLogo` e `removeLogo` |
| `src/pages/TeamDetail.tsx` | Integrar LogoUploadCard na página de detalhes |
| `src/pages/Teams.tsx` | Mostrar logótipo no card de cada equipa (se existir) |
| `src/components/CreateTeamDialog.tsx` | Adicionar opção de upload de logótipo na criação |

---

## Interface Proposta

### LogoUploadCard (TeamDetail)

```text
┌────────────────────────────────────────────────────────┐
│ 🖼️ Logótipo da Equipa                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│     ┌──────────────────────────┐                       │
│     │                          │                       │
│     │      [  EMBLEMA  ]       │   [Alterar]           │
│     │                          │                       │
│     │       120×120px          │   [Remover]           │
│     │                          │                       │
│     └──────────────────────────┘                       │
│                                                        │
│  Arraste uma imagem ou clique para selecionar          │
│  (PNG, JPG - máx. 2MB)                                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Teams.tsx (Lista)

```text
┌─────────────────────────────────────────┐
│ [LOGO] Amares SC                    →   │
│        14 jogadores · J. Silva          │
└─────────────────────────────────────────┘
```

Se não houver logótipo, mostra ícone genérico (Users) como atualmente.

---

## Detalhes Técnicos

### Hook useTeams - Novas Funções

```typescript
// Upload de logótipo
const uploadLogo = useCallback(async (
  teamId: string,
  file: File
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${teamId}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload para o bucket
    const { error: uploadError } = await supabase.storage
      .from('team-logos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Obter URL público
    const { data: { publicUrl } } = supabase.storage
      .from('team-logos')
      .getPublicUrl(filePath);

    // Atualizar tabela teams
    const { error: updateError } = await supabase
      .from('teams')
      .update({ logo_url: publicUrl })
      .eq('id', teamId);

    if (updateError) throw updateError;

    await loadTeams();
    toast({ title: 'Logótipo atualizado' });
    return publicUrl;
  } catch (error: any) {
    toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    return null;
  }
}, [loadTeams, toast]);

// Remover logótipo
const removeLogo = useCallback(async (teamId: string): Promise<boolean> => {
  try {
    // Listar e apagar ficheiros com prefixo do teamId
    const { data: files } = await supabase.storage
      .from('team-logos')
      .list('', { search: teamId });

    if (files && files.length > 0) {
      await supabase.storage
        .from('team-logos')
        .remove(files.map(f => f.name));
    }

    // Limpar campo na tabela
    const { error } = await supabase
      .from('teams')
      .update({ logo_url: null })
      .eq('id', teamId);

    if (error) throw error;

    await loadTeams();
    toast({ title: 'Logótipo removido' });
    return true;
  } catch (error: any) {
    toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    return false;
  }
}, [loadTeams, toast]);
```

### LogoUploadCard Component

```typescript
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
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Apenas imagens são permitidas' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'Ficheiro demasiado grande (máx. 2MB)' });
      return;
    }

    // Preview local
    setPreview(URL.createObjectURL(file));
    
    // Upload
    setUploading(true);
    await onUpload(teamId, file);
    setUploading(false);
    setPreview(null);
  };

  // ... render com área de drop, preview, botões
}
```

---

## Ficheiros a Criar/Alterar

| Ficheiro | Operação | Descrição |
|----------|----------|-----------|
| `supabase/migrations/xxx_create_team_logos_bucket.sql` | Criar | Bucket e políticas RLS |
| `src/components/team/LogoUploadCard.tsx` | Criar | Componente de upload |
| `src/hooks/useTeams.ts` | Alterar | Adicionar uploadLogo e removeLogo |
| `src/pages/TeamDetail.tsx` | Alterar | Integrar LogoUploadCard |
| `src/pages/Teams.tsx` | Alterar | Mostrar logótipo na lista |

---

## Validações de Segurança

- **Tipo de ficheiro**: Apenas imagens (image/*)
- **Tamanho máximo**: 2MB por ficheiro
- **Nome único**: Usar teamId como nome do ficheiro (previne duplicados)
- **Bucket público**: Logótipos são visíveis para todos
- **Upsert**: Substituir ficheiro existente automaticamente

---

## Critérios de Sucesso

- Utilizador pode fazer upload de logótipo na página de detalhes da equipa
- Preview da imagem mostrado antes de guardar
- Logótipo aparece na lista de equipas (Teams.tsx)
- Logótipo aparece na pré-visualização de cores (ColorsCard)
- Possibilidade de remover logótipo existente
- Feedback visual durante upload (loading state)
- Validação de tipo e tamanho de ficheiro
- Opção de adicionar logótipo na criação de equipa (opcional)

