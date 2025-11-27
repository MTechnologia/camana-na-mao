import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardCard } from '@/components/analytics/DashboardCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DashboardPreview } from '@/components/analytics/DashboardPreview';
import { AdminLayout } from '@/layouts/AdminLayout';

interface Dashboard {
  id: string;
  title: string;
  description: string | null;
  config: any;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export default function AdminPublicDashboards() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    fetchPublicDashboards();
  }, []);

  const fetchPublicDashboards = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('dashboards')
        .select('id, title, description, config, created_at, user_id')
        .eq('is_public', true)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const dashboardsWithProfiles = data?.map(dashboard => ({
        ...dashboard,
        profiles: profilesData?.find(p => p.id === dashboard.user_id),
      }));

      setDashboards(dashboardsWithProfiles || []);
    } catch (error: any) {
      console.error('Error fetching public dashboards:', error);
      toast.error('Erro ao carregar painéis públicos');
    } finally {
      setLoading(false);
    }
  };

  const filteredDashboards = dashboards.filter(dashboard =>
    dashboard.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dashboard.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDashboard = (id: string) => {
    const dashboard = dashboards.find(d => d.id === id);
    if (dashboard) {
      setSelectedDashboard(dashboard);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/dashboards')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Galeria de Painéis Públicos
            </h1>
            <p className="text-muted-foreground mt-2">
              Explore dashboards analíticos aprovados criados pela comunidade
            </p>
          </div>
          <Button onClick={() => navigate('/admin/dashboards/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Novo
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar painéis públicos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredDashboards.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? 'Nenhum painel encontrado com esse termo'
                : 'Nenhum painel público disponível ainda'}
            </p>
            <Button onClick={() => navigate('/admin/dashboards/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Criar o primeiro painel
            </Button>
          </div>
        )}

        {/* Dashboard Grid */}
        {!loading && filteredDashboards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDashboards.map(dashboard => (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                onView={handleViewDashboard}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full Screen Preview Dialog */}
      <Dialog open={!!selectedDashboard} onOpenChange={() => setSelectedDashboard(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedDashboard?.title}</DialogTitle>
            {selectedDashboard?.description && (
              <p className="text-sm text-muted-foreground">
                {selectedDashboard.description}
              </p>
            )}
          </DialogHeader>
          <div className="mt-4">
            <DashboardPreview config={selectedDashboard?.config} />
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
