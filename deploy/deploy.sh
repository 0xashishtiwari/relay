#!/usr/bin/env bash
#
# One-shot Azure deploy for Relay.
#
#   cp deploy/deploy.env.example deploy/deploy.env   # fill secrets first
#   bash deploy/deploy.sh                            # full infra + build + deploy
#   SKIP_BUILD=1 bash deploy/deploy.sh               # redeploy config only
#   DESTROY=1 bash deploy/deploy.sh                  # delete the resource group
#
# Requires: Azure CLI (+ containerapp extension), Docker not needed (ACR builds).
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="deploy/deploy.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/deploy.env.example and fill it in."
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

: "${RG:?set RG in $ENV_FILE}" "${LOC:?}" "${REG:?}" "${CAENV:?}"
: "${TAG:=latest}"

log()  { echo -e "\n==> $*"; }
need() { local v; v="$(printenv "$1" || true)"; [[ -n "$v" ]] || { echo "Missing required $1 in $ENV_FILE"; exit 1; }; }
for v in COSMOS_ACCOUNT REDIS_NAME STORAGE_ACCOUNT STORAGE_CONTAINER \
         FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY \
         RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET; do need "$v"; done

if [[ "${DESTROY:-0}" == "1" ]]; then
  log "Deleting resource group $RG (irreversible)"
  az group delete -n "$RG" --yes --no-wait
  exit 0
fi

# ---------- 0. Providers ----------
log "Registering providers"
az provider register -n Microsoft.App --wait >/dev/null
az provider register -n Microsoft.OperationalInsights --wait >/dev/null

# ---------- 1. Resource group + registry + environment ----------
log "Resource group + ACR + Container Apps environment"
az group create -n "$RG" -l "$LOC" -o none
az acr create -g "$RG" -n "$REG" --sku Basic --admin-enabled true -o none 2>/dev/null || true
az containerapp env create -g "$RG" -n "$CAENV" -l "$LOC" -o none 2>/dev/null || true

DOMAIN="$(az containerapp env show -g "$RG" -n "$CAENV" --query properties.defaultDomain -o tsv)"
log "Environment domain: $DOMAIN"
REG_FQDN="$REG.azurecr.io"
az acr login -n "$REG" >/dev/null

# Deterministic internal URLs (no ordering problem between services).
URL_AUTH="http://relay-auth.$DOMAIN:4001"
URL_CHAT="http://relay-chat.$DOMAIN:4002"
URL_AGENT="http://relay-agent.$DOMAIN:4003"
URL_BILLING="http://relay-billing.$DOMAIN:4004"
URL_GATEWAY="https://relay-gateway.$DOMAIN"
[[ -n "${GATEWAY_DOMAIN:-}" ]] && URL_GATEWAY="https://$GATEWAY_DOMAIN"
URL_WEB="https://relay-web.$DOMAIN"
[[ -n "${WEB_DOMAIN:-}" ]] && URL_WEB="https://$WEB_DOMAIN"

# ---------- 2. Data services ----------
log "Cosmos DB (Mongo API)"
COSMOS_ARGS=(-g "$RG" -n "$COSMOS_ACCOUNT" --kind MongoDB --server-version 4.2)
[[ "${COSMOS_FREE_TIER:-false}" == "true" ]] && COSMOS_ARGS+=(--enable-free-tier)
az cosmosdb create "${COSMOS_ARGS[@]}" -o none 2>/dev/null || true
MONGO_URI="$(az cosmosdb keys list -g "$RG" -n "$COSMOS_ACCOUNT" --type connection-strings \
  --query 'connectionStrings[0].connectionString' -o tsv)"
[[ "$MONGO_URI" == *"retrywrites"* ]] || MONGO_URI="$MONGO_URI?retrywrites=false"

log "Azure Cache for Redis (Standard = persistence for sessions)"
az redis create -g "$RG" -n "$REDIS_NAME" -l "$LOC" --sku Standard --vm-size c1 -o none 2>/dev/null || true
REDIS_HOST="$(az redis show -g "$RG" -n "$REDIS_NAME" --query hostName -o tsv)"
REDIS_KEY="$(az redis list-keys -g "$RG" -n "$REDIS_NAME" --query primaryKey -o tsv)"
REDIS_URL="rediss://:$REDIS_KEY@$REDIS_HOST:6380"

log "Storage account + container"
az storage account create -g "$RG" -n "$STORAGE_ACCOUNT" -l "$LOC" --sku Standard_LRS \
  --kind StorageV2 -o none 2>/dev/null || true
STORAGE_CONN="$(az storage account show-connection-string -g "$RG" -n "$STORAGE_ACCOUNT" -o tsv)"
az storage container create -n "$STORAGE_CONTAINER" --connection-string "$STORAGE_CONN" -o none 2>/dev/null || true

# ---------- 3. Build images ----------
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  log "Building backend images in ACR"
  for svc in gateway auth chat billing agent; do
    az acr build -r "$REG" -t "relay-$svc:$TAG" \
      -f Dockerfile.backend --build-arg SERVICE="$svc" . 
  done
  log "Building web image (NEXT_PUBLIC_* baked in)"
  az acr build -r "$REG" -t "relay-web:$TAG" -f apps/web/Dockerfile \
    --build-arg NEXT_PUBLIC_SERVER_URL="$URL_GATEWAY" \
    --build-arg NEXT_PUBLIC_RAZORPAY_KEY_ID="$NEXT_PUBLIC_RAZORPAY_KEY_ID" \
    --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
    --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
    --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
    --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
    --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
    --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
    --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID" \
    .
else
  log "SKIP_BUILD=1 — reusing existing images"
fi

# ---------- 4. Deploy helper (create or update) ----------
app_exists() { az containerapp show -g "$RG" -n "$1" &>/dev/null; }

# deploy_app <name> <image> <port> <ingress:internal|external> <cpu> <mem> <min> <max> <envArray> <secretArray>
deploy_app() {
  local name="$1" image="$2" port="$3" ingress="$4" cpu="$5" mem="$6" min="$7" max="$8"
  local -n envs="$9" secs="${10}"
  log "Deploying $name ($image)"
  if app_exists "$name"; then
    if [[ "${#secs[@]}" -gt 0 ]]; then
      az containerapp secret set -g "$RG" -n "$name" --secrets "${secs[@]}" -o none
    fi
    az containerapp update -g "$RG" -n "$name" --image "$image" \
      --cpu "$cpu" --memory "$mem" --min-replicas "$min" --max-replicas "$max" \
      --replace-env-vars "${envs[@]}" -o none
  else
    local create_args=(-g "$RG" -n "$name" --environment "$CAENV"
      --image "$image" --registry-server "$REG_FQDN"
      --ingress "$ingress" --target-port "$port" --transport http
      --cpu "$cpu" --memory "$mem" --min-replicas "$min" --max-replicas "$max")
    if [[ "${#secs[@]}" -gt 0 ]]; then
      create_args+=(--secrets "${secs[@]}")
    fi
    create_args+=(--env-vars "${envs[@]}")
    az containerapp create "${create_args[@]}" -o none
  fi
}

COMMON_SECRETS=( "mongo-uri=$MONGO_URI" "redis-url=$REDIS_URL" )

# ---------- 5. Backends (internal) ----------
AUTH_ENV=( PORT=4001 NODE_ENV=production
  "MONGODB_URI=secretref:mongo-uri" "REDIS_URL=secretref:redis-url"
  "FIREBASE_PROJECT_ID=secretref:fb-project" "FIREBASE_CLIENT_EMAIL=secretref:fb-email"
  "FIREBASE_PRIVATE_KEY=secretref:fb-key" )
AUTH_SECRETS=( "${COMMON_SECRETS[@]}"
  "fb-project=$FIREBASE_PROJECT_ID" "fb-email=$FIREBASE_CLIENT_EMAIL" "fb-key=$FIREBASE_PRIVATE_KEY" )
deploy_app relay-auth "$REG_FQDN/relay-auth:$TAG" 4001 internal 0.5 1Gi 1 3 AUTH_ENV AUTH_SECRETS

CHAT_ENV=( PORT=4002 NODE_ENV=production
  "MONGODB_URI=secretref:mongo-uri" "REDIS_URL=secretref:redis-url" )
deploy_app relay-chat "$REG_FQDN/relay-chat:$TAG" 4002 internal 0.5 1Gi 0 3 CHAT_ENV COMMON_SECRETS

AGENT_ENV=( PORT=4003 NODE_ENV=production
  "MONGODB_URI=secretref:mongo-uri" "REDIS_URL=secretref:redis-url"
  "CHAT_SERVICE_URL=$URL_CHAT" "AUTH_SERVICE_URL=$URL_AUTH"
  "AZURE_STORAGE_CONNECTION_STRING=secretref:az-conn" "AZURE_STORAGE_CONTAINER_NAME=$STORAGE_CONTAINER" )
AGENT_SECRETS=( "${COMMON_SECRETS[@]}" "az-conn=$STORAGE_CONN" )
deploy_app relay-agent "$REG_FQDN/relay-agent:$TAG" 4003 internal 1.0 2Gi 1 3 AGENT_ENV AGENT_SECRETS

BILLING_ENV=( PORT=4004 NODE_ENV=production
  "MONGODB_URI=secretref:mongo-uri" "REDIS_URL=secretref:redis-url"
  "AUTH_SERVICE_URL=$URL_AUTH"
  "RAZORPAY_KEY_ID=secretref:rz-id" "RAZORPAY_KEY_SECRET=secretref:rz-secret" )
BILLING_SECRETS=( "${COMMON_SECRETS[@]}" "rz-id=$RAZORPAY_KEY_ID" "rz-secret=$RAZORPAY_KEY_SECRET" )
deploy_app relay-billing "$REG_FQDN/relay-billing:$TAG" 4004 internal 0.5 1Gi 0 3 BILLING_ENV BILLING_SECRETS

# ---------- 6. Gateway (external) ----------
GATEWAY_ENV=( PORT=4000 NODE_ENV=production FRONTEND_URL="$URL_WEB"
  "REDIS_URL=secretref:redis-url"
  "AUTH_SERVICE_URL=$URL_AUTH" "CHAT_SERVICE_URL=$URL_CHAT"
  "AGENT_SERVICE_URL=$URL_AGENT" "BILLING_SERVICE_URL=$URL_BILLING" )
deploy_app relay-gateway "$REG_FQDN/relay-gateway:$TAG" 4000 external 0.5 1Gi 1 3 GATEWAY_ENV COMMON_SECRETS

# ---------- 7. Web (external, no secrets needed at runtime) ----------
WEB_ENV=( PORT=3000 NODE_ENV=production )
WEB_SECRETS=()
deploy_app relay-web "$REG_FQDN/relay-web:$TAG" 3000 external 0.5 1Gi 1 3 WEB_ENV WEB_SECRETS

# ---------- 8. Custom domains (DNS CNAME must exist first) ----------
bind_domain() { # $1 app, $2 hostname
  [[ -z "$2" ]] && return 0
  log "Binding $2 → $1"
  az containerapp hostname add -g "$RG" -n "$1" --hostname "$2" -o none
  az containerapp hostname bind -g "$RG" -n "$1" --hostname "$2" --environment "$CAENV" -o none
  echo "NOTE: FRONTEND_URL/NEXT_PUBLIC_SERVER_URL must match the custom domains —"
  echo "set WEB_DOMAIN/GATEWAY_DOMAIN in $ENV_FILE and re-run (web image rebuilds)."
}
bind_domain relay-web "${WEB_DOMAIN:-}"
bind_domain relay-gateway "${GATEWAY_DOMAIN:-}"

# ---------- 9. Report ----------
log "Done. Endpoints:"
echo "  web:     $URL_WEB"
echo "  gateway: $URL_GATEWAY/health"
echo "Verify: login → send message → upload PDF → Razorpay test checkout."
echo "Logs:   az containerapp logs show -g $RG -n relay-agent --follow"
