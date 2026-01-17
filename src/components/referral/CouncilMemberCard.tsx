import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Star, MapPin } from 'lucide-react';
import { Vereador } from '@/hooks/useVereadores';

interface CouncilMemberCardProps {
  vereador: Vereador;
  matchScore: number;
  matchReasons: string[];
  selected?: boolean;
  onSelect: () => void;
}

export const CouncilMemberCard = ({
  vereador,
  matchScore,
  matchReasons,
  selected,
  onSelect
}: CouncilMemberCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Alta relevância';
    if (score >= 40) return 'Média relevância';
    return 'Disponível';
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${
        selected 
          ? 'ring-2 ring-primary border-primary bg-primary/5' 
          : 'hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="w-16 h-16">
              <AvatarImage src={vereador.photo} alt={vereador.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {vereador.initials}
              </AvatarFallback>
            </Avatar>
            {selected && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base truncate">{vereador.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{vereador.party}</Badge>
                  {vereador.region && (
                    <span className="flex items-center text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {vereador.region}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className={`flex items-center gap-1 ${getScoreColor(matchScore)}`}>
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold">{matchScore}%</span>
                </div>
                <span className="text-xs text-muted-foreground">{getScoreLabel(matchScore)}</span>
              </div>
            </div>

            <div className="mt-3">
              <Progress value={matchScore} className="h-1.5" />
            </div>

            {matchReasons.length > 0 && (
              <div className="mt-3 space-y-1">
                {matchReasons.slice(0, 3).map((reason, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span>
                    {reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
