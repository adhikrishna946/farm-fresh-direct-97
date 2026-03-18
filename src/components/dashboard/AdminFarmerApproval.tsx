import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Tractor, FileImage, Eye } from 'lucide-react';

interface FarmerProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_verified: boolean | null;
  kisan_card_url: string | null;
  verification_status: string | null;
  created_at: string;
}

export default function AdminFarmerApproval() {
  const { toast } = useToast();
  const [farmers, setFarmers] = useState<FarmerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_verified, kisan_card_url, verification_status, created_at')
      .eq('role', 'farmer')
      .order('created_at', { ascending: false });

    if (data) setFarmers(data as FarmerProfile[]);
    setIsLoading(false);
  };

  const updateFarmerStatus = async (farmerId: string, approve: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: approve,
        verification_status: approve ? 'approved' : 'rejected',
      } as any)
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

  const getStatusBadge = (farmer: FarmerProfile) => {
    if (farmer.verification_status === 'approved' || farmer.is_verified) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Verified ✅</Badge>;
    }
    if (farmer.verification_status === 'rejected') {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending ⏳</Badge>;
  };

  const pendingFarmers = farmers.filter(f => !f.is_verified && f.verification_status !== 'rejected');
  const approvedFarmers = farmers.filter(f => f.is_verified || f.verification_status === 'approved');
  const rejectedFarmers = farmers.filter(f => f.verification_status === 'rejected' && !f.is_verified);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="pt-6"><div className="h-24 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tractor className="w-5 h-5" />
            Farmer Verification ({pendingFarmers.length} pending)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {farmers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No farmer registrations yet.</p>
          )}

          {pendingFarmers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" /> Pending Verification
              </h4>
              {pendingFarmers.map((farmer) => (
                <div key={farmer.id} className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{farmer.full_name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground">{farmer.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Registered {new Date(farmer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(farmer)}
                  </div>

                  {/* Kisan Card Preview */}
                  <div className="mb-3">
                    {farmer.kisan_card_url ? (
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-14 rounded border overflow-hidden bg-muted">
                          <img src={farmer.kisan_card_url} alt="Kisan Card" className="w-full h-full object-cover" />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setPreviewImage(farmer.kisan_card_url)}
                        >
                          <Eye className="w-3 h-3" /> View Kisan Card
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileImage className="w-4 h-4" />
                        <span className="text-sm">No Kisan Card uploaded</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateFarmerStatus(farmer.id, true)}
                      className="gap-1"
                      disabled={!farmer.kisan_card_url}
                    >
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
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified ✅
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {rejectedFarmers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Rejected</h4>
              {rejectedFarmers.map((farmer) => (
                <div key={farmer.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-destructive">
                        {farmer.full_name?.[0] || farmer.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{farmer.full_name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{farmer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Rejected</Badge>
                    <Button size="sm" variant="outline" onClick={() => updateFarmerStatus(farmer.id, true)}>
                      Re-approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-size Kisan Card Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kisan Card</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img src={previewImage} alt="Kisan Card" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
