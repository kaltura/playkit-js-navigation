import {h} from 'preact';
import {
  ContribPluginConfigs,
  ContribPluginData,
  ContribPluginManager,
  ContribServices,
  CorePlugin,
  OnMediaLoad,
  OnMediaUnload,
} from '@playkit-js-contrib/plugin';
import {
  getContribLogger,
  KalturaLiveServices,
  debounce,
  ObjectUtils,
} from '@playkit-js-contrib/common';
import {
  KitchenSinkContentRendererProps,
  KitchenSinkExpandModes,
  KitchenSinkItem,
  KitchenSinkPositions,
} from '@playkit-js-contrib/ui';
import {KalturaThumbCuePoint} from 'kaltura-typescript-client/api/types/KalturaThumbCuePoint';
import {KalturaAnnotation} from 'kaltura-typescript-client/api/types/KalturaAnnotation';
import {CuePointListAction} from 'kaltura-typescript-client/api/types/CuePointListAction';
import {KalturaCuePointFilter} from 'kaltura-typescript-client/api/types/KalturaCuePointFilter';
import {KalturaCuePointType} from 'kaltura-typescript-client/api/types/KalturaCuePointType';
import {KalturaThumbCuePointSubType} from 'kaltura-typescript-client/api/types/KalturaThumbCuePointSubType';
import {KalturaThumbCuePointFilter} from 'kaltura-typescript-client/api/types/KalturaThumbCuePointFilter';
import {KalturaCaptionAsset} from 'kaltura-typescript-client/api/types/KalturaCaptionAsset';
import {CaptionAssetListAction} from 'kaltura-typescript-client/api/types/CaptionAssetListAction';
import {KalturaCaptionAssetListResponse} from 'kaltura-typescript-client/api/types/KalturaCaptionAssetListResponse';
import {KalturaCuePointListResponse} from 'kaltura-typescript-client/api/types/KalturaCuePointListResponse';
import {ThumbAssetGetUrlAction} from "kaltura-typescript-client/api/types/ThumbAssetGetUrlAction";
import {KalturaThumbParams} from "kaltura-typescript-client/api/types/KalturaThumbParams";
import {KalturaClient, KalturaRequest} from 'kaltura-typescript-client';
import {
  getConfigValue,
  prepareVodData,
  prepareLiveData,
  cuePointTags,
  itemTypesOrder,
  prepareItemTypesOrder,
  preparePendingCuepoints,
  sortItems,
  itemTypes,
  isEmptyObject,
  checkResponce,
  filterCuepointsByStartTime,
  filterPreviewDuplications,
  getKs,
} from './utils';
import {
  getCaptions,
  makeCaptionAssetListRequest,
  findCaptionAsset,
} from './captions';
import {
  PushNotification,
  PushNotificationEventTypes,
  PublicNotificationsEvent,
  ThumbNotificationsEvent,
  SlideNotificationsEvent,
  NotificationsErrorEvent,
} from './pushNotification';
import {Navigation} from './components/navigation';
import {PluginButton} from './components/navigation/plugin-button';
import {
  ItemData,
  RawItemData,
} from './components/navigation/navigation-item/NavigationItem';
const {Tooltip} = KalturaPlayer.ui.components;
const {get} = ObjectUtils;

const pluginName = `navigation`;

const logger = getContribLogger({
  class: 'NavigationPlugin',
  module: 'navigation-plugin',
});

interface NavigationPluginConfig {
  expandOnFirstPlay: boolean;
  position: KitchenSinkPositions;
  forceChaptersThumb: boolean;
  userRole: string;
  expandMode: KitchenSinkExpandModes;
  itemsOrder: typeof itemTypesOrder;
}

const DefaultAnonymousPrefix = 'Guest';
const DEBOUNCE_TIMEOUT = 1000;

enum UserRole {
  anonymousRole = 'anonymousRole',
  unmoderatedAdminRole = 'unmoderatedAdminRole',
}

export class NavigationPlugin
  implements OnMediaLoad, OnMediaUnload, OnMediaUnload {
  private _kitchenSinkItem: KitchenSinkItem | null = null;
  private _pushNotification: PushNotification;
  private _kalturaClient = new KalturaClient();
  private _initialData: Array<ItemData> = [];
  private _listItemsData: Array<ItemData> = [];
  private _pendingData: Array<ItemData> = []; //_pendingData keeps live quepionts till player currentTime reach quepoint start-time
  private _captionAssetList: KalturaCaptionAsset[] = [];
  private _triggeredByKeyboard = false;
  private _isLoading = false;
  private _hasError = false;
  private _itemsOrder = itemTypesOrder;
  private _itemsFilter = itemTypesOrder;

  private _id3Timestamp: number | null = 0;
  private _currentTime = 0;
  private _currentTimeLive = 0;
  private _seekDifference: number | null = 0;

  private _makeThumbUrlLoaderResolvePromise = () => {
    return new Promise<void>(res => {
      this._baseThumbAssetUrlResolvePromise = res;
    });
  };

  private _baseThumbAssetUrl = '';
  private _baseThumbAssetUrlResolvePromise = () => {};
  private _baseThumbAssetUrlPromise = this._makeThumbUrlLoaderResolvePromise();
  private _baseThumbAssetUrlIsFetching = false;

  private get _listData() {
    return this._listItemsData;
  }

  private set _listData(data: Array<ItemData>) {
    this._listItemsData = filterPreviewDuplications(data);
  }

  constructor(
    private _corePlugin: CorePlugin,
    private _contribServices: ContribServices,
    private _configs: ContribPluginConfigs<NavigationPluginConfig>
  ) {
    const {playerConfig, pluginConfig} = this._configs;
    this._kalturaClient.setOptions({
      clientTag: 'playkit-js-navigation',
      endpointUrl: playerConfig.provider.env.serviceUrl,
    });
    this._pushNotification = new PushNotification(this._corePlugin.player);
    this._itemsOrder = prepareItemTypesOrder(pluginConfig.itemsOrder);
    this._itemsFilter = isEmptyObject(pluginConfig.itemsOrder)
      ? itemTypesOrder
      : pluginConfig.itemsOrder;
  }

  private _fetchThumbAssetUrl = (thumbAssetId: string): void => {
    if (!this._baseThumbAssetUrl && !this._baseThumbAssetUrlIsFetching) {
      this._baseThumbAssetUrlIsFetching = true;
      const thumbParams = new KalturaThumbParams();
      this._kalturaClient.request(new ThumbAssetGetUrlAction({id: thumbAssetId, storageId: 0, thumbParams}))
        .then(response => {
          this._baseThumbAssetUrlIsFetching = false;
          if (response) {
            this._baseThumbAssetUrl = response;
            this._baseThumbAssetUrlResolvePromise();
          }
        }, err => {
          this._baseThumbAssetUrlIsFetching = false;
          logger.error(
            `Can't load baseThumbAssetUrl`,
            {
              method: '_getBaseThumbAssetUrl',
              data: err,
            }
          );
        })
    }
  }

  private _resetBaseThumbAssetUrl = () => {
    this._baseThumbAssetUrl = '';
    this._baseThumbAssetUrlPromise = this._makeThumbUrlLoaderResolvePromise();
  }

  private _updateKitchenSink = () => {
    if (this._kitchenSinkItem) {
      this._kitchenSinkItem.update();
    }
  };

  private _debouncedUpdateKitchenSink = debounce(
    this._updateKitchenSink,
    DEBOUNCE_TIMEOUT
  );

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
      this._corePlugin.player.addEventListener(
        this._corePlugin.player.Event.SEEKING,
        this._handleSeeking
      );
    } else if (this._itemsFilter[itemTypes.Caption]) {
      this._corePlugin.player.addEventListener(
        this._corePlugin.player.Event.TEXT_TRACK_CHANGED,
        this._handleLanguageChange
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
      this._corePlugin.player.removeEventListener(
        this._corePlugin.player.Event.SEEKING,
        this._handleSeeking
      );
    } else if (this._itemsFilter[itemTypes.Caption]) {
      this._corePlugin.player.removeEventListener(
        this._corePlugin.player.Event.TEXT_TRACK_CHANGED,
        this._handleLanguageChange
      );
    }
  }

  private _handleSeeking = (): void => {
    this._seekDifference = Math.ceil(this._currentTime - this._corePlugin.player.currentTime);
  }

  private _onTimedMetadataLoaded = (event: any): void => {
    // TODO: handle dash format
    const id3TagCues = event.payload.cues.filter(
      (cue: any) => cue.value && cue.value.key === 'TEXT'
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
            method: '_onTimedMetadataLoaded',
          }
        );
        if (id3Timestamp) {
          this._id3Timestamp = id3Timestamp;
        }
      } catch (e) {
        logger.debug('failed retrieving id3 tag metadata', {
          method: '_onTimedMetadataLoaded',
          data: e as any,
        });
      }
    }
  };

  onMediaLoad(): void {
    this._addPlayerListeners();
    if (this._corePlugin.player.isLive()) {
      // always initialize plugin UI for live type of media
      this._addKitchenSinkItem();
      this._registerToPushServer();
    } else {
      this._kalturaClient.setDefaultRequestOptions({
        ks: this._corePlugin.player.config.session?.ks,
      });
      this._fetchVodData();
    }
  }

  onMediaUnload(): void {
    this._resetBaseThumbAssetUrl();
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

  private _registerToPushServer = () => {
    const {
      playerConfig: {sources},
    } = this._configs;
    this._initNotification();
    this._constructPushNotificationListener();
    const userId = this.getUserId();
    this._pushNotification.registerToPushServer(
      sources.id,
      userId,
      this._updateKitchenSink,
      this._handlePushNotificationRegistrationError
    );
  };

  private _handlePushNotificationRegistrationError = () => {
    this._hasError = true;
    this._updateKitchenSink();
  };

  private _retryFetchData = () => {
    this._hasError = false;
    if (this._corePlugin.player.isLive()) {
      this._registerToPushServer();
    } else {
      this._fetchVodData();
    }
  };

  private _seekTo = (time: number) => {
    if (!this._corePlugin.player.isLive()) {
      this._corePlugin.player.currentTime = time;
      return;
    }
    if (this._corePlugin.player.isDvr()) {
      // live quepoints has absolute time
      const newCurrentTime = this._corePlugin.player.currentTime - (this._currentTimeLive - time);
      if (Math.abs(this._corePlugin.player.currentTime - newCurrentTime) >= 1) {
        // prevent seek less than 1s
        this._corePlugin.player.currentTime = newCurrentTime;
      }
    }
  };

  private getUserId(): string {
    // TODO: consider move to contrib
    const {session} = this._configs.playerConfig;

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
    if (!this._configs.playerConfig.session?.ks) {
      logger.warn(
        'Warn: Failed to initialize.' +
          'Failed to retrieve ks from configuration ' +
          '(both providers and session objects returned with an undefined KS),' +
          ' please check your configuration file.',
        {
          method: '_initPluginManagers',
        }
      );
      return;
    }
    const {
      playerConfig: {provider},
    } = this._configs;
    // should be created once on pluginSetup (entryId/userId registration will be called onMediaLoad)
    this._pushNotification.init({
      ks: this._configs.playerConfig.session?.ks,
      serviceUrl: provider.env.serviceUrl,
      clientTag: 'playkit-js-navigation',
      kalturaPlayer: this._corePlugin.player,
    });
  }

  private _updateData = (cuePointData: any[]) => {
    const {listData, pendingData} = prepareLiveData(
      this._listData,
      this._pendingData,
      cuePointData,
      getKs(this._corePlugin.player),
      this._configs.playerConfig.provider.env.serviceUrl,
      this._corePlugin.config.forceChaptersThumb,
      this._itemsOrder,
      this._currentTimeLive,
      this._baseThumbAssetUrl
    );
    this._listData = listData;
    this._pendingData = pendingData;
    this._debouncedUpdateKitchenSink();
  };

  private _handleAoaMessages = ({messages}: PublicNotificationsEvent): void => {
    logger.debug('handle push notification event', {
      method: '_handleAoaMessages',
      data: messages,
    });
    const aoaMessages: KalturaAnnotation[] = messages
      .filter((message: KalturaAnnotation) => {
        return message.tags === cuePointTags.AnswerOnAir;
      })
      .filter((message: KalturaAnnotation) => {
        const relatedObject: any =
          message.relatedObjects['QandA_ResponseProfile'];
        if (relatedObject.objects.length === 0) {
          // "There are no metadata objects xml at KalturaMetadataListResponse"
          return;
        }
        const metadata = relatedObject.objects[0];
        return metadata.xml.includes('<Type>AnswerOnAir</Type>');
      });
    this._updateData(aoaMessages);
  };

  private _handleThumbMessages = ({thumbs}: ThumbNotificationsEvent): void => {
    this._fetchThumbAssetUrl(thumbs[0]?.assetId);
    this._baseThumbAssetUrlPromise.then(() => {
      // wait till baseThumbAssetUrl fetched
      logger.debug('handle push notification event', {
        method: '_handleThumbMessages',
        data: thumbs,
      });
      this._updateData(thumbs);
    })
  };

  // private _handleSlideMessages = ({
  //   slides
  // }: SlideNotificationsEvent): void => {};

  // private _handlePushNotificationError = ({
  //   error
  // }: NotificationsErrorEvent): void => {};

  private _constructPushNotificationListener(): void {
    // TODO: handle push notification errors
    // this._pushNotification.on(
    //   PushNotificationEventTypes.PushNotificationsError,
    //   this._handlePushNotificationError
    // );
    if (this._itemsFilter[itemTypes.AnswerOnAir]) {
      this._pushNotification.on(
        PushNotificationEventTypes.PublicNotifications,
        this._handleAoaMessages
      );
    }

    if (this._itemsFilter[itemTypes.Slide]) {
      this._pushNotification.on(
        PushNotificationEventTypes.ThumbNotification,
        this._handleThumbMessages
      );
    }

    // TODO: handle change-view-mode
    // this._pushNotification.on(
    //   PushNotificationEventTypes.SlideNotification,
    //   this._handleSlideMessages
    // );
  }

  private _removePushNotificationListener(): void {
    // this._pushNotification.off(
    //   PushNotificationEventTypes.PushNotificationsError,
    //   this._handlePushNotificationError
    // );
    this._pushNotification.off(
      PushNotificationEventTypes.PublicNotifications,
      this._handleAoaMessages
    );
    this._pushNotification.off(
      PushNotificationEventTypes.ThumbNotification,
      this._handleThumbMessages
    );
    // this._pushNotification.off(
    //   PushNotificationEventTypes.SlideNotification,
    //   this._handleSlideMessages
    // );
  }

  private _renderKitchenSinkContent = (
    props: KitchenSinkContentRendererProps
  ) => {
    const isLive = this._corePlugin.player.isLive();
    return (
      <Navigation
        {...props}
        data={this._listData}
        onItemClicked={this._seekTo}
        isLoading={this._isLoading}
        hasError={this._hasError}
        retry={this._retryFetchData}
        currentTime={isLive ? this._currentTimeLive : this._currentTime}
        kitchenSinkActive={!!this._kitchenSinkItem?.isActive()}
        toggledWithEnter={this._triggeredByKeyboard}
        itemsOrder={this._itemsOrder}
        isLive={isLive}
      />
    );
  };

  private _onTimeUpdate = (): void => {
    if (this._corePlugin.player.isLive()) {
      const newTime = Math.floor(this._corePlugin.player.currentTime);
      if (newTime === this._currentTime) {
        return;
      }
      this._currentTime = newTime;
      if (this._seekDifference !== null && this._currentTimeLive) {
        // update _currentTimeLive after seek
        this._currentTimeLive = this._currentTimeLive - this._seekDifference;
      } else if (this._id3Timestamp) {
        if (this._id3Timestamp === this._currentTimeLive) {
          // prevent updating if calculated _currentTimeLive value the same as _id3Timestamp
          this._id3Timestamp = null;
          return;
        }
        // update _currentTimeLive from id3Tag time
        this._currentTimeLive = this._id3Timestamp;
      } else {
        // update _currentTimeLive between id3Tags
        this._currentTimeLive++;
      }

      this._id3Timestamp = null;
      this._seekDifference = null;

      // compare startTime of pending items with _currentTimeLive
      if (this._pendingData.length) {
        const {listData, pendingData} = preparePendingCuepoints(
          this._pendingData,
          this._currentTimeLive
        );
        this._pendingData = pendingData;
        if (listData.length) {
          this._listData = sortItems(
            this._listData.concat(listData),
            this._itemsOrder
          );
        }
      }

      // filter cuepoints that out of DVR window
      if (this._corePlugin.player.isDvr()) {
        this._listData = filterCuepointsByStartTime(
          this._listData,
          this._currentTimeLive - this._currentTime
        )
      }
    } else {
      this._currentTime = this._corePlugin.player.currentTime;
    }
    this._updateKitchenSink();
  };

  private _handleIconClick = (event: MouseEvent) => {
    this._triggeredByKeyboard = event.x === 0 && event.y === 0;
  };

  private _addKitchenSinkItem(): void {
    const buttonLabel = 'Search in Video';
    const {
      expandMode,
      position,
      expandOnFirstPlay,
    } = this._configs.pluginConfig;
    this._kitchenSinkItem = this._contribServices.kitchenSinkManager.add({
      label: 'Navigation',
      expandMode:
        expandMode === KitchenSinkExpandModes.OverTheVideo
          ? KitchenSinkExpandModes.OverTheVideo
          : KitchenSinkExpandModes.AlongSideTheVideo,
      renderIcon: (isActive: boolean) => {
        return (
          <Tooltip label={buttonLabel} type="bottom">
            <PluginButton label={buttonLabel} onClick={this._handleIconClick} selected={isActive} />
          </Tooltip>
        );
      },
      position: getConfigValue(
        position,
        (position: KitchenSinkPositions) =>
          typeof position === 'string' &&
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

  private _handleLanguageChange = (
    event: string | Record<string, any> = get(
      this._configs,
      'playerConfig.playback.textLanguage',
      ''
    )
  ) => {
    if (
      ((typeof event === 'string'
        ? event
        : get(event, 'payload.selectedTextTrack._language', null)) === 'off' &&
        this._captionAssetList.length) ||
      !this._captionAssetList.length
    ) {
      // prevent loading of captions when user select "off" captions option
      return;
    }
    this._isLoading = true;
    this._updateKitchenSink();
    this._loadCaptions(event)
      .then((captionList: Array<ItemData>) => {
        this._listData = [...this._initialData, ...captionList];
        this._isLoading = false;
        this._updateKitchenSink();
      })
      .catch((error) => {
        this._hasError = true;
        this._isLoading = false;
        logger.error('failed retrieving caption asset', {
          method: '_handleLanguageChange',
          data: error,
        });
        this._updateKitchenSink();
      });
  };

  private _loadCaptions = async (event?: {}) => {
    if (!this._captionAssetList.length) {
      return [];
    }
    const captionAsset = findCaptionAsset(
      event || get(this._configs, 'playerConfig.playback.textLanguage', ''),
      this._captionAssetList
    );
    const rawCaptionList: any = await getCaptions(
      this._kalturaClient,
      captionAsset,
      this._captionAssetList
    );
    const captionList = Array.isArray(rawCaptionList)
      ? prepareVodData(
          rawCaptionList as Array<RawItemData>,
          getKs(this._corePlugin.player),
          this._configs.playerConfig.provider.env.serviceUrl,
          this._corePlugin.config.forceChaptersThumb,
          this._itemsOrder
        )
      : [];
    return captionList;
  };

  private _fetchVodData = async () => {
    const requests: KalturaRequest<any>[] = [];
    let subTypesFilter = '';
    if (this._itemsFilter[itemTypes.Slide]) {
      subTypesFilter = `${subTypesFilter}${KalturaThumbCuePointSubType.slide},`;
    }
    if (this._itemsFilter[itemTypes.Chapter]) {
      subTypesFilter = `${subTypesFilter}${KalturaThumbCuePointSubType.chapter},`;
    }
    if (subTypesFilter) {
      const request: CuePointListAction = new CuePointListAction({
        filter: new KalturaThumbCuePointFilter({
          entryIdEqual: this._corePlugin.player.config.sources.id,
          cuePointTypeEqual: KalturaCuePointType.thumb,
          subTypeIn: subTypesFilter,
        }),
      });
      request.setRequestOptions({
        acceptedTypes: [KalturaThumbCuePoint],
      });
      requests.push(request);
    }
    if (this._itemsFilter[itemTypes.Hotspot]) {
      const request: CuePointListAction = new CuePointListAction({
        filter: new KalturaCuePointFilter({
          entryIdEqual: this._corePlugin.player.config.sources.id,
          cuePointTypeEqual: KalturaCuePointType.annotation,
        }),
      });
      request.setRequestOptions({
        acceptedTypes: [KalturaAnnotation],
      });
      requests.push(request);
    }
    if (this._itemsFilter[itemTypes.Caption]) {
      const request: CaptionAssetListAction = makeCaptionAssetListRequest(
        this._corePlugin.player.config.sources.id
      );
      requests.push(request);
    }
    if (this._itemsFilter[itemTypes.AnswerOnAir]) {
      // TODO: add AoA cuepointsType request
    }

    if (requests.length) {
      this._isLoading = true;
      this._updateKitchenSink();
      try {
        const responses = await this._kalturaClient.multiRequest(requests);
        if (!responses || responses.length === 0) {
          // Wrong or empty data
          throw new Error('ERROR! Wrong or empty data');
        }
        // extract all cuepoints from all requests
        let receivedCuepoints: Array<RawItemData> = [];
        let shouldWaitBaseThumbAssetUrlPromise = false;
        responses.forEach((response) => {
          if (checkResponce(response, KalturaCuePointListResponse)) {
            const cuePointListResponseData = response.result.objects as Array<RawItemData>;
            const cuePoint: RawItemData = cuePointListResponseData[0];
            if (cuePoint instanceof KalturaThumbCuePoint && (cuePoint as RawItemData).assetId) {
              this._fetchThumbAssetUrl((cuePoint as RawItemData).assetId as string);
              shouldWaitBaseThumbAssetUrlPromise = true;
            }
            receivedCuepoints = receivedCuepoints.concat(cuePointListResponseData);
          } else if (checkResponce(response, KalturaCaptionAssetListResponse)) {
            this._captionAssetList = response.result.objects;
          }
        });
        if (receivedCuepoints.length) {
          // for VOD type of media initialize plugin UI only if content exist
          this._addKitchenSinkItem();
        }
        if (shouldWaitBaseThumbAssetUrlPromise) {
          // wait till baseThumbAssetUrl fetched
          await this._baseThumbAssetUrlPromise;
        }
        this._initialData = prepareVodData(
          receivedCuepoints,
          getKs(this._corePlugin.player),
          this._configs.playerConfig.provider.env.serviceUrl,
          this._corePlugin.config.forceChaptersThumb,
          this._itemsOrder,
          this._baseThumbAssetUrl
        );
        if (this._captionAssetList.length) {
          const captionList = await this._loadCaptions();
          this._listData = [...this._initialData, ...captionList];
        } else {
          this._listData = [...this._initialData];
        }
        this._isLoading = false;
        this._updateKitchenSink();
      } catch (error) {
        this._hasError = true;
        this._isLoading = false;
        logger.error('failed retrieving navigation data', {
          method: '_fetchVodData',
          data: error as any,
        });
        this._updateKitchenSink();
      }
    }
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
      expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
      userRole: UserRole.anonymousRole,
      itemsOrder: {},
    },
  }
);
