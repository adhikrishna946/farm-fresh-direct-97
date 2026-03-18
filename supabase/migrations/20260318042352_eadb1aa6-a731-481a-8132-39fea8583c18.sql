
-- Add kisan_card_url and verification_status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kisan_card_url text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';

-- Create storage bucket for kisan cards
INSERT INTO storage.buckets (id, name, public) VALUES ('kisan-cards', 'kisan-cards', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for kisan-cards bucket: users can upload their own files
CREATE POLICY "Users can upload kisan cards" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kisan-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view kisan cards" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'kisan-cards');
