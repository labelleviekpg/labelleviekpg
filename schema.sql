-- Les messages du formulaire de contact.
CREATE TABLE IF NOT EXISTS messages (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  recu    TEXT    NOT NULL,          -- date ISO de reception
  nom     TEXT    NOT NULL,
  mail    TEXT    NOT NULL,
  tel     TEXT,
  sujet   TEXT,
  message TEXT    NOT NULL,
  ip      TEXT,
  envoye  INTEGER NOT NULL DEFAULT 0 -- 1 si le mail est parti
);
CREATE INDEX IF NOT EXISTS i_messages_recu ON messages (recu DESC);
