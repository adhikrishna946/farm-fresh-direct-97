import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, Clock, XCircle, FileImage } from 'lucide-react';

interface KisanCardUploadProps {
  kisanCardUrl: string | null;
  verificationStatus: string;
  onUploaded: () => void;
}

export default function KisanCardUpload({ kisanCardUrl, verificationStatus, onUploaded }: KisanCardUploadProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !profile) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/kisan-card-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kisan-cards')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('kisan-cards')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          kisan_card_url: urlData.publicUrl,
          verification_status: 'pending',
        } as any)
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast({
        title: 'Kisan Card uploaded!',
        description: 'Your document has been submitted for verification.',
      });
      setFile(null);
      onUploaded();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const statusConfig = {
    pending: { icon: Clock, label: 'Pending Verification ⏳', variant: 'secondary' as const, color: 'text-amber-600' },
    approved: { icon: CheckCircle, label: 'Verified Farmer ✅', variant: 'default' as const, color: 'text-green-600' },
    rejected: { icon: XCircle, label: 'Verification Rejected ❌', variant: 'destructive' as const, color: 'text-red-600' },
  };

  const status = statusConfig[verificationStatus as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            Kisan Card Verification
          </span>
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {kisanCardUrl && (
          <div className="space-y-2">
            <Label>Uploaded Kisan Card</Label>
            <div className="rounded-lg border overflow-hidden max-w-sm">
              <img src={kisanCardUrl} alt="Kisan Card" className="w-full h-auto object-contain" />
            </div>
          </div>
        )}

        {verificationStatus === 'rejected' && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              Your Kisan Card was rejected. Please upload a clear, valid Kisan Card image.
            </p>
          </div>
        )}

        {verificationStatus !== 'approved' && (
          <div className="space-y-3">
            <Label htmlFor="kisan-card">
              {kisanCardUrl ? 'Re-upload Kisan Card' : 'Upload Kisan Card'}
            </Label>
            <Input
              id="kisan-card"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload & Submit'}
            </Button>
          </div>
        )}

        {!kisanCardUrl && verificationStatus === 'pending' && (
          <p className="text-sm text-muted-foreground">
            Upload your Kisan Card to get verified and start selling products.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
