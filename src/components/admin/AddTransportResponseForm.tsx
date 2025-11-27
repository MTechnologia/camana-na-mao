import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, Loader2 } from 'lucide-react';

interface AddTransportResponseFormProps {
  onSubmit: (responseText: string, responseType: string, isPublic: boolean) => Promise<void>;
  disabled?: boolean;
}

export const AddTransportResponseForm = ({ onSubmit, disabled }: AddTransportResponseFormProps) => {
  const [responseText, setResponseText] = useState('');
  const [responseType, setResponseType] = useState('answer');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!responseText.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(responseText.trim(), responseType, isPublic);
      setResponseText('');
      setResponseType('answer');
      setIsPublic(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h4 className="font-semibold text-sm">Adicionar Resposta</h4>
      
      <Textarea
        placeholder="Digite sua resposta para o cidadão..."
        value={responseText}
        onChange={(e) => setResponseText(e.target.value)}
        rows={4}
        disabled={disabled || submitting}
        className="resize-none"
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[150px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
          <Select value={responseType} onValueChange={setResponseType} disabled={disabled || submitting}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="answer">Resposta</SelectItem>
              <SelectItem value="follow_up">Acompanhamento</SelectItem>
              <SelectItem value="closure">Encerramento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-5">
          <Checkbox
            id="isPublic"
            checked={isPublic}
            onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            disabled={disabled || submitting}
          />
          <Label htmlFor="isPublic" className="text-sm cursor-pointer">
            Visível para o cidadão
          </Label>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!responseText.trim() || disabled || submitting}
        className="w-full sm:w-auto"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Enviar Resposta
      </Button>
    </div>
  );
};
