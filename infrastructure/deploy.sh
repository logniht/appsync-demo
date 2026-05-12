#!/usr/bin/env bash
#
# Despliega (o actualiza) la demo completa en una sola cuenta/region.
# Uso:
#   ./deploy.sh                        # valores por defecto
#   ./deploy.sh --region eu-west-1 --stack-name mi-demo --api-key-days 14
#
# Requiere: aws CLI v2, permisos para CloudFormation + IAM + AppSync + Lambda + Scheduler

set -euo pipefail

# ---------- Defaults ----------
STACK_NAME="appsync-events-demo"
REGION="eu-west-1"
PROJECT_NAME="appsync-events-demo"
API_KEY_DAYS=7
SCHEDULE_EXPRESSION="rate(1 minute)"

# ---------- Parse args ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack-name)     STACK_NAME="$2"; shift 2 ;;
    --region)         REGION="$2"; shift 2 ;;
    --project-name)   PROJECT_NAME="$2"; shift 2 ;;
    --api-key-days)   API_KEY_DAYS="$2"; shift 2 ;;
    --schedule)       SCHEDULE_EXPRESSION="$2"; shift 2 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -20
      exit 0
      ;;
    *) echo "Opcion desconocida: $1" >&2; exit 1 ;;
  esac
done

# ---------- Calcular epoch de expiracion de la API key ----------
# macOS usa `date -v`, Linux usa `date -d`. Detectamos.
if date -v +1d >/dev/null 2>&1; then
  EXPIRES_EPOCH=$(date -v +"${API_KEY_DAYS}d" +%s)
else
  EXPIRES_EPOCH=$(date -d "+${API_KEY_DAYS} days" +%s)
fi

TEMPLATE_PATH="$(dirname "$0")/template.yaml"

echo "==> Stack:   $STACK_NAME"
echo "==> Region:  $REGION"
echo "==> Project: $PROJECT_NAME"
echo "==> API Key expira en: ${API_KEY_DAYS} dias (epoch=${EXPIRES_EPOCH})"
echo "==> Schedule: ${SCHEDULE_EXPRESSION}"
echo

echo "==> Validando template..."
aws cloudformation validate-template \
  --template-body "file://${TEMPLATE_PATH}" \
  --region "$REGION" > /dev/null

echo "==> Desplegando stack (esto tarda ~1-2 min)..."
aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_PATH" \
  --region "$REGION" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    ProjectName="$PROJECT_NAME" \
    ApiKeyExpiresEpoch="$EXPIRES_EPOCH" \
    ScheduleExpression="$SCHEDULE_EXPRESSION"

echo
echo "==> Recuperando outputs..."
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs' \
  --output table

# Extraer los dos valores clave para el frontend
HTTP_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='HttpEndpoint'].OutputValue" \
  --output text)
API_KEY=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiKey'].OutputValue" \
  --output text)

echo
echo "==> Pegue esto en frontend/app.js dentro de CONFIG:"
echo "    endpoint: '${HTTP_ENDPOINT}',"
echo "    region:   '${REGION}',"
echo "    apiKey:   '${API_KEY}'"
