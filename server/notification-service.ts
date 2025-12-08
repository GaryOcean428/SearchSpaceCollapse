import { EventEmitter } from 'events';

export interface Notification {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  metadata?: any;
  read: boolean;
}

type NotificationCallback = (notification: Notification) => void;

class NotificationService extends EventEmitter {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private readonly maxNotifications = 100;

  private constructor() {
    super();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  sendNotification(
    message: string,
    severity: 'info' | 'warning' | 'critical',
    metadata?: any
  ): Notification {
    const notification: Notification = {
      id: this.generateId(),
      message,
      severity,
      timestamp: new Date(),
      metadata,
      read: false,
    };

    this.notifications.unshift(notification);

    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.logNotification(notification);
    this.emit('notification', notification);

    return notification;
  }

  getRecentNotifications(limit?: number): Notification[] {
    const count = limit ?? this.maxNotifications;
    return this.notifications.slice(0, count);
  }

  subscribe(callback: NotificationCallback): () => void {
    this.on('notification', callback);
    return () => {
      this.off('notification', callback);
    };
  }

  clearNotifications(): void {
    this.notifications = [];
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private logNotification(notification: Notification): void {
    const prefixes: Record<Notification['severity'], string> = {
      info: '[INFO]',
      warning: '[WARNING]',
      critical: '[CRITICAL]',
    };

    const prefix = prefixes[notification.severity];
    const timestamp = notification.timestamp.toISOString();

    console.log(`${prefix} ${timestamp} - ${notification.message}`);
  }
}

export const notificationService = NotificationService.getInstance();
