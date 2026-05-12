/**
 * Cliente AppSync Events - Dashboard Real-Time
 * Conecta al Event API y se suscribe a métricas del sistema
 *
 * Requiere: npm install aws-amplify
 */

import { Amplify } from 'aws-amplify';
import { events } from 'aws-amplify/data';

// Configuración del Event API (reemplazar con tus valores)
// El endpoint HTTP termina en /event - Amplify deriva el WebSocket automáticamente
const CONFIG = {
    endpoint: 'https://7hr3f7mqgndahncyjtnsktgdxm.appsync-api.eu-west-1.amazonaws.com/event',
    region: 'eu-west-1',
    apiKey: 'da2-un76ov47ejdhpkciasbbxro4x4'
};

Amplify.configure({
    API: {
        Events: {
            endpoint: CONFIG.endpoint,
            region: CONFIG.region,
            defaultAuthMode: 'apiKey',
            apiKey: CONFIG.apiKey
        }
    }
});

// Estado de la aplicación
let metricsChannel = null;
let alertsChannel = null;
let metricsSubscription = null;
let alertsSubscription = null;
let alertCount = 0;
const MAX_ALERTS = 5;

/**
 * Inicializa la conexión a AppSync Events
 */
async function initializeClient() {
    try {
        console.log('🔌 Conectando a AppSync Events...');
        updateStatus('Conectando...', false);

        // Conectar y suscribirse al channel de métricas
        metricsChannel = await events.connect('/dashboard/metrics');
        metricsSubscription = metricsChannel.subscribe({
            next: (data) => {
                console.log('📊 Métricas recibidas:', data);
                handleMetricsUpdate(data);
            },
            error: (error) => {
                console.error('Error en subscription de métricas:', error);
                updateStatus('Error de conexión', false);
            }
        });

        // Conectar y suscribirse al channel de alertas
        alertsChannel = await events.connect('/notifications/alerts');
        alertsSubscription = alertsChannel.subscribe({
            next: (data) => {
                console.log('⚠️ Alerta recibida:', data);
                handleAlert(data);
            },
            error: (error) => {
                console.error('Error en subscription de alertas:', error);
            }
        });

        console.log('✅ Conectado y suscripciones activas');
        updateStatus('Conectado - Recibiendo datos en tiempo real', true);

    } catch (error) {
        console.error('Error inicializando cliente:', error);
        updateStatus('Error al conectar', false);
    }
}

/**
 * Maneja la actualización de métricas
 * Amplify entrega el payload directamente en `data.event`
 */
function handleMetricsUpdate(data) {
    try {
        const metrics = data.event;
        console.log('Procesando métricas:', metrics);

        document.getElementById('cpuValue').textContent = `${metrics.cpu}%`;
        document.getElementById('cpuBar').style.width = `${metrics.cpu}%`;

        document.getElementById('memoryValue').textContent = `${metrics.memory}%`;
        document.getElementById('memoryBar').style.width = `${metrics.memory}%`;

        document.getElementById('diskValue').textContent = `${metrics.disk}%`;
        document.getElementById('diskBar').style.width = `${metrics.disk}%`;

        document.getElementById('networkInValue').textContent = (metrics.network_in / 1000).toFixed(2);
        document.getElementById('networkOutValue').textContent = (metrics.network_out / 1000).toFixed(2);

        const time = new Date(metrics.timestamp).toLocaleTimeString('es-ES');
        document.getElementById('lastUpdate').textContent = `Última actualización: ${time}`;

        animateUpdate();

    } catch (error) {
        console.error('Error procesando métricas:', error);
    }
}

/**
 * Maneja las alertas recibidas
 */
function handleAlert(data) {
    try {
        const alert = data.event;
        console.log('Procesando alerta:', alert);

        const container = document.getElementById('alertsContainer');

        if (alertCount === 0) {
            container.innerHTML = '';
        }

        const alertElement = document.createElement('div');
        alertElement.className = 'alert-item';
        alertElement.innerHTML = `
            <strong>${getAlertIcon(alert.type)} ${alert.message}</strong>
            <div class="timestamp">${new Date(alert.timestamp).toLocaleString('es-ES')}</div>
        `;

        container.insertBefore(alertElement, container.firstChild);

        alertCount++;
        if (alertCount > MAX_ALERTS) {
            container.removeChild(container.lastChild);
        }

    } catch (error) {
        console.error('Error procesando alerta:', error);
    }
}

function getAlertIcon(type) {
    const icons = {
        'warning': '⚠️',
        'error': '❌',
        'info': 'ℹ️',
        'success': '✅'
    };
    return icons[type] || '📢';
}

function updateStatus(text, isConnected) {
    document.getElementById('statusText').textContent = text;
    const dot = document.getElementById('statusDot');

    if (isConnected) {
        dot.classList.remove('disconnected');
    } else {
        dot.classList.add('disconnected');
    }
}

function animateUpdate() {
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach(card => {
        card.style.transform = 'scale(1.02)';
        setTimeout(() => {
            card.style.transform = 'scale(1)';
        }, 200);
    });
}

// Limpieza al cerrar la página
window.addEventListener('beforeunload', () => {
    console.log('🔌 Desconectando...');
    metricsSubscription?.unsubscribe();
    alertsSubscription?.unsubscribe();
    metricsChannel?.close();
    alertsChannel?.close();
});

// Inicializar cuando cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando dashboard...');
    initializeClient();
});

// Para debugging en consola
window.appSyncDebug = {
    getMetricsChannel: () => metricsChannel,
    getAlertsChannel: () => alertsChannel,
    disconnect: () => {
        metricsSubscription?.unsubscribe();
        alertsSubscription?.unsubscribe();
        metricsChannel?.close();
        alertsChannel?.close();
    }
};

console.log('💡 Tip: Usa window.appSyncDebug para debugging');
