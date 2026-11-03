FROM postgres:16-alpine

# Each service owns its schema. The files run once, in filename order, when the
# Postgres data directory is first initialised.
COPY packages/core-banking/init.sql /docker-entrypoint-initdb.d/01-core-banking.sql
COPY packages/gateway-api/init.sql /docker-entrypoint-initdb.d/02-gateway-api.sql
COPY packages/payment-processor/init.sql /docker-entrypoint-initdb.d/03-payment-processor.sql
COPY packages/fraud-detection/init.sql /docker-entrypoint-initdb.d/04-fraud-detection.sql
COPY packages/notification-service/init.sql /docker-entrypoint-initdb.d/05-notification-service.sql
COPY packages/reconciliation/init.sql /docker-entrypoint-initdb.d/06-reconciliation.sql
COPY packages/admin-dashboard/init.sql /docker-entrypoint-initdb.d/07-admin-dashboard.sql

# The seed above uses 127.0.0.1 because it is also used for local development.
# Inside Compose, the services are addressed by their Compose service names.
COPY docker/postgres/99-docker-upstreams.sql /docker-entrypoint-initdb.d/99-docker-upstreams.sql
