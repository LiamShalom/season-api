-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE post_visibility AS ENUM ('public', 'friends', 'private');
CREATE TYPE reaction_type AS ENUM ('love_it', 'want_to_try', 'made_it');
CREATE TYPE tag_category AS ENUM ('cuisine', 'dietary', 'meal_type', 'difficulty');

-- Users
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username         TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  bio              TEXT,
  avatar_url       TEXT,
  is_founding_cook BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_username_trgm ON users USING gin (username gin_trgm_ops);

-- Refresh tokens (store hash, not raw)
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Social graph
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX idx_follows_followee_id ON follows(followee_id);

-- Tags (seeded, not user-created)
CREATE TABLE tags (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL,
  category tag_category NOT NULL,
  UNIQUE (name, category)
);

-- Posts
CREATE TABLE posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_name        TEXT NOT NULL,
  notes            TEXT,
  photo_urls       TEXT[] NOT NULL DEFAULT '{}',
  star_rating      NUMERIC(2,1) NOT NULL CHECK (star_rating BETWEEN 0.5 AND 5.0),
  visibility       post_visibility NOT NULL DEFAULT 'public',
  is_draft         BOOLEAN NOT NULL DEFAULT false,
  adapted_from_url TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_author_id ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_feed      ON posts(created_at DESC) WHERE is_draft = false AND visibility = 'public';
CREATE INDEX idx_posts_dish_trgm ON posts USING gin (dish_name gin_trgm_ops);

-- Post <-> Tag junction
CREATE TABLE post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Reactions (one per user per post)
CREATE TABLE reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type       reaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
