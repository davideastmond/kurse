import type { WebhookEventType } from "@/shared/types/webhook-events";

export type EndpointStatus = "ACTIVE" | "PAUSED";

export type WebhookEndpointView = {
  id: string;
  url: string;
  status: EndpointStatus;
  createdAtIso: string;
  updatedAtIso: string;
  eventTypes: WebhookEventType[];
};

export type WebhookDeliveryStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "DEAD_LETTER";

export type WebhookDeliveryLogView = {
  id: string;
  endpointId: string;
  endpointUrl: string;
  eventId: string;
  eventType: string;
  attempt: number;
  status: WebhookDeliveryStatus;
  responseCode: number | null;
  responseBodySnippet: string | null;
  nextRetryAtIso: string | null;
  deliveredAtIso: string | null;
  createdAtIso: string;
};

export type EndpointFormValues = {
  url: string;
  status: EndpointStatus;
};

export type EndpointFormProps = {
  mode: "create" | "update";
  values: EndpointFormValues;
  onUrlChange: (url: string) => void;
  onStatusChange: (status: EndpointStatus) => void;
  onSubmit: () => void;
  isPending: boolean;
};

export type EventSubscriptionChecklistProps = {
  selectedEventTypes: WebhookEventType[];
  onToggleEventType: (eventType: WebhookEventType) => void;
  isPending: boolean;
};

export type ReplayActionControlsProps = {
  delivery: WebhookDeliveryLogView;
  canReplay: boolean;
  isPending: boolean;
  onReplay: (deliveryId: string) => void;
};

export type DeliveryLogTableProps = {
  deliveries: WebhookDeliveryLogView[];
  isPending: boolean;
  onReplay: (deliveryId: string) => void;
};

export type IntegrationsManagerProps = {
  organizationId: string;
  endpoints: WebhookEndpointView[];
  deliveryLogs: WebhookDeliveryLogView[];
};
