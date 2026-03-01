import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Tractor } from 'lucide-react';

interface FarmerProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_verified: boolean | null;
  created_at: string;
}

export default function AdminFarmerApproval() {
  const { toast } = useToast();
  const [farmers, setFarmers] = useState<FarmerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_verified, created_at')
      .eq('role', 'farmer')
      .order('created_at', { ascending: false });

    if (data) setFarmers(data as FarmerProfile[]);
    setIsLoading(false);
  };

  const updateFarmerStatus = async (farmerId: string, approve: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: approve })
      .eq('id', farmerId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({
        title: approve ? 'Farmer Approved' : 'Farmer Rejected',
        description: approve
          ? 'The farmer can now add products.'
          : 'The farmer has been rejected.',
      });
      fetchFarmers();
    }
  };

  const pendingFarmers = farmers.filter(f => !f.is_verified);
  const approvedFarmers = farmers.filter(f => f.is_verified);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="pt-6"><div className="h-24 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tractor className="w-5 h-5" />
          Farmer Approval ({pendingFarmers.length} pending)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {farmers.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No farmer registrations yet.</p>
        )}

        {pendingFarmers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" /> Pending Approval
            </h4>
            {pendingFarmers.map((farmer) => (
              <div key={farmer.id} className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                <div>
                  <p className="font-medium">{farmer.full_name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{farmer.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Registered {new Date(farmer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateFarmerStatus(farmer.id, true)} className="gap-1">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateFarmerStatus(farmer.id, false)} className="gap-1">
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {approvedFarmers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Approved Farmers</h4>
            {approvedFarmers.map((farmer) => (
              <div key={farmer.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {farmer.full_name?.[0] || farmer.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{farmer.full_name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground">{farmer.email}</p>
                  </div>
                </div>
                <Badge variant="default">Approved</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
