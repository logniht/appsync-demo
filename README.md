# 🚀 Demo: Dashboard Real-Time con AWS AppSync Events

Demo completa para la charla "Real-Time Apps con AppSync Events: Porque el Polling es del Pleistoceno 🦕"

## 📁 Estructura del Proyecto

```
demo/
├── backend/              # Lambda publisher (standalone, para tests locales)
│   └── publisher_lambda.py
├── frontend/            # Dashboard web
│   ├── index.html
│   ├── app.js
│   └── package.json
├── infrastructure/      # Infraestructura como codigo (CloudFormation)
│   ├── template.yaml    # Stack completo: Event API + Lambda + Scheduler
│   └── deploy.sh        # Despliegue en una sola ejecucion
└── README.md
```

## 🎯 Arquitectura

![Arquitectura](../slides/arquitectura.drawio.png)

## 🛠️ Setup Instructions

### 1. Desplegar la infraestructura

Un solo comando crea el Event API, los channel namespaces (`dashboard` y `notifications`), la API Key, la Lambda publisher, los roles IAM y el EventBridge Scheduler:

```bash
cd infrastructure
./deploy.sh --region eu-west-1 --api-key-days 14
```

Al terminar, el script imprime los valores listos para pegar en `frontend/app.js`:

```
==> Pegue esto en frontend/app.js dentro de CONFIG:
    endpoint: 'https://xxxxxxxxx.appsync-api.eu-west-1.amazonaws.com/event',
    region:   'eu-west-1',
    apiKey:   'da2-xxxxxxxxxxxxxxxxxxxxxxxxxx'
```

Para actualizar parametros (por ejemplo, extender la API Key antes de la charla):

```bash
./deploy.sh --api-key-days 30
```

Para borrar todo despues:

```bash
aws cloudformation delete-stack --stack-name appsync-events-demo --region eu-west-1
```

### 2. Configurar el Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Editar app.js con los valores que imprimio deploy.sh:
#   endpoint: 'https://<api-id>.appsync-api.<region>.amazonaws.com/event'
#   region:   tu region
#   apiKey:   tu API Key

# Ejecutar en desarrollo
npm run dev

# Abrir http://localhost:5173
```

## 🧪 Testing

### Test del Publisher (local)
```bash
cd backend
# El endpoint HTTP lo imprime deploy.sh (campo HttpEndpoint):
# https://xxxxxxxxx.appsync-api.eu-west-1.amazonaws.com/event
# Para la env var solo necesitamos el dominio, sin https:// ni /event
export EVENT_API_HTTP_DNS=xxxxxxxxx.appsync-api.eu-west-1.amazonaws.com
export AWS_REGION=eu-west-1
python publisher_lambda.py
```

> Requiere credenciales AWS validas en el entorno (perfil o variables `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) con permiso `appsync:EventPublish` sobre los channel namespaces.

### Test desde AWS Console
1. Ir a Lambda → Test
2. Crear evento de test (vacío)
3. Ejecutar
4. Verificar CloudWatch Logs

### Test del Frontend
1. Abrir DevTools (F12)
2. Ir a Network → WS
3. Ver conexión WebSocket activa
4. Console: ver logs de eventos recibidos

### Test Manual con curl
El API admite publish via HTTP en `https://<http-dns>/event`. Con API Key:
```bash
curl -X POST "https://<api-http-dns>/event" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: <api-key>" \
  -d '{
    "channel": "/dashboard/metrics",
    "events": ["{\"cpu\": 75.5, \"memory\": 62.3, \"timestamp\": \"2026-04-02T12:00:00Z\"}"]
  }'
```

> `<api-http-dns>` y `<api-key>` los imprime `deploy.sh` al terminar (campos `HttpEndpoint` y `ApiKey`).

## 🎬 Para la Charla

### Checklist Pre-Demo
- [ ] Verificar Lambda ejecutándose (EventBridge activo)
- [ ] Verificar CloudWatch Logs funcionando
- [ ] Tener AWS Console abierta (AppSync → Event APIs)
- [ ] Frontend corriendo en `localhost:5173`
- [ ] DevTools abiertos en pestaña WS
- [ ] Backup: video grabado de la demo

### Flow de Demostración

1. **Mostrar dashboard funcionando** (2 min)
   - Abrir navegador
   - Métricas actualizándose cada minuto
   - DevTools → WebSocket connection

2. **Explicar backend** (5 min)
   - Abrir `publisher_lambda.py`
   - Mostrar código de publicación
   - Mostrar EventBridge rule en Console
   - Ver logs en CloudWatch

3. **Explicar frontend** (5 min)
   - Abrir `app.js`
   - Explicar inicialización del cliente
   - Explicar subscriptions
   - Mostrar handlers de eventos

4. **Configuración AWS** (3 min)
   - Mostrar Event API en Console
   - Channels configurados
   - Métricas: conexiones activas
   - Pricing calculator

## 📊 Métricas y Monitorización

### CloudWatch Metrics
- `ConnectionCount`: conexiones activas
- `EventsPublished`: eventos publicados
- `EventsReceived`: eventos recibidos por clientes
- `PublishErrors`: errores de publicación

### CloudWatch Logs
- Lambda logs: `/aws/lambda/appsync-events-publisher`
- AppSync logs: `/aws/appsync/apis/<API_ID>`

## 💰 Costos Estimados

Para la demo (1 hora):
- Lambda: ~$0.00 (dentro de free tier)
- EventBridge: ~$0.00 (dentro de free tier)
- AppSync Events: ~$0.00 (< 1M mensajes)

Para producción (ejemplo):
- 10K usuarios concurrentes
- 100 mensajes/hora/usuario
- Total: 24M mensajes/día
- Costo: ~$24/día (~$720/mes)

## 🔧 Troubleshooting

### Lambda no publica eventos
1. Verificar permisos IAM (`appsync:EventPublish` sobre `apis/<apiId>/channelNamespace/*`)
2. Verificar env var `EVENT_API_HTTP_DNS` en la Lambda (dominio sin `https://` ni `/event`)
3. Ver CloudWatch Logs de Lambda

### Frontend no recibe eventos
1. Verificar WebSocket URL correcto
2. Verificar API Key válido
3. Ver console del navegador (errores)
4. Verificar CORS si aplica

### Eventos retrasados
1. Verificar EventBridge ejecutándose
2. Ver CloudWatch Metrics de AppSync
3. Comprobar throttling

## 📚 Recursos Adicionales

- [AWS AppSync Events Docs](https://docs.aws.amazon.com/appsync/latest/eventapi/)
- [SDK de JavaScript](https://www.npmjs.com/package/@aws-amplify/appsync-event-client)
- [Ejemplos AWS](https://github.com/aws-samples/appsync-events-samples)
- [Pricing](https://aws.amazon.com/appsync/pricing/)

## 🤝 Contribuir

Si encuentras mejoras o bugs en la demo:
1. Abre un issue
2. Envía un PR
3. Comparte feedback

---

**Autor:** Daniel Colls  
**Charla:** AWS User Group Sevilla  
**Fecha:** Abril 2026
