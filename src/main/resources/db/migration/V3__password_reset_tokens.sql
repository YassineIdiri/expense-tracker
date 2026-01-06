CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    token_hash VARCHAR(128) NOT NULL UNIQUE,

    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    used_at TIMESTAMP,

    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_prt_token_hash
    ON password_reset_tokens (token_hash);

CREATE INDEX idx_prt_user_id
    ON password_reset_tokens (user_id);

CREATE INDEX idx_prt_expires_at
    ON password_reset_tokens (expires_at);
