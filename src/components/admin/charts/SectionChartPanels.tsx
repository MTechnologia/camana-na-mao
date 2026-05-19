import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard, ChartHeight } from '@/components/admin/charts/ChartShell';
import {
  CHART_COLORS,
  chartTooltipStyle,
  formatChartNumber,
} from '@/components/admin/analytics/chartTheme';
import { heatmapMetricLabel } from '@/lib/analyticsParameterLegends';
import { useSectionChartData } from '@/hooks/useSectionChartData';
import { SECTION_CHART_LEGENDS } from '@/lib/analyticsParameterLegends';
import type { LabeledValue } from '@/lib/chartTypes';
function BarBlock({
  data,
  layout = 'horizontal',
  colorIndex = 0,
}: {
  data: LabeledValue[];
  layout?: 'horizontal' | 'vertical';
  colorIndex?: number;
}) {
  const vertical = layout === 'vertical';
  return (
    <ChartHeight>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={vertical ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 12, left: vertical ? 72 : 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={!vertical} vertical={vertical} />
          {vertical ? (
            <>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={68}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={data.length > 5 ? -25 : 0}
                textAnchor={data.length > 5 ? 'end' : 'middle'}
                height={data.length > 5 ? 52 : 30}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            </>
          )}
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v) => formatChartNumber(Number(v))}
          />
          <Bar
            dataKey="value"
            name="Quantidade"
            fill={CHART_COLORS[colorIndex % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartHeight>
  );
}

export function TrendsChartSection() {
  const { volumeTimeSeries, metricTrends, volumeByCategory } = useSectionChartData();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Evolução do volume"
        subtitle="Novos relatos e resolvidos — respeita filtros globais"
        legend={SECTION_CHART_LEGENDS.volumeTimeSeries}
        className="lg:col-span-2"
      >
        <ChartHeight tall>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={volumeTimeSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="volume"
                name="Novos relatos"
                fill={CHART_COLORS[0]}
                fillOpacity={0.15}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="Resolvidos"
                stroke={CHART_COLORS[2]}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>

      <ChartCard
        title="Quatro indicadores no tempo"
        subtitle="Comparativo no recorte selecionado"
        legend={SECTION_CHART_LEGENDS.metricTrends}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metricTrends} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="volume" name="Volume" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sentiment" name="Sentimento %" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="patterns" name="Padrões" stroke={CHART_COLORS[3]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>

      <ChartCard
        title="Volume por categoria"
        subtitle="Distribuição no período"
        legend={SECTION_CHART_LEGENDS.volumeByCategory}
      >
        <BarBlock data={volumeByCategory.map((r) => ({ label: r.label, value: r.value }))} colorIndex={1} />
      </ChartCard>
    </div>
  );
}

/** Gráficos de apoio abaixo do mapa territorial (ranking e comparativo). */
export function HeatmapSupplementaryCharts({ metric }: { metric: string }) {
  const { heatmapByTerritory } = useSectionChartData();
  const territory = heatmapByTerritory(metric);
  const metricName = heatmapMetricLabel(metric);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Ranking territorial"
        subtitle={`${metricName} — valor absoluto por região`}
        legend={SECTION_CHART_LEGENDS.territoryRanking}
      >
        <BarBlock data={territory} layout="vertical" colorIndex={2} />
      </ChartCard>
      <ChartCard
        title="Comparativo relativo"
        subtitle={`${metricName} — proporcional ao maior valor do recorte`}
        legend={SECTION_CHART_LEGENDS.territoryRanking}
      >
        <BarBlock data={territory} colorIndex={0} />
      </ChartCard>
    </div>
  );
}

export function ClassificationChartSection() {
  const { classificationByCategory, classificationTrend } = useSectionChartData();

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Acurácia por categoria"
        subtitle="Percentual de acerto do modelo"
        legend={SECTION_CHART_LEGENDS.classificationByCategory}
      >
        <BarBlock data={classificationByCategory} colorIndex={4} />
      </ChartCard>
      <ChartCard
        title="Evolução semanal"
        subtitle="Calibração ao longo do tempo"
        legend={SECTION_CHART_LEGENDS.classificationTrend}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={classificationTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => `${Number(v)}%`} />
              <Line type="monotone" dataKey="value" name="Acurácia %" stroke={CHART_COLORS[0]} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>
    </div>
  );
}

export function PaineisOverviewChartSection() {
  const { widgetUsage, savedPanelsTrend } = useSectionChartData();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Widgets mais usados"
        subtitle="Biblioteca do construtor de painéis"
        legend={SECTION_CHART_LEGENDS.widgetUsage}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={widgetUsage} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={88}>
                {widgetUsage.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>
      <ChartCard
        title="Painéis salvos"
        subtitle="Crescimento mensal"
        legend={SECTION_CHART_LEGENDS.savedPanelsTrend}
      >
        <BarBlock data={savedPanelsTrend} colorIndex={1} />
      </ChartCard>
    </div>
  );
}

export function PaineisAdvancedChartSection() {
  const { metricTrends } = useSectionChartData();

  return (
    <ChartCard
      title="Canvas analítico — série multidimensional"
      subtitle="Drill reutilizando filtros globais"
      legend={SECTION_CHART_LEGENDS.paineisCanvas}
    >
      <ChartHeight tall>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={metricTrends} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="volume" name="Volume" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="response" name="Resposta (h)" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartHeight>
    </ChartCard>
  );
}

export function PaineisCreateChartSection() {
  const { panelBuilderFunnel } = useSectionChartData();

  return (
    <ChartCard
      title="Funil do fluxo guiado"
      subtitle="Nome → template → widgets → salvar"
      legend={SECTION_CHART_LEGENDS.panelBuilderFunnel}
    >
      <BarBlock data={panelBuilderFunnel} layout="vertical" colorIndex={3} />
    </ChartCard>
  );
}

export function ReportsManagementChartSection() {
  const { statusBreakdown, volumeTimeSeries } = useSectionChartData();

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Relatos por status"
        subtitle="Fila operacional no recorte atual"
        legend={SECTION_CHART_LEGENDS.statusPipeline}
      >
        <BarBlock
          data={statusBreakdown.map((r) => ({ label: r.label, value: r.value }))}
          layout="vertical"
          colorIndex={0}
        />
      </ChartCard>
      <ChartCard
        title="Entrada diária"
        subtitle="Novos relatos aguardando triagem"
        legend={SECTION_CHART_LEGENDS.volumeTimeSeries}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={volumeTimeSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area
                type="monotone"
                dataKey="volume"
                name="Novos"
                stroke={CHART_COLORS[0]}
                fill={CHART_COLORS[0]}
                fillOpacity={0.2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>
    </div>
  );
}

export function ReferralsChartSection() {
  const { referralFunnel, referralTimeline } = useSectionChartData();

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Funil de encaminhamentos"
        subtitle="Do recebimento à resolução"
        legend={SECTION_CHART_LEGENDS.referralFunnel}
      >
        <BarBlock data={referralFunnel} layout="vertical" colorIndex={1} />
      </ChartCard>
      <ChartCard
        title="Ritmo diário"
        subtitle="Criados vs concluídos"
        legend={SECTION_CHART_LEGENDS.referralTimeline}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={referralTimeline} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="criados" name="Criados" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="concluidos" name="Concluídos" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>
    </div>
  );
}

export function CommissionsChartSection() {
  const { commissionByTheme } = useSectionChartData();

  return (
    <ChartCard
      title="Fila por comissão temática"
      subtitle="Manifestações elegíveis após triagem"
      legend={SECTION_CHART_LEGENDS.commissionByTheme}
    >
      <BarBlock data={commissionByTheme} layout="vertical" colorIndex={2} />
    </ChartCard>
  );
}

export function CouncilMembersChartSection() {
  const { councilMemberQueue } = useSectionChartData();

  return (
    <ChartCard
      title="Encaminhamentos por vereador"
      subtitle="Carga ativa por parlamentar no recorte"
      legend={SECTION_CHART_LEGENDS.councilMemberQueue}
    >
      <BarBlock data={councilMemberQueue} layout="vertical" colorIndex={3} />
    </ChartCard>
  );
}

export function NotificationsChartSection() {
  const { notificationStats } = useSectionChartData();

  return (
    <ChartCard
      title="Entregas de notificações"
      subtitle="Enviadas, entregues e falhas"
      legend={SECTION_CHART_LEGENDS.notificationStats}
    >
      <ChartHeight tall>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={notificationStats} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="enviadas" name="Enviadas" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="entregues" name="Entregues" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="falhas" name="Falhas" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartHeight>
    </ChartCard>
  );
}

export function ExportsChartSection() {
  const { exportActivity } = useSectionChartData();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Exportações por formato"
        subtitle="CSV, planilhas e PDF"
        legend={SECTION_CHART_LEGENDS.exportByFormat}
      >
        <BarBlock data={exportActivity.byFormat} colorIndex={0} />
      </ChartCard>
      <ChartCard
        title="Jobs agendados"
        subtitle="Execuções por semana"
        legend={SECTION_CHART_LEGENDS.exportTimeline}
      >
        <BarBlock data={exportActivity.timeline.map((r) => ({ label: r.label, value: Number(r.jobs) }))} colorIndex={3} />
      </ChartCard>
    </div>
  );
}

export function ServiceCorrectionsChartSection() {
  const { correctionsByStatus } = useSectionChartData();

  return (
    <ChartCard
      title="Correções por status"
      subtitle="Moderação de sugestões cadastrais"
      legend={SECTION_CHART_LEGENDS.correctionsByStatus}
    >
      <BarBlock data={correctionsByStatus} colorIndex={1} />
    </ChartCard>
  );
}

export function AccessibilityChartSection() {
  const { accessibilityAdoption } = useSectionChartData();

  return (
    <ChartCard
      title="Recursos de acessibilidade"
      subtitle="Adoção relativa entre perfis"
      legend={SECTION_CHART_LEGENDS.accessibilityAdoption}
    >
      <BarBlock data={accessibilityAdoption} layout="vertical" colorIndex={4} />
    </ChartCard>
  );
}

export function DocumentationChartSection() {
  const { moduleAccess } = useSectionChartData();

  return (
    <ChartCard
      title="Acessos por módulo"
      subtitle="Onde gestores mais consultam documentação vinculada"
      legend={SECTION_CHART_LEGENDS.moduleAccess}
    >
      <BarBlock data={moduleAccess} layout="vertical" colorIndex={0} />
    </ChartCard>
  );
}

export function AuditChartSection() {
  const { auditByDay } = useSectionChartData();

  return (
    <ChartCard
      title="Eventos de auditoria"
      subtitle="Volume diário no recorte"
      legend={SECTION_CHART_LEGENDS.auditByDay}
    >
      <BarBlock data={auditByDay} colorIndex={2} />
    </ChartCard>
  );
}

export function UsersChartSection() {
  const { usersByRole } = useSectionChartData();

  return (
    <ChartCard
      title="Usuários por perfil"
      subtitle="Distribuição RBAC"
      legend={SECTION_CHART_LEGENDS.usersByRole}
    >
      <ChartHeight>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={usersByRole} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={80}>
              {usersByRole.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartHeight>
    </ChartCard>
  );
}
