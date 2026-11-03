#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DOCKERHUB_USER="${DOCKERHUB_USER:-eddiendulo}"
TAG="${TAG:-latest}"
SHA_TAG="${SHA_TAG:-sha-$(git rev-parse --short HEAD)}"

SERVICES=(
  postgres
  core-banking
  gateway-api
  payment-processor
  fraud-detection
  notification-service
  reconciliation
  admin-dashboard
)

echo "Building images as ${DOCKERHUB_USER}/instantpay-*:${TAG}"
DOCKERHUB_USER="$DOCKERHUB_USER" TAG="$TAG" docker compose build

for service in "${SERVICES[@]}"; do
  image="${DOCKERHUB_USER}/instantpay-${service}:${TAG}"
  docker tag "$image" "${DOCKERHUB_USER}/instantpay-${service}:${SHA_TAG}"
done

for service in "${SERVICES[@]}"; do
  echo "Pushing ${DOCKERHUB_USER}/instantpay-${service}:${TAG}"
  docker push "${DOCKERHUB_USER}/instantpay-${service}:${TAG}"
  echo "Pushing ${DOCKERHUB_USER}/instantpay-${service}:${SHA_TAG}"
  docker push "${DOCKERHUB_USER}/instantpay-${service}:${SHA_TAG}"
done

echo "Published all images with tags '${TAG}' and '${SHA_TAG}'."
