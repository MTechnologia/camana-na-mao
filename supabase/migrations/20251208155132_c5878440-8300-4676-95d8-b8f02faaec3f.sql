-- Enable realtime for N8N integration logs
ALTER TABLE n8n_integration_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE n8n_integration_logs;