-- Allow admins to delete referrals
CREATE POLICY "Admins can delete referrals" 
ON public.council_member_referrals 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));