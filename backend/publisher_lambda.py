"""
Lambda Publisher para AppSync Events.

Publica eventos contra el endpoint HTTP del Event API usando IAM auth
(SigV4). No hay SDK para publish events: se hace con HTTP POST a
https://<api-http-dns>/event.

Variables de entorno requeridas:
  EVENT_API_HTTP_DNS    Dominio HTTP del Event API (sin "https://", sin "/event").
                        Ej: abc123.appsync-api.eu-west-1.amazonaws.com
  AWS_REGION            Lo rellena Lambda automaticamente.

Nota: el template.yaml de infrastructure/ ya incluye el codigo de la Lambda
inline. Este archivo es util para:
  - Desarrollo / pruebas locales (`python publisher_lambda.py`)
  - Mostrar el codigo durante la charla
"""
import json
import os
import random
import urllib.request
from datetime import datetime, timezone

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

REGION = os.environ.get('AWS_REGION', 'eu-west-1')
EVENT_API_HTTP_DNS = os.environ.get('EVENT_API_HTTP_DNS', 'replace-me.appsync-api.eu-west-1.amazonaws.com')
PUBLISH_URL = f'https://{EVENT_API_HTTP_DNS}/event'

_session = boto3.Session()
_credentials = _session.get_credentials()


def publish(channel: str, payload: dict) -> None:
    """Publica un unico evento en un channel, firmando la request con SigV4."""
    body = json.dumps({
        'channel': channel,
        'events': [json.dumps(payload)],
    }).encode('utf-8')

    request = AWSRequest(
        method='POST',
        url=PUBLISH_URL,
        data=body,
        headers={'Content-Type': 'application/json'},
    )
    SigV4Auth(_credentials, 'appsync', REGION).add_auth(request)

    req = urllib.request.Request(
        PUBLISH_URL,
        data=body,
        headers=dict(request.headers.items()),
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(f'Publicado en {channel}: HTTP {resp.status}')


def generate_metrics():
    return {
        'cpu': round(random.uniform(20, 95), 2),
        'memory': round(random.uniform(30, 85), 2),
        'disk': round(random.uniform(40, 75), 2),
        'network_in': random.randint(100, 5000),
        'network_out': random.randint(50, 3000),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'region': REGION,
        'instance_id': 'i-1234567890abcdef0',
    }


def lambda_handler(event, context):
    metrics = generate_metrics()
    print(f'Publicando metricas: {json.dumps(metrics)}')

    publish('/dashboard/metrics', metrics)

    if metrics['cpu'] > 80:
        publish('/notifications/alerts', {
            'type': 'warning',
            'message': f"CPU alta: {metrics['cpu']}%",
            'timestamp': metrics['timestamp'],
        })

    return {'statusCode': 200, 'body': json.dumps({'ok': True, 'metrics': metrics})}


# Para testing local: export EVENT_API_HTTP_DNS=... y AWS creds en el entorno
if __name__ == '__main__':
    print(json.dumps(lambda_handler({}, None), indent=2))
