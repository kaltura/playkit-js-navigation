import { h } from "preact";

import {
  ContribPluginConfigs,
  ContribPluginData,
  ContribPluginManager,
  ContribServices,
  CorePlugin,
  OnMediaLoad,
  OnMediaUnload,
  OnPluginSetup,
} from "@playkit-js-contrib/plugin";
import {
  getContribLogger,
  KalturaLiveServices,
} from "@playkit-js-contrib/common";
import {
  KitchenSinkContentRendererProps,
  KitchenSinkExpandModes,
  KitchenSinkItem,
  KitchenSinkPositions,
  UpperBarItem,
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
  KalturaRequest,
} from "kaltura-typescript-client";
import { getConfigValue, perpareData } from "./utils/index";
import {
  PushNotification,
  PushNotificationEventTypes,
} from "./pushNotification";
import * as styles from "./navigation-plugin.scss";
import { Navigation } from "./components/navigation";

const pluginName = `navigation`;

const logger = getContribLogger({
  class: "NavigationPlugin",
  module: "navigation-plugin",
});

interface NavigationPluginConfig {
  expandOnFirstPlay: boolean;
  position: KitchenSinkPositions;
  userRole: string;
}

const DefaultAnonymousPrefix = "Guest";

enum UserRole {
  anonymousRole = "anonymousRole",
  unmoderatedAdminRole = "unmoderatedAdminRole",
}

export class NavigationPlugin
  implements OnMediaLoad, OnMediaUnload, OnPluginSetup, OnMediaUnload {
  private _kitchenSinkItem: KitchenSinkItem | null = null;
  private _upperBarItem: UpperBarItem | null = null;
  private _pushNotification: PushNotification;
  private _kalturaClient = new KalturaClient();
  private _listData: Array<any> = [];
  private _triggeredByKeyboard = false;
  private _isLoading = false; // TODO: handle is loading state
  private _hasError = false; // TODO: handle error state

  constructor(
    private _corePlugin: CorePlugin,
    private _contribServices: ContribServices,
    private _configs: ContribPluginConfigs<NavigationPluginConfig>
  ) {
    const { playerConfig } = this._configs;
    this._kalturaClient.setOptions({
      clientTag: "playkit-js-navigation",
      endpointUrl: playerConfig.provider.env.serviceUrl,
    });
    this._kalturaClient.setDefaultRequestOptions({
      ks: playerConfig.provider.ks,
    });
    this._pushNotification = new PushNotification(this._corePlugin.player);
    this._constructPluginListener();
  }

  onPluginSetup(): void {
    this._initKitchensinkAndUpperBarItems();
    this._initPluginManagers();
  }

  onMediaLoad(): void {
    if (this._corePlugin.player.isLive()) {
      const {
        playerConfig: { sources },
      } = this._configs;
      const userId = this.getUserId();
      this._pushNotification.registerToPushServer(sources.id, userId);
    } else {
      this._fetchVodData();
    }
  }

  onMediaUnload(): void {
    this._pushNotification.reset();
  }

  onPluginDestroy(): void {}

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

  private _initPluginManagers(): void {
    const ks = this._contribServices.getPlayerKS();
    if (!ks) {
      logger.warn(
        "Warn: Failed to initialize." +
          "Failed to retrieve ks from configuration " +
          "(both providers and session objects returned with an undefined KS)," +
          " please check your configuration file.",
        {
          method: "_initPluginManagers",
        }
      );
      return;
    }
    const {
      playerConfig: { provider },
    } = this._configs;
    // should be created once on pluginSetup (entryId/userId registration will be called onMediaLoad)
    this._pushNotification.init({
      ks: ks,
      serviceUrl: provider.env.serviceUrl,
      clientTag: "playkit-js-navigation",
      kalturaPlayer: this._corePlugin.player,
    });
  }

  private _onPushNotificationReceived = (e: any) => {
    console.log(">> PUSH NOTIFICATION RECEIVED, message", e);
  };

  private _constructPluginListener(): void {
    this._pushNotification.on(
      PushNotificationEventTypes.PushNotificationsError,
      this._onPushNotificationReceived // TODO: handle error
    );
    this._pushNotification.on(
      PushNotificationEventTypes.PublicNotifications,
      this._onPushNotificationReceived // TODO: handle aoa
    );
    this._pushNotification.on(
      PushNotificationEventTypes.ThumbNotification,
      this._onPushNotificationReceived // TODO: handle thumbs
    );
    this._pushNotification.on(
      PushNotificationEventTypes.SlideNotification,
      this._onPushNotificationReceived // TODO: handle slides
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
        onSeek={this._seekTo}
        isLoading={this._isLoading}
        hasError={this._hasError}
        currentTime={this._corePlugin.player.currentTime}
        kitchenSinkActive={!!this._kitchenSinkItem?.isActive()}
        toggledWithEnter={this._triggeredByKeyboard}
      />
    );
  };
  private _updateKitchenSink() {
    if (this._kitchenSinkItem) {
      this._kitchenSinkItem.update();
    }
  }

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
      renderContent: this._renderKitchenSinkContent,
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
        subTypeIn: `${KalturaThumbCuePointSubType.slide},${KalturaThumbCuePointSubType.chapter}`,
      }),
    });
    const hotspotsRequest = new CuePointListAction({
      filter: new KalturaCuePointFilter({
        entryIdEqual: this._corePlugin.player.config.sources.id,
        cuePointTypeEqual: KalturaCuePointType.annotation,
      }),
    });

    chaptersAndSlidesRequest.setRequestOptions({
      acceptedTypes: [KalturaThumbCuePoint],
    });
    hotspotsRequest.setRequestOptions({
      acceptedTypes: [KalturaAnnotation],
    });

    requests.push(chaptersAndSlidesRequest, hotspotsRequest);
    this._kalturaClient.multiRequest(requests).then(
      (responses: KalturaMultiResponse | null) => {
        const sortedData = perpareData(
          responses,
          this._configs.playerConfig.provider.ks,
          this._configs.playerConfig.provider.env.serviceUrl
        );
        this._listData = sortedData;
        this._updateKitchenSink();
      },
      (error) => {
        console.log("error", error);
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
      position: KitchenSinkPositions.Right,
      userRole: UserRole.anonymousRole,
    },
  }
);
