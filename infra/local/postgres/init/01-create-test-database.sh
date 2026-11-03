#!/bin/sh
# Runs once, when the Postgres data volume is first initialised.
# Creates a separate database for automated integration tests so test runs
# never touch local development data.
# Plain `set -e`: the Postgres entrypoint may source this file instead of executing it.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE DATABASE "$POSTGRES_TEST_DB" OWNER "$POSTGRES_USER";
SQL
