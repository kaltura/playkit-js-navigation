import {EventsManager, getContribLogger} from '@playkit-js-contrib/common';
import {
  PrepareRegisterRequestConfig,
  PushNotifications,
  PushNotificationsOptions,
  PushNotificationsProvider,
} from '@playkit-js-contrib/push-notifications';

export enum PushNotificationEventTypes {
  PublicNotifications = 'PUBLIC_QNA_NOTIFICATIONS',
  PushNotificationsError = 'PUSH_NOTIFICATIONS_ERROR',
  ThumbNotification = 'THUMB_CUE_POINT_READY_NOTIFICATION',
  SlideNotification = 'SLIDE_VIEW_CHANGE_CODE_CUE_POINT',
}

export interface PublicNotificationsEvent {
  type: PushNotificationEventTypes.PublicNotifications;
  messages: any[];
}

export interface NotificationsErrorEvent {
  type: PushNotificationEventTypes.PushNotificationsError;
  error: string;
}

export interface ThumbNotificationsEvent {
  type: PushNotificationEventTypes.ThumbNotification;
  thumbs: any[];
}

export interface SlideNotificationsEvent {
  type: PushNotificationEventTypes.SlideNotification;
  slides: any[];
}

type Events =
  | ThumbNotificationsEvent
  | SlideNotificationsEvent
  | PublicNotificationsEvent
  | NotificationsErrorEvent;

const logger = getContribLogger({
  class: 'navigationPushNotification',
  module: 'navigation-plugin',
});

/**
 * handles push notification registration and results.
 */
export class PushNotification {
  private _pushServerInstance: PushNotifications | null = null;
  private _registeredToMessages = false;
  private _events: EventsManager<Events> = new EventsManager<Events>();
  private _initialized = false;

  on: EventsManager<Events>['on'] = this._events.on.bind(this._events);
  off: EventsManager<Events>['off'] = this._events.off.bind(this._events);

  constructor(private _player: KalturaPlayerTypes.Player) {}

  public init(pushServerOptions: PushNotificationsOptions) {
    if (this._initialized) return;

    this._initialized = true;
    this._pushServerInstance = PushNotificationsProvider.get(
      this._player,
      pushServerOptions
    );
  }

  /**
   * should be called on mediaUnload
   */
  public reset() {
    this._registeredToMessages = false;
  }

  public registerToPushServer(entryId: string, userId: string) {
    if (this._registeredToMessages) {
      logger.error('Multiple registration error', {
        method: 'registerToPushServer',
      });
      throw new Error('Already register to push server');
    }

    logger.info('Registering for push notifications server', {
      method: 'registerToPushServer',
      data: {entryId, userId},
    });

    if (!this._pushServerInstance) {
      logger.error(
        "Can't register to notifications as _pushServerInstance doesn't exists",
        {
          method: 'registerToPushServer',
        }
      );
      this._events.emit({
        type: PushNotificationEventTypes.PushNotificationsError,
        error:
          "Can't register to notifications as _pushServerInstance doesn't exists",
      });

      return;
    }

    // notifications objects
    let registrationConfigs = [
      this._createPublicRegistration(entryId),
      this._createThumbRegistration(entryId),
      this._createSlideRegistration(entryId),
    ];

    this._pushServerInstance
      .registerNotifications({
        prepareRegisterRequestConfigs: registrationConfigs,
        onSocketReconnect: () => {},
      })
      .then(
        () => {
          logger.info('Registered push notification service', {
            method: 'registerToPushServer',
          });
          this._registeredToMessages = true;
        },
        (err: any) => {
          logger.error('Registration for push notification error', {
            method: 'registerToPushServer',
            data: err,
          });
          this._events.emit({
            type: PushNotificationEventTypes.PushNotificationsError,
            error: err,
          });
        }
      );
  }

  private _createThumbRegistration(
    entryId: string
  ): PrepareRegisterRequestConfig {
    logger.info('Register thumb notification', {
      method: '_createThumbRegistration',
      data: {entryId},
    });
    return {
      eventName: PushNotificationEventTypes.ThumbNotification,
      eventParams: {
        entryId: entryId,
      },
      onMessage: (response: any[]) => {
        this._events.emit({
          type: PushNotificationEventTypes.ThumbNotification,
          thumbs: response,
        });
      },
    };
  }

  private _createSlideRegistration(
    entryId: string
  ): PrepareRegisterRequestConfig {
    logger.info('Register slide notification', {
      method: '_createSlideRegistration',
      data: {entryId},
    });
    return {
      eventName: PushNotificationEventTypes.SlideNotification,
      eventParams: {
        entryId: entryId,
      },
      onMessage: (response: any[]) => {
        this._events.emit({
          type: PushNotificationEventTypes.SlideNotification,
          slides: response, // TODO: prepare slides
        });
      },
    };
  }

  private _createPublicRegistration(
    entryId: string
  ): PrepareRegisterRequestConfig {
    logger.info('Register public notification', {
      method: '_createPublicRegistration',
      data: {entryId},
    });
    return {
      eventName: PushNotificationEventTypes.PublicNotifications,
      eventParams: {
        entryId: entryId,
      },
      onMessage: (response: any[]) => {
        this._events.emit({
          type: PushNotificationEventTypes.PublicNotifications,
          messages: response,
        });
      },
    };
  }
}
