CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_type text,
  backed_up boolean DEFAULT false,
  transports text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webauthn_user_id ON webauthn_credentials(user_id);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, purpose)
);
