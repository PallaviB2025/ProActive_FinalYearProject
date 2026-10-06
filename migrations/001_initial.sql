CREATE TABLE users (
 id uuid PRIMARY KEY,
 email text NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_id ON sessions(user_id);
CREATE TABLE vaults (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 metadata jsonb NOT NULL
);
CREATE TABLE credentials (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES vaults(user_id) ON DELETE CASCADE,
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credentials_user_id ON credentials(user_id);
