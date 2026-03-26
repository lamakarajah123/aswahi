
/**
 * Utility to handle browser notifications for Tamwinak.
 */

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const showNotification = async (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
        // Check if service worker is available for background notifications
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration) {
                registration.showNotification(title, {
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    ...options,
                });
                return;
            }
        }

        // Fallback to standard notification
        new Notification(title, {
            icon: '/pwa-192x192.png',
            ...options,
        });
    }
};
