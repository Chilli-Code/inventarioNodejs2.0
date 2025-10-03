// Solicitar permiso para notificaciones
async function solicitarPermisoNotificaciones() {
    if (!("Notification" in window)) {
        console.log("Este navegador no soporta notificaciones");
        return false;
    }

    if (Notification.permission === "granted") {
        console.log("Permisos ya otorgados");
        return true;
    }

    if (Notification.permission !== "denied") {
        console.log("Solicitando permiso de notificaciones...");
        const permission = await Notification.requestPermission();
        console.log("Resultado:", permission);
        return permission === "granted";
    }

    console.log("Notificaciones bloqueadas por el usuario");
    return false;
}

// Mostrar notificación
function mostrarNotificacion(titulo, opciones = {}) {
    if (Notification.permission === "granted") {
        const notificacion = new Notification(titulo, {
            icon: '/img/logo.webp',
            badge: '/img/logo.webp',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            ...opciones
        });

        notificacion.onclick = function() {
            window.focus();
            if (opciones.url) {
                window.location.href = opciones.url;
            }
            notificacion.close();
        };

        setTimeout(() => notificacion.close(), 10000);
        return notificacion;
    }
}

let lastTicketCount = 0;
let isFirstCheck = true;

async function verificarNuevosTickets() {
    try {
        const response = await fetch('/api/support/unread-count');
        const data = await response.json();
        
        console.log(`Verificando tickets: ${data.count} (anterior: ${lastTicketCount})`);
        
        if (!isFirstCheck && data.count > lastTicketCount && lastTicketCount >= 0) {
            const diferencia = data.count - lastTicketCount;
            console.log(`¡Nuevo ticket! Mostrando notificación...`);
            mostrarNotificacion('Nuevo Ticket de Soporte', {
                body: `Tienes ${diferencia} ticket${diferencia > 1 ? 's' : ''} nuevo${diferencia > 1 ? 's' : ''}`,
                tag: 'support-ticket',
                url: '/support'
            });
        }
        
        lastTicketCount = data.count;
        isFirstCheck = false;
        
        const badge = document.getElementById('support-badge');
        if (badge) {
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error verificando tickets:', error);
    }
}

// Inicializar para admins
if (window.userRole === 'admin') {
    console.log('Sistema de notificaciones iniciado para admin');
    
    // Mostrar popup INMEDIATAMENTE al cargar
    setTimeout(async () => {
        console.log('Solicitando permisos de notificación...');
        const permitido = await solicitarPermisoNotificaciones();
        
        if (permitido) {
            console.log('Notificaciones ACTIVADAS');
            // Mostrar notificación de prueba
            mostrarNotificacion('Sistema de Soporte', {
                body: 'Las notificaciones están activas. Recibirás alertas de nuevos tickets.',
                tag: 'test'
            });
            
            // Verificar cada 10 segundos (para testing rápido)
            setInterval(verificarNuevosTickets, 10000);
            verificarNuevosTickets();
        } else {
            console.warn('Notificaciones bloqueadas o denegadas');
            alert('Por favor activa las notificaciones para recibir alertas de nuevos tickets.');
        }
    }, 2000);
}