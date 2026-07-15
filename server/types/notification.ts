export enum NotificationType {
  SUCCESS = 'Success',
  INFO = 'Info',
  WARNING = 'Warning',
  ERROR = 'Error',
}

export enum NotificationCategory {
  SYSTEM = 'System',
  BILLING = 'Billing',
  AI = 'AI',
  SECURITY = 'Security',
  MAINTENANCE = 'Maintenance',
  PROMOTION = 'Promotion',
  ANNOUNCEMENT = 'Announcement',
  WORKSPACE = 'Workspace',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationAudience {
  ALL_USERS = 'All Users',
  ALL_ADMINS = 'All Admins',
  FREE_PLAN = 'Free Plan',
  PRO_PLAN = 'Pro Plan',
  ANNUAL_PLAN = 'Annual Plan',
  SINGLE_USER = 'Single User',
}

export enum NotificationScheduleStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
