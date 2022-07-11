// @ts-ignore
import {core} from 'kaltura-player-js';
import {h} from 'preact';
import {KalturaCaptionAsset} from 'kaltura-typescript-client/api/types/KalturaCaptionAsset';
import {CaptionAssetListAction} from 'kaltura-typescript-client/api/types/CaptionAssetListAction';
import {KalturaClient} from 'kaltura-typescript-client';
import {
  itemTypesOrder,
  sortItems,
  checkType,
  filterDuplications,
  prepareCuePoint,
  addOrReplaceCaptions,
  prepareItemTypesOrder,
  isEmptyObject
} from './utils';
import {getCaptions, makeCaptionAssetListRequest, findCaptionAsset} from './captions';
import {Navigation} from './components/navigation';
import {PluginButton} from './components/navigation/plugin-button';

const {Tooltip} = KalturaPlayer.ui.components;
const {TimedMetadata} = core;

import {ui} from 'kaltura-player-js';
import {NavigationConfig, PluginStates, ItemTypes, ItemData, CuePoint, HighlightedMap} from './types';
const {SidePanelModes, SidePanelPositions, ReservedPresetNames} = ui;

interface TimedMetadataEvent {
  payload: {
    cues: Array<CuePoint>;
  };
}

export class NavigationPlugin extends KalturaPlayer.core.BasePlugin {
  private _kalturaClient = new KalturaClient();
  private _navigationData: Array<ItemData> = [];
  private _captionAssetList: KalturaCaptionAsset[] = [];
  private _triggeredByKeyboard = false;
  private _isLoading = false;
  private _hasError = false;
  private _itemsOrder = itemTypesOrder;
  private _itemsFilter = itemTypesOrder;
  private _activeCuePointsMap: HighlightedMap = new Map();

  private _player: KalturaPlayerTypes.Player;
  private _navigationPanel = null;
  private _pluginState: PluginStates | null = null;

  static defaultConfig: NavigationConfig = {
    position: SidePanelPositions.RIGHT,
    expandMode: SidePanelModes.ALONGSIDE,
    expandOnFirstPlay: false,
    forceChaptersThumb: false,
    itemsOrder: {}
  };

  constructor(name: string, player: KalturaPlayerTypes.Player, config: NavigationConfig) {
    super(name, player, config);
    this._player = player;
    this._itemsOrder = prepareItemTypesOrder(this.config.itemsOrder);
    this._itemsFilter = isEmptyObject(this.config.itemsOrder) ? itemTypesOrder : config.itemsOrder;
    this._kalturaClient.setOptions({
      clientTag: 'playkit-js-navigation',
      endpointUrl: player.provider.env.serviceUrl
    });
  }

  get sidePanelsManager() {
    return this.player.getService('sidePanelsManager') as any;
  }

  get cuePointManager() {
    return this._player.getService('kalturaCuepoints') as any;
  }

  private get _data() {
    return this._navigationData;
  }

  private set _data(data: Array<ItemData>) {
    this._navigationData = filterDuplications(data);
  }

  loadMedia(): void {
    if (!this.cuePointManager) {
      this.logger.warn("kalturaCuepoints or sidePanelsManager haven't registered");
      return;
    }

    this._addPlayerListeners();
    this._registerCuePointTypes();

    this._kalturaClient.setDefaultRequestOptions({
      ks: this.player.provider.ks
    });
    if (this.player.isLive()) {
      if (this._shouldExpandOnFirstPlay()) {
        this._addNavigationPlugin();
      }
    }
  }

  static isValid(): boolean {
    return true;
  }

  private _registerCuePointTypes = () => {
    const cuePointTypes: Array<string> = [];
    if (this._itemsFilter[ItemTypes.Slide]) {
      cuePointTypes.push(this.cuePointManager.CuepointType.SLIDE);
    }
    if (this._itemsFilter[ItemTypes.Chapter]) {
      cuePointTypes.push(this.cuePointManager.CuepointType.CHAPTER);
    }
    if (this._itemsFilter[ItemTypes.Hotspot]) {
      cuePointTypes.push(this.cuePointManager.CuepointType.HOTSPOT);
    }
    if (this._itemsFilter[ItemTypes.AnswerOnAir]) {
      cuePointTypes.push(this.cuePointManager.CuepointType.QNA);
    }

    if (cuePointTypes.length) {
      this.cuePointManager.registerTypes(cuePointTypes);
    }
    // TODO: move captions to separate service
    if (this._itemsFilter[ItemTypes.Caption]) {
      this._loadCaptionList();
    }
  };

  private _addNavigationData = (data: ItemData[]) => {
    this._data = sortItems([...this._data, ...data], this._itemsOrder);
  };

  private _replaceNavigationData = (data: ItemData[]) => {
    this._data = sortItems(data, this._itemsOrder);
  };

  private _getCuePointType = (cue: CuePoint): ItemTypes | null => {
    const {metadata} = cue;
    const {KalturaCuePointType, KalturaThumbCuePointSubType, KalturaCuePointTags} = this.cuePointManager;
    if (cue?.type !== TimedMetadata.TYPE.CUE_POINT) {
      return null;
    }
    if (metadata?.cuePointType === KalturaCuePointType.THUMB && metadata?.subType === KalturaThumbCuePointSubType.SLIDE) {
      return ItemTypes.Slide;
    }
    if (metadata?.cuePointType === KalturaCuePointType.THUMB && metadata?.subType === KalturaThumbCuePointSubType.CHAPTER) {
      return ItemTypes.Chapter;
    }
    if (metadata?.cuePointType === KalturaCuePointType.ANNOTATION && metadata?.tags === KalturaCuePointTags.HOTSPOT) {
      return ItemTypes.Hotspot;
    }
    if (metadata?.cuePointType === KalturaCuePointType.ANNOTATION && metadata?.tags === KalturaCuePointTags.ANSWERONAIR) {
      const relatedObjects = metadata?.relatedObjects?.QandA_ResponseProfile;
      const relatedObject = relatedObjects?.objects[0];
      return relatedObject?.xml.includes('<Type>AnswerOnAir</Type>') ? ItemTypes.AnswerOnAir : null;
    }
    return null;
  };

  private _onTimedMetadataAdded = ({payload}: TimedMetadataEvent) => {
    const isLive = this._player.isLive();
    const navigationData: ItemData[] = [];
    payload.cues.forEach((cue: CuePoint) => {
      if (this._getCuePointType(cue) === ItemTypes.Slide && this._itemsFilter[ItemTypes.Slide]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.Slide, isLive));
      }
      if (this._getCuePointType(cue) === ItemTypes.Chapter && this._itemsFilter[ItemTypes.Chapter]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.Chapter, isLive, this.config.forceChaptersThumb));
      }
      if (this._getCuePointType(cue) === ItemTypes.Hotspot && this._itemsFilter[ItemTypes.Hotspot]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.Hotspot, isLive));
      }
      if (this._getCuePointType(cue) === ItemTypes.AnswerOnAir && this._itemsFilter[ItemTypes.AnswerOnAir]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.AnswerOnAir, isLive));
      }
    });

    this._addNavigationData(navigationData);
    if (this._navigationPanel) {
      this._updateNavigationPlugin();
    } else {
      this._addNavigationPlugin();
    }
  };

  private _onTimedMetadataChange = ({payload}: TimedMetadataEvent) => {
    const navigationCuePoints: Array<CuePoint> = payload.cues.filter((cue: CuePoint) => {
      const cuePointType = this._getCuePointType(cue);
      const filterTypePassed = cuePointType && this._itemsFilter[cuePointType];
      return filterTypePassed;
    });
    this._activeCuePointsMap = new Map();
    if (navigationCuePoints.length) {
      if (this._player.isLive()) {
        navigationCuePoints.forEach(item => {
          this._activeCuePointsMap.set(item.id, true);
        });
        this._updateNavigationPlugin();
      } else {
        const latestNavigationCuePoint = navigationCuePoints[navigationCuePoints.length - 1];
        const relevantNavigationItem = this._data.find(item => item.id === latestNavigationCuePoint.id);
        if (relevantNavigationItem) {
          const highlightedGroup = this._data.filter(item => {
            return item.displayTime === relevantNavigationItem.displayTime;
          });
          if (highlightedGroup.length) {
            highlightedGroup.forEach(item => {
              this._activeCuePointsMap.set(item.id, true);
            });
            this._updateNavigationPlugin();
          }
        }
      }
    }
  };

  private _updateNavigationPlugin = () => {
    if (this._navigationPanel) {
      this.sidePanelsManager.update(this._navigationPanel);
    }
  };

  private _addPlayerListeners() {
    this.eventManager.listen(this._player, this._player.Event.TIMED_METADATA_CHANGE, this._onTimedMetadataChange);
    this.eventManager.listen(this._player, this._player.Event.TIMED_METADATA_ADDED, this._onTimedMetadataAdded);

    this.eventManager.listen(this._player, this._player.Event.RESIZE, this._updateNavigationPlugin);

    if (!this.player.isLive() && this._itemsFilter[ItemTypes.Caption]) {
      this.eventManager.listen(this._player, this._player.Event.TEXT_TRACK_CHANGED, this._handleLanguageChange);
    }
  }

  private _retryFetchData = () => {
    this._hasError = false;
    this._loadCaptionList();
  };

  private _seekTo = (time: number) => {
    this.player.currentTime = time;
  };

  private _addNavigationPlugin(): void {
    if (this._navigationPanel) {
      return;
    }
    const buttonLabel = 'Navigation Menu';

    this._navigationPanel = this.sidePanelsManager.addItem({
      label: 'Navigation',
      panelComponent: () => {
        return (
          <Navigation
            onClose={() => {
              this.sidePanelsManager.deactivateItem(this._navigationPanel);
              this._pluginState = PluginStates.CLOSED;
            }}
            data={this._data}
            onItemClicked={this._seekTo}
            isLoading={this._isLoading}
            hasError={this._hasError}
            retry={this._retryFetchData}
            highlightedMap={this._activeCuePointsMap}
            kitchenSinkActive={!!this.sidePanelsManager.isItemActive(this._navigationPanel)}
            toggledWithEnter={this._triggeredByKeyboard} // TODO: handle
            itemsOrder={this._itemsOrder}
          />
        );
      },
      iconComponent: () => {
        return (
          <Tooltip label={buttonLabel} type="bottom">
            <PluginButton
              onClick={() => {
                if (this.sidePanelsManager.isItemActive(this._navigationPanel)) {
                  this._pluginState = PluginStates.CLOSED;
                  this.sidePanelsManager.deactivateItem(this._navigationPanel);
                } else {
                  this.sidePanelsManager.activateItem(this._navigationPanel);
                }
              }}
              label={buttonLabel}
            />
          </Tooltip>
        );
      },
      presets: [ReservedPresetNames.Playback, ReservedPresetNames.Live, ReservedPresetNames.Ads],
      position: this.config.position,
      expandMode: this.config.expandMode,
      onActivate: () => {
        this._pluginState = PluginStates.OPENED;
      }
    });

    if (this._shouldExpandOnFirstPlay()) {
      this.ready.then(() => {
        this.sidePanelsManager.activateItem(this._navigationPanel);
      });
    }
  }

  private _shouldExpandOnFirstPlay = () => {
    return (this.config.expandOnFirstPlay && !this._pluginState) || this._pluginState === PluginStates.OPENED;
  };

  private _handleLanguageChange = (event: string | Record<string, any> = this.player.config?.playback?.textLanguage || '') => {
    if (
      (typeof event === 'string' ? event : (event.payload?.selectedTextTrack?._language || null) === 'off' && this._captionAssetList.length) ||
      !this._captionAssetList.length
    ) {
      // prevent loading of captions when user select "off" captions option
      return;
    }
    this._isLoading = true;
    this._updateNavigationPlugin();
    this._loadCaptions(event)
      .then((captionList: Array<ItemData>) => {
        this._replaceNavigationData(addOrReplaceCaptions(this._data, captionList));
        this._isLoading = false;
        this._updateNavigationPlugin();
      })
      .catch(() => {
        this._hasError = true;
        this._isLoading = false;
        this.logger.error('failed retrieving caption asset');
        this._updateNavigationPlugin();
      });
  };

  private _loadCaptions = async (event?: {}): Promise<ItemData[]> => {
    if (!this._captionAssetList.length) {
      return [];
    }
    const captionAsset = findCaptionAsset(event || this.player.config?.playback?.textLanguage || '', this._captionAssetList);
    const rawCaptionList: any = await getCaptions(this._kalturaClient, captionAsset, this._captionAssetList);
    return Array.isArray(rawCaptionList)
      ? rawCaptionList.map(captionItem => {
          return prepareCuePoint({...captionItem, startTime: captionItem.startTime / 1000}, ItemTypes.Caption, false);
        })
      : [];
  };

  private _loadCaptionList = async () => {
    const request: CaptionAssetListAction = makeCaptionAssetListRequest(this.player.config.sources.id);
    try {
      this._isLoading = true;
      this._updateNavigationPlugin();
      const response = await this._kalturaClient.request(request);
      if (!response) {
        // Wrong or empty data
        throw new Error('ERROR! Wrong or empty data');
      }
      if (Array.isArray(response?.objects) && response.objects.every(captionAsset => checkType(captionAsset, KalturaCaptionAsset))) {
        this._captionAssetList = response.objects;
      }
      if (this._captionAssetList.length) {
        const captionList = await this._loadCaptions();
        this._replaceNavigationData(addOrReplaceCaptions(this._data, captionList));
      }
      this._isLoading = false;
      this._updateNavigationPlugin();
    } catch (error) {
      this._hasError = true;
      this._isLoading = false;
      this.logger.error('failed retrieving caption data');
      this._updateNavigationPlugin();
    }
  };

  reset(): void {
    this._navigationPanel = null;
    this._activeCuePointsMap = new Map();
    this._navigationData = [];
    this._captionAssetList = [];
    this._isLoading = false;
    this._hasError = false;
    this._triggeredByKeyboard = false;
    this.eventManager.removeAll();
  }

  destroy(): void {
    this._pluginState = null;
  }
}
