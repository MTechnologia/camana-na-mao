import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, X, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ReferralDestinationFields } from '@/components/admin/referrals/ReferralDestinationFields';
import { ReferralRulesEditor } from '@/components/admin/referrals/ReferralRulesEditor';
import { TriageEditor } from '@/components/admin/triage/TriageEditor';
import { ReportTimelineTab } from '@/components/admin/triage/ReportTimelineTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReferralRoutingRules } from '@/contexts/ReferralRoutingRulesContext';
import { PRIORITY_LABELS, STAGE_LABELS } from '@/lib/urbanReportLabels';
import { suggestDestinations } from '@/lib/referralDestinations';
import { useReferralDestinations } from '@/hooks/useReferralDestinations';
import { useUserRole } from '@/hooks/useUserRole';
import type { TriageRecord } from '@/hooks/useReportTriage';
import { pairMatchScore } from '@/lib/referralRoutingEngine';
import type { ReportWorkflowStage, UrbanReportRecord } from '@/types/urbanReportManagement';

type ReportDetailSheetProps = {
  report: UrbanReportRecord | null;
  onClose: () => void;
  onUpdate: (report: UrbanReportRecord) => Promise<void>;
  saving?: boolean;
  /** Após salvar triagem em `report_triage` (ex.: alinhar `urban_reports.status` e lista). */
  onTriageCommitted?: (saved: TriageRecord) => void | Promise<void>;
};

function nowIso() {
  return new Date().toISOString();
}

export function ReportDetailSheet({
  report,
  onClose,
  onUpdate,
  saving = false,
  onTriageCommitted,
}: ReportDetailSheetProps) {
  const { rules } = useReferralRoutingRules();
  const { commissions, councilMembers } = useReferralDestinations();
  const { canManageTriage } = useUserRole();
  const [commissionId, setCommissionId] = useState('');
  const [councillorId, setCouncillorId] = useState('');
  const [referralNote, setReferralNote] = useState('');
  const [editingReferral, setEditingReferral] = useState(false);

  const commissionSuggestions = useMemo(
    () =>
      report
        ? suggestDestinations(report.category, 'commission', commissions, councilMembers, rules)
        : suggestDestinations('', 'commission', commissions, councilMembers, rules),
    [report, rules, commissions, councilMembers],
  );
  const councillorSuggestions = useMemo(
    () =>
      report
        ? suggestDestinations(report.category, 'councillor', commissions, councilMembers, rules)
        : suggestDestinations('', 'councillor', commissions, councilMembers, rules),
    [report, rules, commissions, councilMembers],
  );

  useEffect(() => {
    if (!report) return;
    setEditingReferral(false);
    setReferralNote(report.referral?.note ?? '');
    setCommissionId(report.referral?.commissionId ?? '');
    setCouncillorId(report.referral?.councillorId ?? '');
  }, [report?.id, report?.referral?.commissionId, report?.referral?.councillorId]);

  if (!report) return null;

  const mustTriageFirst = report.stage === 'awaiting_triage';
  const canRefer =
    report.stage === 'triaged' ||
    report.stage === 'in_analysis' ||
    report.stage === 'referred';
  const showReferralBlock = canRefer || Boolean(report.referral);

  const appendTimeline = (
    r: UrbanReportRecord,
    label: string,
    detail?: string,
  ): UrbanReportRecord => ({
    ...r,
    updatedAt: nowIso(),
    timeline: [
      ...r.timeline,
      {
        id: `evt-${Date.now()}`,
        at: nowIso(),
        label,
        detail,
        actor: 'Você (gestão)',
      },
    ],
  });

  const resolveReferralTargets = () => {
    const commission =
      commissions.find((c) => c.id === (commissionId || commissionSuggestions[0]?.id)) ??
      commissionSuggestions[0];
    const councillor =
      councilMembers.find((c) => c.id === (councillorId || councillorSuggestions[0]?.id)) ??
      councillorSuggestions[0];
    return { commission, councillor };
  };

  const handleRefer = async (isUpdate = false) => {
    const { commission, councillor } = resolveReferralTargets();
    if (!commission || !councillor) {
      toast.error('Selecione a comissão e o vereador para encaminhar');
      return;
    }
    const matchScore = pairMatchScore(report.category, commission, councillor, rules);
    const updated = appendTimeline(
      {
        ...report,
        stage: 'referred',
        referral: {
          commissionId: commission.id,
          commissionName: commission.name,
          councillorId: councillor.id,
          councillorName: councillor.name,
          referredAt: report.referral?.referredAt ?? nowIso(),
          matchScore,
          note: referralNote.trim() || undefined,
        },
      },
      isUpdate ? 'Encaminhamento atualizado' : 'Encaminhamento registrado',
      `${commission.name} · ${councillor.name} (${matchScore}%)`,
    );
    try {
      await onUpdate(updated);
      setEditingReferral(false);
      toast.success(isUpdate ? 'Destinos atualizados' : 'Encaminhamento registrado');
    } catch {
      /* toast no hook */
    }
  };

  const handleStatusChange = async (stage: ReportWorkflowStage) => {
    const updated = appendTimeline({ ...report, stage }, STAGE_LABELS[stage]);
    try {
      await onUpdate(updated);
      toast.success(`Status atualizado: ${STAGE_LABELS[stage]}`);
    } catch {
      /* toast no hook */
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label="Fechar detalhe do relato"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card shadow-xl"
        role="dialog"
        aria-labelledby="report-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{report.protocol}</p>
            <h2 id="report-detail-title" className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
              {report.title}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{STAGE_LABELS[report.stage]}</Badge>
              {report.priority ? (
                <Badge variant="outline">{PRIORITY_LABELS[report.priority]}</Badge>
              ) : null}
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resumo
            </h3>
            <p className="mt-2 text-sm text-foreground">{report.summary}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Região</dt>
                <dd className="font-medium">{report.region}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Distrito</dt>
                <dd className="font-medium">{report.district}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Tema</dt>
                <dd className="font-medium">{report.category}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Linha do tempo
            </h3>
            <ol className="relative mt-3 space-y-4 border-l border-border pl-4">
              {report.timeline.map((evt) => (
                <li key={evt.id} className="relative text-sm">
                  <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p className="font-medium text-foreground">{evt.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(evt.at).toLocaleString('pt-BR')}
                    {evt.actor ? ` · ${evt.actor}` : ''}
                  </p>
                  {evt.detail ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{evt.detail}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-primary/25 bg-accent/30 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Triagem (HU-10.1)</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Prioridade P0–P3, comissão responsável e status do funil ficam em{' '}
                <code className="rounded bg-muted px-1">report_triage</code>. Conclua a triagem para liberar
                encaminhamento à comissão.
              </p>
            </div>
            <TriageEditor
              reportId={report.id}
              source="urban"
              canEdit={canManageTriage}
              onSaved={(saved) => void onTriageCommitted?.(saved)}
            />
            <ReportTimelineTab reportId={report.id} source="urban" />
          </section>

          {showReferralBlock ? (
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                Encaminhamento
                {!canRefer && report.referral ? null : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                )}
              </h3>
              {report.referral && !editingReferral ? (
                <>
                <dl className="mt-2 space-y-1 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Comissão</dt>
                    <dd className="font-medium">{report.referral.commissionName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Vereador(a)</dt>
                    <dd className="font-medium">{report.referral.councillorName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Afinidade (regras atuais)</dt>
                    <dd>{report.referral.matchScore}%</dd>
                  </div>
                  {report.referral.note ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Mensagem</dt>
                      <dd className="text-muted-foreground">{report.referral.note}</dd>
                    </div>
                  ) : null}
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => setEditingReferral(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar comissão e vereador
                </Button>
                </>
              ) : canRefer || editingReferral ? (
                <div className="mt-3 space-y-4">
                  <ReferralRulesEditor compact defaultExpanded={false} />
                  <ReferralDestinationFields
                    commissionId={commissionId}
                    councillorId={councillorId}
                    commissionOptions={commissionSuggestions}
                    councillorOptions={councillorSuggestions}
                    showScores={rules.showMatchScoreInUi}
                    onCommissionChange={setCommissionId}
                    onCouncillorChange={setCouncillorId}
                    note={referralNote}
                    onNoteChange={setReferralNote}
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      className="w-full gap-2"
                      disabled={saving}
                      onClick={() => handleRefer(editingReferral)}
                    >
                      <Send className="h-4 w-4" />
                      {editingReferral ? 'Salvar alterações' : 'Registrar encaminhamento'}
                    </Button>
                    {editingReferral ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingReferral(false)}
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Regras completas em{' '}
                    <Link
                      to="/admin/settings/referral-rules"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Governança → Regras de encaminhamento
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Encaminhamento disponível após concluir a triagem.
                </p>
              )}
            </section>
          ) : null}

          {!mustTriageFirst ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Atualizar status
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['in_analysis', 'resolved'] as const).map((stage) => (
                  <Button
                    key={stage}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || report.stage === stage}
                    onClick={() => handleStatusChange(stage)}
                  >
                    {STAGE_LABELS[stage]}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </>
  );
}
