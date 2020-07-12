import { h } from "preact";
import {
  ContribPluginConfigs,
  ContribPluginData,
  ContribPluginManager,
  ContribServices,
  CorePlugin,
  OnMediaLoad,
  OnMediaUnload,
  OnPluginSetup
} from "@playkit-js-contrib/plugin";
import {
  getContribLogger,
  KalturaLiveServices
} from "@playkit-js-contrib/common";
import {
  KitchenSinkContentRendererProps,
  KitchenSinkExpandModes,
  KitchenSinkItem,
  KitchenSinkPositions,
  UpperBarItem
} from "@playkit-js-contrib/ui";
import { KalturaThumbCuePoint } from "kaltura-typescript-client/api/types";
import { KalturaAnnotation } from "kaltura-typescript-client/api/types";
import { CuePointListAction } from "kaltura-typescript-client/api/types/CuePointListAction";
import { KalturaCuePointFilter } from "kaltura-typescript-client/api/types/KalturaCuePointFilter";
import { KalturaCuePointType } from "kaltura-typescript-client/api/types/KalturaCuePointType";
import { KalturaThumbCuePointSubType } from "kaltura-typescript-client/api/types/KalturaThumbCuePointSubType";
import { KalturaThumbCuePointFilter } from "kaltura-typescript-client/api/types/KalturaThumbCuePointFilter";
import {
  KalturaClient,
  KalturaMultiResponse,
  KalturaRequest
} from "kaltura-typescript-client";
import {
  getConfigValue,
  prepareVodData,
  prepareLiveData,
  convertLiveItemsStartTime
} from "./utils/index";
import {
  PushNotification,
  PushNotificationEventTypes,
  PublicNotificationsEvent,
  ThumbNotificationsEvent,
  SlideNotificationsEvent,
  NotificationsErrorEvent
} from "./pushNotification";
import * as styles from "./navigation-plugin.scss";
import { Navigation } from "./components/navigation";
import { ItemData } from "./components/navigation/navigation-item/NavigationItem";

const pluginName = `navigation`;

const logger = getContribLogger({
  class: "NavigationPlugin",
  module: "navigation-plugin"
});

interface NavigationPluginConfig {
  expandOnFirstPlay: boolean;
  position: KitchenSinkPositions;
  forceChaptersThumb: boolean;
  userRole: string;
}

const DefaultAnonymousPrefix = "Guest";

enum UserRole {
  anonymousRole = "anonymousRole",
  unmoderatedAdminRole = "unmoderatedAdminRole"
}

export class NavigationPlugin
  implements OnMediaLoad, OnMediaUnload, OnPluginSetup, OnMediaUnload {
  private _kitchenSinkItem: KitchenSinkItem | null = null;
  private _upperBarItem: UpperBarItem | null = null;
  private _pushNotification: PushNotification;
  private _kalturaClient = new KalturaClient();
  private _currentPosition = 0;
  private _listData: Array<ItemData> = [];
  private _triggeredByKeyboard = false;
  private _isLoading = false; // TODO: handle is loading state
  private _hasError = false; // TODO: handle error state
  private _liveStartTime: number | null = null;

  constructor(
    private _corePlugin: CorePlugin,
    private _contribServices: ContribServices,
    private _configs: ContribPluginConfigs<NavigationPluginConfig>
  ) {
    const { playerConfig } = this._configs;
    this._kalturaClient.setOptions({
      clientTag: "playkit-js-navigation",
      endpointUrl: playerConfig.provider.env.serviceUrl
    });
    this._kalturaClient.setDefaultRequestOptions({
      ks: playerConfig.provider.ks
    });
    this._pushNotification = new PushNotification(this._corePlugin.player);
  }

  private _updateKitchenSink = () => {
    if (this._kitchenSinkItem) {
      this._kitchenSinkItem.update();
    }
  };

  onPluginSetup(): void {
    this._initKitchensinkAndUpperBarItems();
  }

  private _addPlayerListeners() {
    this._removePlayerListeners();
    this._corePlugin.player.addEventListener(
      this._corePlugin.player.Event.RESIZE,
      this._updateKitchenSink
    );
    this._corePlugin.player.addEventListener(
      this._corePlugin.player.Event.TIME_UPDATE,
      this._onTimeUpdate
    );
    if (this._corePlugin.player.isLive()) {
      this._corePlugin.player.addEventListener(
        this._corePlugin.player.Event.TIMED_METADATA,
        this._onTimedMetadataLoaded
      );
    }
  }

  private _removePlayerListeners() {
    this._corePlugin.player.removeEventListener(
      this._corePlugin.player.Event.RESIZE,
      this._updateKitchenSink
    );
    this._corePlugin.player.removeEventListener(
      this._corePlugin.player.Event.TIME_UPDATE,
      this._onTimeUpdate
    );
    if (this._corePlugin.player.isLive()) {
      this._corePlugin.player.removeEventListener(
        this._corePlugin.player.Event.TIMED_METADATA,
        this._onTimedMetadataLoaded
      );
    }
  }

  private _onTimedMetadataLoaded = (event: any): void => {
    const id3TagCues = event.payload.cues.filter(
      (cue: any) => cue.value && cue.value.key === "TEXT"
    );
    if (id3TagCues.length) {
      try {
        const id3Timestamp = Math.ceil(
          JSON.parse(id3TagCues[id3TagCues.length - 1].value.data).timestamp /
            1000
        );
        logger.debug(
          `Calling cuepoint engine updateTime with id3 timestamp: ${id3Timestamp}`,
          {
            method: "_onTimedMetadataLoaded"
          }
        );
        if (id3Timestamp && !this._liveStartTime) {
          this._liveStartTime = Math.ceil(
            id3Timestamp - this._corePlugin.player.currentTime
          );
          this._corePlugin.player.removeEventListener(
            this._corePlugin.player.Event.TIMED_METADATA,
            this._onTimedMetadataLoaded
          );
        }
        if (this._liveStartTime && this._listData.length) {
          this._listData = convertLiveItemsStartTime(
            this._listData,
            this._liveStartTime
          );
          this._updateKitchenSink();
        }
      } catch (e) {
        logger.debug("failed retrieving id3 tag metadata", {
          method: "_onTimedMetadataLoaded",
          data: e
        });
      }
    }
  };

  onMediaLoad(): void {
    this._addPlayerListeners();
    if (this._corePlugin.player.isLive()) {
      const {
        playerConfig: { sources }
      } = this._configs;
      this._initNotification();
      this._constructPushNotificationListener();
      const userId = this.getUserId();
      this._pushNotification.registerToPushServer(sources.id, userId);
    } else {
      this._fetchVodData();
    }
  }

  onMediaUnload(): void {
    this._removePlayerListeners();
    if (this._corePlugin.player.isLive()) {
      this._pushNotification.reset();
    }
  }

  onPluginDestroy(): void {
    if (this._corePlugin.player.isLive()) {
      this._removePushNotificationListener();
    }
  }

  private _retryFetchData = () => {
    this._hasError = false;
    this._fetchVodData();
  };

  private _seekTo = (time: number) => {
    this._corePlugin.player.currentTime = time;
  };

  private getUserId(): string {
    // TODO: consider move to contrib
    const { session } = this._configs.playerConfig;

    if (
      this._corePlugin.config.userRole === UserRole.anonymousRole ||
      !session.userId
    ) {
      return KalturaLiveServices.getAnonymousUserId(
        session.userId || DefaultAnonymousPrefix
      );
    }

    return session.userId;
  }

  private _initNotification(): void {
    const ks = this._contribServices.getPlayerKS();
    if (!ks) {
      logger.warn(
        "Warn: Failed to initialize." +
          "Failed to retrieve ks from configuration " +
          "(both providers and session objects returned with an undefined KS)," +
          " please check your configuration file.",
        {
          method: "_initPluginManagers"
        }
      );
      return;
    }
    const {
      playerConfig: { provider }
    } = this._configs;
    // should be created once on pluginSetup (entryId/userId registration will be called onMediaLoad)
    this._pushNotification.init({
      ks: ks,
      serviceUrl: provider.env.serviceUrl,
      clientTag: "playkit-js-navigation",
      kalturaPlayer: this._corePlugin.player
    });
  }

  private _updateData = (cuePointData: any[]) => {
    this._listData = prepareLiveData(
      this._listData,
      cuePointData,
      this._configs.playerConfig.provider.ks,
      this._configs.playerConfig.provider.env.serviceUrl,
      this._corePlugin.config.forceChaptersThumb,
      this._liveStartTime
    );
    // TODO: Debounce _updateKitchenSink
    this._updateKitchenSink();
  };

  private _handleAoaMessages = ({
    messages
  }: PublicNotificationsEvent): void => {
    logger.debug("handle push notification event", {
      method: "_handleAoaMessages",
      data: messages
    });
    const aoaMessages: any[] = messages.filter((message: any) => {
      return "AnswerOnAir" === message.type;
    });
    this._updateData(aoaMessages);
  };

  private _handleThumbMessages = ({
    thumbs
  }: ThumbNotificationsEvent): void => {
    logger.debug("handle push notification event", {
      method: "_handleThumbMessages",
      data: thumbs
    });
    this._updateData(thumbs);
  };

  private _handleSlideMessages = ({
    slides
  }: SlideNotificationsEvent): void => {};

  private _handlePushNotificationError = ({
    error
  }: NotificationsErrorEvent): void => {};

  private _constructPushNotificationListener(): void {
    // TODO: handle push notification errors
    // this._pushNotification.on(
    //   PushNotificationEventTypes.PushNotificationsError,
    //   this._handlePushNotificationError
    // );

    // TODO: handle AOA messages
    // this._pushNotification.on(
    //   PushNotificationEventTypes.PublicNotifications,
    //   this._handleAoaMessages
    // );

    this._pushNotification.on(
      PushNotificationEventTypes.ThumbNotification,
      this._handleThumbMessages
    );

    // TODO: handle change-view-mode
    // this._pushNotification.on(
    //   PushNotificationEventTypes.SlideNotification,
    //   this._handleSlideMessages
    // );
  }

  private _removePushNotificationListener(): void {
    this._pushNotification.off(
      PushNotificationEventTypes.PushNotificationsError,
      this._handlePushNotificationError
    );
    this._pushNotification.off(
      PushNotificationEventTypes.PublicNotifications,
      this._handleAoaMessages
    );
    this._pushNotification.off(
      PushNotificationEventTypes.ThumbNotification,
      this._handleThumbMessages
    );
    this._pushNotification.off(
      PushNotificationEventTypes.SlideNotification,
      this._handleSlideMessages
    );
  }
  private _initKitchensinkAndUpperBarItems(): void {
    if (!this._upperBarItem && !this._kitchenSinkItem) {
      this._addKitchenSinkItem();
    }
  }
  private _renderKitchenSinkContent = (
    props: KitchenSinkContentRendererProps
  ) => {
    return (
      <Navigation
        {...props}
        data={this._listData}
        onItemClicked={this._seekTo}
        isLoading={this._isLoading}
        hasError={this._hasError}
        retry={this._retryFetchData}
        currentTime={this._currentPosition}
        kitchenSinkActive={!!this._kitchenSinkItem?.isActive()}
        toggledWithEnter={this._triggeredByKeyboard}
      />
    );
  };

  private _onTimeUpdate = (): void => {
    // reduce refresh to only when the time really chanes - check UX speed
    const newTime = Math.ceil(this._corePlugin.player.currentTime);
    if (newTime !== this._currentPosition) {
      this._currentPosition = newTime;
      this._updateKitchenSink();
    }
  };

  private _handleIconClick = (event: MouseEvent) => {
    if (event.x === 0 && event.y === 0) {
      this._triggeredByKeyboard = true;
    } else {
      this._triggeredByKeyboard = false;
    }
  };

  private _addKitchenSinkItem(): void {
    const { position, expandOnFirstPlay } = this._configs.pluginConfig;
    this._kitchenSinkItem = this._contribServices.kitchenSinkManager.add({
      label: "Navigation",
      expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
      renderIcon: () => (
        // TODO - resolve tabIndex race with the core.
        <button
          className={styles.pluginButton}
          tabIndex={1}
          onClick={this._handleIconClick}
        >
          <div className={styles.pluginIcon} />
        </button>
      ),
      position: getConfigValue(
        position,
        (position: KitchenSinkPositions) =>
          typeof position === "string" &&
          (position === KitchenSinkPositions.Bottom ||
            position === KitchenSinkPositions.Right),
        KitchenSinkPositions.Right
      ),
      renderContent: this._renderKitchenSinkContent
    });

    if (expandOnFirstPlay) {
      this._kitchenSinkItem.activate();
    }
  }

  private _fetchVodData = () => {
    const requests: KalturaRequest<any>[] = [];
    const chaptersAndSlidesRequest = new CuePointListAction({
      filter: new KalturaThumbCuePointFilter({
        entryIdEqual: this._corePlugin.player.config.sources.id,
        cuePointTypeEqual: KalturaCuePointType.thumb,
        subTypeIn: `${KalturaThumbCuePointSubType.slide},${KalturaThumbCuePointSubType.chapter}`
      })
    });
    const hotspotsRequest = new CuePointListAction({
      filter: new KalturaCuePointFilter({
        entryIdEqual: this._corePlugin.player.config.sources.id,
        cuePointTypeEqual: KalturaCuePointType.annotation
      })
    });

    chaptersAndSlidesRequest.setRequestOptions({
      acceptedTypes: [KalturaThumbCuePoint]
    });
    hotspotsRequest.setRequestOptions({
      acceptedTypes: [KalturaAnnotation]
    });

    requests.push(chaptersAndSlidesRequest, hotspotsRequest);
    this._kalturaClient.multiRequest(requests).then(
      (responses: KalturaMultiResponse | null) => {
        this._listData = prepareVodData(
          responses,
          this._configs.playerConfig.provider.ks,
          this._configs.playerConfig.provider.env.serviceUrl,
          this._corePlugin.config.forceChaptersThumb
        );
        this._updateKitchenSink();
      },
      error => {
        this._hasError = true;
        logger.error("failed retrieving navigation data", {
          method: "_fetchVodData",
          data: error
        });
        this._updateKitchenSink();
      }
    );
  };
}

ContribPluginManager.registerPlugin(
  pluginName,
  (data: ContribPluginData<NavigationPluginConfig>) => {
    return new NavigationPlugin(
      data.corePlugin,
      data.contribServices,
      data.configs
    );
  },
  {
    defaultConfig: {
      expandOnFirstPlay: true,
      position: KitchenSinkPositions.Left,
      forceChaptersThumb: false,
      userRole: UserRole.anonymousRole
    }
  }
);
