-- ============================================
-- PadelApp — Schema Completo
-- Migración: 001_initial_schema
-- Fecha: 2026-05-17
-- ============================================

-- Drop old tables if they exist (from prior migrations 001-004)
DROP TABLE IF EXISTS public.match_players CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.courts CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_members CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.comment_reactions CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.post_reactions CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP VIEW IF EXISTS public.posts_with_counts CASCADE;

-- ============================================
-- 1. PROFILES (extiende auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_emoji TEXT DEFAULT '🏓',
  level TEXT DEFAULT 'Principiante' CHECK (level IN ('Principiante', 'Intermedio', 'Avanzado', 'Pro')),
  position TEXT DEFAULT 'Ambos' CHECK (position IN ('Revés', 'Drive', 'Ambos')),
  elo INTEGER DEFAULT 1200,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger: auto-crear profile cuando se registra un user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_emoji)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Jugador'),
    '🏓'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 2. POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  image_url TEXT,
  location TEXT,
  match_result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

-- ============================================
-- 3. POST REACTIONS (like, dislike, repost)
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'dislike', 'repost')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id, type)
);

CREATE INDEX idx_post_reactions_post ON public.post_reactions(post_id);

-- ============================================
-- 4. COMMENTS (threaded)
-- ============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);

-- ============================================
-- 5. COMMENT REACTIONS (like)
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- ============================================
-- 6. CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 7. CONVERSATION MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_members_user ON public.conversation_members(user_id);

-- ============================================
-- 8. MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 5000),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conv ON public.messages(conversation_id, created_at);

-- ============================================
-- 9. MESSAGE REACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- ============================================
-- 10. COURTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  price_per_hour INTEGER NOT NULL DEFAULT 2000,
  currency TEXT DEFAULT 'USD',
  total_courts INTEGER DEFAULT 1,
  available_courts INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  image_url TEXT,
  featured BOOLEAN DEFAULT false,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. BOOKINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookings_court ON public.bookings(court_id, date);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);

-- ============================================
-- 12. MATCHES
-- ============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES public.courts(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('manual', 'random', 'challenge')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  score_team1 TEXT,
  score_team2 TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_matches_creator ON public.matches(created_by);
CREATE INDEX idx_matches_status ON public.matches(status);

-- ============================================
-- 13. MATCH PLAYERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.match_players (
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team INTEGER CHECK (team IN (1, 2)),
  PRIMARY KEY (match_id, user_id)
);

-- ============================================
-- VIEW: post con conteos de reacciones
-- ============================================
CREATE OR REPLACE VIEW public.posts_with_counts AS
SELECT
  p.*,
  pr.display_name AS author_name,
  pr.username AS author_username,
  pr.avatar_emoji AS author_avatar,
  COALESCE(likes.cnt, 0) AS like_count,
  COALESCE(dislikes.cnt, 0) AS dislike_count,
  COALESCE(reposts.cnt, 0) AS repost_count,
  COALESCE(comments.cnt, 0) AS comment_count
FROM public.posts p
JOIN public.profiles pr ON pr.id = p.user_id
LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM public.post_reactions WHERE type = 'like' GROUP BY post_id) likes ON likes.post_id = p.id
LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM public.post_reactions WHERE type = 'dislike' GROUP BY post_id) dislikes ON dislikes.post_id = p.id
LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM public.post_reactions WHERE type = 'repost' GROUP BY post_id) reposts ON reposts.post_id = p.id
LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM public.comments GROUP BY post_id) comments ON comments.post_id = p.id;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- POSTS
CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- POST REACTIONS
CREATE POLICY "Post reactions are viewable by everyone" ON public.post_reactions
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON public.post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.post_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS
CREATE POLICY "Comments are viewable by everyone" ON public.comments
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- COMMENT REACTIONS
CREATE POLICY "Comment reactions viewable by everyone" ON public.comment_reactions
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react to comments" ON public.comment_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own comment reactions" ON public.comment_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- CONVERSATIONS
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid())
  );
CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- CONVERSATION MEMBERS
CREATE POLICY "Members can view conversation members" ON public.conversation_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Authenticated users can add members" ON public.conversation_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MESSAGES
CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );
CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = user_id);

-- MESSAGE REACTIONS
CREATE POLICY "Message reactions viewable by conversation members" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can react to messages" ON public.message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own message reactions" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- COURTS (public read)
CREATE POLICY "Courts are viewable by everyone" ON public.courts
  FOR SELECT USING (true);

-- BOOKINGS
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- MATCHES
CREATE POLICY "Matches are viewable by everyone" ON public.matches
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update match" ON public.matches
  FOR UPDATE USING (auth.uid() = created_by);

-- MATCH PLAYERS
CREATE POLICY "Match players viewable by everyone" ON public.match_players
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join matches" ON public.match_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave matches" ON public.match_players
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SEED DATA: Courts
-- ============================================
INSERT INTO public.courts (name, address, lat, lng, price_per_hour, currency, total_courts, available_courts, tags, rating, review_count, featured)
VALUES
  ('Club Padel Norte', 'Av. Principal #45, Sector Norte', 10.497, -66.85, 2500, 'USD', 6, 3, ARRAY['Techado', 'Cristal', 'Cafetería'], 4.8, 127, true),
  ('Arena Padel Center', 'Calle 8, Av. Libertador', 10.502, -66.845, 2000, 'USD', 4, 1, ARRAY['Aire libre'], 4.5, 89, false),
  ('PadelSport Premium', 'CC MegaPlaza, Nivel -1', 10.49, -66.855, 3500, 'USD', 8, 0, ARRAY['Premium', 'Tienda', 'Pro Shop'], 4.9, 243, false),
  ('Club Deportivo El Sol', 'Urb. El Sol, Calle 3', 10.505, -66.84, 1800, 'USD', 3, 2, ARRAY['Aire libre', 'Iluminación'], 4.2, 56, false),
  ('Padel House', 'Av. Bolívar, Torre Elite PB', 10.488, -66.86, 3000, 'USD', 5, 4, ARRAY['Techado', 'Premium', 'Duchas'], 4.7, 178, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
