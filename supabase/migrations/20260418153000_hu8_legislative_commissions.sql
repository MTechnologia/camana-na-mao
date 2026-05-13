-- HU-8.2: comissões legislativas (referência para encaminhamento inteligente + admin).
-- HU-8.3: FK opcional em council_member_referrals.

CREATE TABLE public.legislative_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  match_keywords TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.legislative_commissions IS
  'HU-8.2: comissões permanentes/temáticas da Câmara para orientar encaminhamento a vereadores (keywords casam com areasDeAtuacao).';

CREATE INDEX idx_legislative_commissions_active_sort
  ON public.legislative_commissions (active, sort_order, name);

ALTER TABLE public.legislative_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legislative_commissions_select_authenticated"
  ON public.legislative_commissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "legislative_commissions_staff_all"
  ON public.legislative_commissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'gestor')
    )
  );

CREATE TRIGGER update_legislative_commissions_updated_at
  BEFORE UPDATE ON public.legislative_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Dados iniciais (ajustáveis no admin)
INSERT INTO public.legislative_commissions (code, name, description, match_keywords, sort_order) VALUES
  ('financas', 'Comissão de Finanças e Orçamento', 'Finanças públicas, orçamento, execução fiscal.', ARRAY['finanças', 'financas', 'orçamento', 'orcamento', 'tribut', 'imposto', 'dívida', 'divida'], 10),
  ('saude', 'Comissão de Saúde', 'Políticas de saúde, UBS, hospitais, atenção primária.', ARRAY['saúde', 'saude', 'ubs', 'hospital', 'sus', 'vacina', 'atendimento médico', 'médico', 'medico'], 20),
  ('educacao', 'Comissão de Educação e Cultura', 'Educação básica, CEUs, cultura, esportes escolares.', ARRAY['educação', 'educacao', 'escola', 'creche', 'emef', 'ceu', 'professor', 'aluno', 'cultura'], 30),
  ('urbanismo', 'Comissão de Urbanismo', 'Planejamento urbano, obras, mobilidade viária.', ARRAY['urbanismo', 'obra', 'asfalto', 'calçada', 'calcada', 'paviment', 'zoneamento', 'via'], 40),
  ('meio_ambiente', 'Comissão de Meio Ambiente', 'Meio ambiente, áreas verdes, resíduos.', ARRAY['meio ambiente', 'lixo', 'árvore', 'arvore', 'parque', 'poluição', 'poluicao', 'verde'], 50),
  ('direitos_humanos', 'Comissão de Direitos Humanos e Cidadania', 'Direitos humanos, acessibilidade, inclusão.', ARRAY['direitos humanos', 'acessibilidade', 'cidadania', 'discrimin', 'violência', 'violencia'], 60),
  ('seguranca', 'Comissão de Segurança Pública', 'Segurança urbana, iluminação pública relacionada a segurança.', ARRAY['segurança', 'seguranca', 'polícia', 'policia', 'assalto', 'iluminação pública'], 70),
  ('transporte', 'Comissão de Trânsito, Transporte e Atividade Econômica', 'Transporte coletivo, metrô, ônibus.', ARRAY['transporte', 'ônibus', 'onibus', 'metro', 'sptrans', 'atraso', 'lotacao', 'lotação'], 80)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.council_member_referrals
  ADD COLUMN IF NOT EXISTS legislative_commission_id UUID REFERENCES public.legislative_commissions (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.council_member_referrals.legislative_commission_id IS
  'HU-8.3: comissão escolhida pelo cidadão no wizard de encaminhamento (opcional).';

CREATE INDEX IF NOT EXISTS idx_council_member_referrals_commission
  ON public.council_member_referrals (legislative_commission_id)
  WHERE legislative_commission_id IS NOT NULL;
