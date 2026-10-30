import crypto from 'node:crypto';
import { generateUUID } from './faker-lite.js';

export interface WebhookSubscription {
  id: string;
  event: string; // e.g. 'users.created', 'orders.*', '*'
  targetUrl: string;
  secret: string;
  delayMs: number;
  active: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  event: string;
  targetUrl: string;
  payload: any;
  signature: string;
  status: number;
  responseBody?: string;
  durationMs: number;
  timestamp: string;
}

export class WebhookEngine {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private deliveries: WebhookDelivery[] = [];
  private onDeliveryCallback?: (delivery: WebhookDelivery) => void;

  constructor() {}

  public onDelivery(cb: (delivery: WebhookDelivery) => void): void {
    this.onDeliveryCallback = cb;
  }

  public register(sub: Omit<WebhookSubscription, 'id' | 'createdAt'>): WebhookSubscription {
    const id = generateUUID();
    const subscription: WebhookSubscription = {
      ...sub,
      id,
      createdAt: new Date().toISOString()
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  public remove(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  public list(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public getDeliveries(): WebhookDelivery[] {
    return [...this.deliveries];
  }

  public clearDeliveries(): void {
    this.deliveries = [];
  }

  /**
   * Matches event pattern against subscription event filter
   * e.g. 'users.created' matches 'users.created', 'users.*', and '*'
   */
  public static matchesEvent(subscriptionPattern: string, eventName: string): boolean {
    if (subscriptionPattern === '*' || subscriptionPattern === eventName) {
      return true;
    }
    if (subscriptionPattern.endsWith('.*')) {
      const prefix = subscriptionPattern.slice(0, -2);
      return eventName.startsWith(`${prefix}.`);
    }
    return false;
  }

  /**
   * Dispatches an event to all matching registered webhook endpoints
   */
  public async dispatch(event: string, payload: any): Promise<WebhookDelivery[]> {
    const matchingSubs = Array.from(this.subscriptions.values()).filter(
      (s) => s.active && WebhookEngine.matchesEvent(s.event, event)
    );

    const deliveryPromises = matchingSubs.map((sub) => this.deliver(sub, event, payload));
    return Promise.all(deliveryPromises);
  }

  /**
   * Deliver to a single subscription
   */
  public async deliver(sub: WebhookSubscription, event: string, payload: any): Promise<WebhookDelivery> {
    const deliveryId = generateUUID();
    const payloadStr = JSON.stringify({
      id: deliveryId,
      event,
      timestamp: new Date().toISOString(),
      data: payload
    });

    const signature = crypto
      .createHmac('sha256', sub.secret || 'mocksmith-webhook-secret')
      .update(payloadStr)
      .digest('hex');

    if (sub.delayMs > 0) {
      await new Promise((r) => setTimeout(r, sub.delayMs));
    }

    const startTime = Date.now();
    let status = 0;
    let responseBody = '';

    try {
      const res = await fetch(sub.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MockSmith-Event': event,
          'X-MockSmith-Signature': `sha256=${signature}`,
          'X-MockSmith-Delivery': deliveryId
        },
        body: payloadStr
      });
      status = res.status;
      responseBody = await res.text().catch(() => '');
    } catch (err: any) {
      status = 0;
      responseBody = `Connection Error: ${err.message}`;
    }

    const delivery: WebhookDelivery = {
      id: deliveryId,
      subscriptionId: sub.id,
      event,
      targetUrl: sub.targetUrl,
      payload: JSON.parse(payloadStr),
      signature: `sha256=${signature}`,
      status,
      responseBody,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    this.deliveries.unshift(delivery);
    if (this.deliveries.length > 100) this.deliveries.pop();

    if (this.onDeliveryCallback) {
      this.onDeliveryCallback(delivery);
    }

    return delivery;
  }
}
