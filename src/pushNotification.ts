import { EventsManager, getContribLogger } from "@playkit-js-contrib/common";
import {
  PrepareRegisterRequestConfig,
  PushNotifications,
  PushNotificationsOptions,
  PushNotificationsProvider,
} from "@playkit-js-contrib/push-notifications";
import { KalturaAnnotation } from "kaltura-typescript-client/api/types/KalturaAnnotation";
import { KalturaMetadataListResponse } from "kaltura-typescript-client/api/types/KalturaMetadataListResponse";
import { KalturaCodeCuePoint } from "kaltura-typescript-client/api/types/KalturaCodeCuePoint";

export enum PushNotificationEventTypes {
  PublicNotifications = "PUBLIC_QNA_NOTIFICATIONS",
  UserNotifications = "USER_QNA_NOTIFICATIONS",
  CodeNotifications = "CODE_QNA_NOTIFICATIONS",
  PushNotificationsError = "PUSH_NOTIFICATIONS_ERROR",
}

export interface ModeratorSettings {
  createdAt: Date;
  qnaEnabled: boolean;
  announcementOnly: boolean;
}

enum QnaMessageType {
  Question = "Question",
  Answer = "Answer",
  Announcement = "Announcement",
  AnswerOnAir = "AnswerOnAir",
}

enum MessageDeliveryStatus {
  CREATED = "CREATED",
  SENDING = "SENDING",
  SEND_FAILED = "SEND_FAILED",
}

enum MessageState {
  Pending = "Pending",
  Answered = "Answered",
  Deleted = "Deleted",
  None = "None",
}

interface QnaMessage {
  id: string;
  createdAt: Date;
  messageContent?: string;
  type: QnaMessageType;
  state: MessageState;
  parentId: string | null;
  replies: QnaMessage[];
  deliveryStatus?: MessageDeliveryStatus;
  userId: string | null;
  isAoAAutoReply: boolean;
  willBeAnsweredOnAir: boolean;
  pendingMessageId: string | null;
  unRead: boolean;
}

export interface UserQnaNotificationsEvent {
  type: PushNotificationEventTypes.UserNotifications;
  qnaMessages: QnaMessage[];
}

export interface PublicQnaNotificationsEvent {
  type: PushNotificationEventTypes.PublicNotifications;
  qnaMessages: QnaMessage[];
}

export interface QnaNotificationsErrorEvent {
  type: PushNotificationEventTypes.PushNotificationsError;
  error: string;
}

export interface SettingsNotificationsEvent {
  type: PushNotificationEventTypes.CodeNotifications;
  settings: ModeratorSettings;
}

type Events =
  | UserQnaNotificationsEvent
  | PublicQnaNotificationsEvent
  | QnaNotificationsErrorEvent
  | SettingsNotificationsEvent;

const logger = getContribLogger({
  class: "qnaPushNotification",
  module: "qna-plugin",
});

/**
 * handles push notification registration and results.
 */
export class QnaPushNotification {
  private _pushServerInstance: PushNotifications | null = null;

  private _registeredToQnaMessages = false;

  private _events: EventsManager<Events> = new EventsManager<Events>();

  private _initialized = false;

  on: EventsManager<Events>["on"] = this._events.on.bind(this._events);
  off: EventsManager<Events>["off"] = this._events.off.bind(this._events);

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
    this._registeredToQnaMessages = false;
  }

  /**
   * registering push server notifications for retrieving user/public qna messages for current entry id and userId
   * note: should be registered on mediaLoad to get relevant notification data.
   * @param entryId
   * @param userId
   */
  public registerToPushServer(entryId: string, userId: string) {
    if (this._registeredToQnaMessages) {
      logger.error("Multiple registration error", {
        method: "registerToPushServer",
      });
      throw new Error("Already register to push server");
    }

    logger.info("Registering for push notifications server", {
      method: "registerToPushServer",
      data: { entryId, userId },
    });

    if (!this._pushServerInstance) {
      logger.error(
        "Can't register to notifications as _pushServerInstance doesn't exists",
        {
          method: "registerToPushServer",
        }
      );
      this._events.emit({
        type: PushNotificationEventTypes.PushNotificationsError,
        error:
          "Can't register to notifications as _pushServerInstance doesn't exists",
      });

      return;
    }

    let registrationConfigs = [
      this._createPublicQnaRegistration(entryId), // notifications objects
      this._createUserQnaRegistration(entryId, userId),
      this._createCodeQnaRegistration(entryId),
    ]; // user related QnA objects

    this._pushServerInstance
      .registerNotifications({
        prepareRegisterRequestConfigs: registrationConfigs,
        onSocketReconnect: () => {},
      })
      .then(
        () => {
          logger.info("Registered push notification service", {
            method: "registerToPushServer",
          });
          this._registeredToQnaMessages = true;
        },
        (err: any) => {
          logger.error("Registration for push notification error", {
            method: "registerToPushServer",
            data: err,
          });
          this._events.emit({
            type: PushNotificationEventTypes.PushNotificationsError,
            error: err,
          });
        }
      );
  }

  private _createPublicQnaRegistration(
    entryId: string
  ): PrepareRegisterRequestConfig {
    logger.info("Register public QnA notification", {
      method: "_createPublicQnaRegistration",
      data: { entryId },
    });
    return {
      eventName: PushNotificationEventTypes.PublicNotifications,
      eventParams: {
        entryId: entryId,
      },
      onMessage: (response: any[]) => {
        this._events.emit({
          type: PushNotificationEventTypes.PublicNotifications,
          qnaMessages: [], // TODO: prepare message if we need this type
        });
      },
    };
  }

  private _createUserQnaRegistration(
    entryId: string,
    userId: string
  ): PrepareRegisterRequestConfig {
    logger.info("Register User QnA notification", {
      method: "_createUserQnaRegistration",
      data: { entryId, userId },
    });
    return {
      eventName: PushNotificationEventTypes.UserNotifications,
      eventParams: {
        entryId: entryId,
        userId: userId,
      },
      onMessage: (response: any[]) => {
        this._events.emit({
          type: PushNotificationEventTypes.UserNotifications,
          qnaMessages: [], // TODO: prepare message if we need this type
        });
      },
    };
  }

  private _createCodeQnaRegistration(
    entryId: string
  ): PrepareRegisterRequestConfig {
    logger.info("Register Code QnA notification for receiving settings data", {
      method: "_createCodeQnaRegistration",
      data: { entryId },
    });
    return {
      eventName: PushNotificationEventTypes.CodeNotifications,
      eventParams: {
        entryId: entryId,
      },
      onMessage: (response: any[]) => {
        const newSettings = this._getLastSettingsObject(response);
        if (newSettings) {
          this._events.emit({
            type: PushNotificationEventTypes.CodeNotifications,
            settings: newSettings,
          });
        }
      },
    };
  }

  private _getLastSettingsObject(
    pushResponse: any[]
  ): ModeratorSettings | null {
    const settings = this._createQnaSettingsObjects(pushResponse);
    settings.sort((a: ModeratorSettings, b: ModeratorSettings) => {
      return a.createdAt.valueOf() - b.createdAt.valueOf();
    });
    return settings.length >= 1 ? settings[0] : null;
  }

  private _createQnaSettingsObjects(pushResponse: any[]): ModeratorSettings[] {
    return pushResponse.reduce((settings: ModeratorSettings[], item: any) => {
      if (item.objectType === "KalturaCodeCuePoint") {
        const kalturaCodeCuepoint: KalturaCodeCuePoint = new KalturaCodeCuePoint();
        kalturaCodeCuepoint.fromResponseObject(item);
        const settingsObject = this._createSettingsObject(kalturaCodeCuepoint);
        if (settingsObject) {
          settings.push(settingsObject);
        }
      }
      return settings;
    }, []);
  }

  private _createSettingsObject(
    settingsCuepoint: KalturaCodeCuePoint
  ): ModeratorSettings | null {
    try {
      if (
        !settingsCuepoint ||
        !settingsCuepoint.createdAt ||
        !settingsCuepoint.partnerData
      )
        return null;
      const settingsObject = JSON.parse(settingsCuepoint.partnerData);
      if (
        !settingsObject["qnaSettings"] ||
        !settingsObject["qnaSettings"].hasOwnProperty("qnaEnabled") ||
        !settingsObject["qnaSettings"].hasOwnProperty("announcementOnly")
      )
        return null;

      return {
        createdAt: settingsCuepoint.createdAt,
        qnaEnabled: settingsObject["qnaSettings"]["qnaEnabled"],
        announcementOnly: settingsObject["qnaSettings"]["announcementOnly"],
      };
    } catch (e) {
      return null;
    }
  }
}
