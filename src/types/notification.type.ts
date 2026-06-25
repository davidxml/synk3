export type NotificationPermissionError =
  | 'NOT_SUPPORTED'
  | 'PERMISSION_DENIED'
  | 'REQUEST_FAILED';

export interface NotificationPermissionResult {
  /**
   * Whether notification permission is currently granted.
   */
  readonly granted: boolean;

  /**
   * Stable machine-readable error code.
   */
  readonly errorCode: NotificationPermissionError | null;

  /**
   * Human-readable error message.
   */
  readonly message: string | null;
}

