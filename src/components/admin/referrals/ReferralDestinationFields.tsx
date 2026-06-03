import { Label } from "@/components/ui/label";
import type { ScoredReferralDestination } from "@/types/referralRoutingRules";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ReferralDestinationFieldsProps = {
  commissionId: string;
  councillorId: string;
  commissionOptions: ScoredReferralDestination[];
  councillorOptions: ScoredReferralDestination[];
  showScores: boolean;
  onCommissionChange: (id: string) => void;
  onCouncillorChange: (id: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
};

function optionLabel(d: ScoredReferralDestination, showScores: boolean): string {
  return showScores ? `${d.name} — ${d.matchScore}% afinidade` : d.name;
}

export function ReferralDestinationFields({
  commissionId,
  councillorId,
  commissionOptions,
  councillorOptions,
  showScores,
  onCommissionChange,
  onCouncillorChange,
  note,
  onNoteChange,
}: ReferralDestinationFieldsProps) {
  const resolvedCommission = commissionId || commissionOptions[0]?.id || "";
  const resolvedCouncillor = councillorId || councillorOptions[0]?.id || "";

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="commission-select">Comissão temática</Label>
        <select
          id="commission-select"
          className={selectClass}
          value={resolvedCommission}
          onChange={(e) => onCommissionChange(e.target.value)}
        >
          {commissionOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {optionLabel(c, showScores)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="councillor-select">Vereador(a)</Label>
        <select
          id="councillor-select"
          className={selectClass}
          value={resolvedCouncillor}
          onChange={(e) => onCouncillorChange(e.target.value)}
        >
          {councillorOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {optionLabel(c, showScores)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="ref-note">Mensagem ao encaminhar</Label>
        <textarea
          id="ref-note"
          className="mt-1 flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      </div>
    </div>
  );
}
