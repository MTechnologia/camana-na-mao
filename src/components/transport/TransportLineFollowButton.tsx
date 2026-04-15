import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { TransportSubscriptionWithLine } from '@/hooks/useTransportSubscriptions';

type Props = {
  lineId: string;
  lineLabel?: string;
  subscriptionType?: string;
  subscriptions: TransportSubscriptionWithLine[];
  loading: boolean;
  toggleSubscription: (lineId: string, active: boolean, type?: string) => Promise<void>;
  className?: string;
};

export function TransportLineFollowButton({
  lineId,
  lineLabel,
  subscriptionType = 'alert',
  subscriptions,
  loading,
  toggleSubscription,
  className,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const following = subscriptions.some(
    (s) => s.line_id === lineId && s.subscription_type === subscriptionType,
  );

  const handleClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setBusy(true);
    try {
      await toggleSubscription(lineId, !following, subscriptionType);
    } finally {
      setBusy(false);
    }
  };

  const label = following ? 'Deixar de acompanhar' : 'Acompanhar esta linha';
  const titleHint = lineLabel ? `Linha: ${lineLabel}` : undefined;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={loading || busy}
      onClick={handleClick}
      title={titleHint}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : following ? (
        <BellOff className="h-4 w-4 mr-2 shrink-0" />
      ) : (
        <Bell className="h-4 w-4 mr-2 shrink-0" />
      )}
      {label}
    </Button>
  );
}
