import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';

interface CouncilMemberSuggestionProps {
  member: {
    name: string;
    party: string;
    photo?: string;
    initials: string;
    region?: string;
  };
  reason: string;
  onForward: () => void;
}

export const CouncilMemberSuggestion = ({ member, reason, onForward }: CouncilMemberSuggestionProps) => {
  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={member.photo} alt={member.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {member.initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h3 className="font-semibold text-lg">{member.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{member.party}</Badge>
              {member.region && (
                <span className="text-xs text-muted-foreground">{member.region}</span>
              )}
            </div>

            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong className="text-primary">Por que este vereador?</strong>
                <br />
                <span className="text-muted-foreground">{reason}</span>
              </p>
            </div>

            <Button onClick={onForward} className="w-full mt-4">
              <Send className="w-4 h-4 mr-2" />
              Encaminhar meu relato
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
