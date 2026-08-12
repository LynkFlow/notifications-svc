# Database migrations

Add immutable, sequential SQL files here, beginning with `001_`.

The migration runner applies files in lexical order, records their SHA-256
checksums in `schema_migrations`, and rejects changes to migrations that have
already been applied.
