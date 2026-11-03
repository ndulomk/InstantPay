-- Docker Compose overrides for the local-development seed in
-- packages/admin-dashboard/init.sql.
UPDATE admin_services
SET base_url = 'http://core-banking:9999'
WHERE name = 'core-banking';

UPDATE admin_services
SET base_url = 'http://gateway-api:9998'
WHERE name = 'gateway-api';

UPDATE admin_services
SET base_url = 'http://payment-processor:9997'
WHERE name = 'payment-processor';

UPDATE admin_services
SET base_url = 'http://fraud-detection:9996'
WHERE name = 'fraud-detection';

UPDATE admin_services
SET base_url = 'http://notification-service:9995'
WHERE name = 'notification-service';

UPDATE admin_services
SET base_url = 'http://reconciliation:9994'
WHERE name = 'reconciliation';
