-- ============================================
-- PadelApp — Chat Security Hardening
-- Migración: 002_chat_rate_limit
-- ============================================

-- Rate limit: max 30 messages per minute per user
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  msg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO msg_count
  FROM public.messages
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 minute';

  IF msg_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 30 messages per minute'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_msg_rate ON public.messages;
CREATE TRIGGER check_msg_rate
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_message_rate_limit();

-- Index to speed up the rate limit check
CREATE INDEX IF NOT EXISTS idx_messages_user_created
  ON public.messages(user_id, created_at DESC);

-- Index to speed up unread count queries
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON public.messages(conversation_id, user_id, read)
  WHERE read = false;
