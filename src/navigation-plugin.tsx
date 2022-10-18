// @ts-ignore
import {core} from 'kaltura-player-js';
import {h} from 'preact';
import {itemTypesOrder, sortItems, filterDuplications, prepareCuePoint, prepareItemTypesOrder, isEmptyObject} from './utils';
import {Navigation} from './components/navigation';
import {PluginButton} from './components/navigation/plugin-button';
import {OnClickEvent} from '@playkit-js/common';

const {TimedMetadata} = core;

import {ui} from 'kaltura-player-js';
import {NavigationConfig, PluginStates, ItemTypes, ItemData, CuePoint, HighlightedMap, CuePointsMap} from './types';
const {SidePanelModes, SidePanelPositions, ReservedPresetNames} = ui;
const liveCuePointTimeThreshold = 20 * 1000; // 20 seconds threshold

interface TimedMetadataEvent {
  payload: {
    cues: Array<CuePoint>;
  };
}

export class NavigationPlugin extends KalturaPlayer.core.BasePlugin {
  private _navigationData: Array<ItemData> = [];
  private _triggeredByKeyboard = false;
  private _isLoading = false;
  private _hasError = false;
  private _itemsOrder = itemTypesOrder;
  private _itemsFilter = itemTypesOrder;
  private _activeCuePointsMap: HighlightedMap = new Map();
  private _captionMap: Map<string, Array<ItemData>> = new Map();
  private _activeCaptionMapId: string = '';
  private _navigationComponentRef: Navigation | null = null;

  private _player: KalturaPlayerTypes.Player;
  private _navigationPanel = null;
  private _pluginState: PluginStates | null = null;
  private _liveFutureCuePointsMap: CuePointsMap = new Map(); // map holding future cuepoints that were not reached yet

  static defaultConfig: NavigationConfig = {
    position: SidePanelPositions.RIGHT,
    expandMode: SidePanelModes.ALONGSIDE,
    expandOnFirstPlay: false,
    itemsOrder: {}
  };

  constructor(name: string, player: KalturaPlayerTypes.Player, config: NavigationConfig) {
    super(name, player, config);
    this._player = player;
    this._itemsOrder = prepareItemTypesOrder(this.config.itemsOrder);
    this._itemsFilter = isEmptyObject(this.config.itemsOrder) ? itemTypesOrder : config.itemsOrder;
  }

  get sidePanelsManager() {
    return this.player.getService('sidePanelsManager') as any;
  }

  get cuePointManager() {
    return this._player.getService('kalturaCuepoints') as any;
  }

  private get _data() {
    const activeCaptions: Array<ItemData> = this._captionMap.get(this._activeCaptionMapId) || [];
    return sortItems([...this._navigationData, ...activeCaptions], this._itemsOrder);
  }

  private set _data(data: Array<ItemData>) {
    this._navigationData = filterDuplications(data);
  }

  loadMedia(): void {
    if (!this.cuePointManager || !this.sidePanelsManager) {
      this.logger.warn("kalturaCuepoints or sidePanelsManager haven't registered");
      return;
    }

    this._addPlayerListeners();
    this._registerCuePointTypes();
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
      cuePointTypes.push(this.cuePointManager.CuepointType.PUBLIC_QNA);
    }
    if (this._itemsFilter[ItemTypes.Caption]) {
      cuePointTypes.push(this.cuePointManager.CuepointType.CAPTION);
    }
    this.cuePointManager.registerTypes(cuePointTypes);
  };

  private _addNavigationData = (newData: ItemData[]) => {
    this._data = sortItems([...this._data, ...newData], this._itemsOrder);
    this._createOrUpdatePlugin();
  };

  private _addCaptionData = (newData: ItemData[]) => {
    this._activeCaptionMapId = this._getCaptionMapId();
    this._captionMap.set(this._activeCaptionMapId, newData);
    this._createOrUpdatePlugin();
  };

  private _handleLanguageChange = () => {
    this._activeCaptionMapId = this._getCaptionMapId();
    if (this._captionMap.has(this._activeCaptionMapId)) {
      this._updateNavigationPlugin();
    }
  };

  private _getCaptionMapId = (): string => {
    const allTextTracks = this._player.getTracks(this._player.Track.TEXT) || [];
    const activeTextTrack = allTextTracks.find(track => track.active);
    if (activeTextTrack) {
      const captionMapId = `${activeTextTrack.language}-${activeTextTrack.label}`;
      return captionMapId;
    }
    return '';
  };

  private _isSearchActive = () => {
    const searchQuery = this._navigationComponentRef?.state.searchFilter?.searchQuery;
    return Boolean(searchQuery && searchQuery.length > 0);
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
    if (metadata?.cuePointType === KalturaCuePointType.CAPTION) {
      return ItemTypes.Caption;
    }
    return null;
  };

  private isFutureCuePoint(cue: CuePoint): boolean {
    if (cue.metadata && cue.metadata.createdAt) {
      const cuePointCreationTime = cue.metadata.createdAt * 1000;
      const currentTime = new Date().getTime();
      return cuePointCreationTime > currentTime - liveCuePointTimeThreshold;
    }
    return false;
  }

  private _onTimedMetadataAdded = ({payload}: TimedMetadataEvent) => {
    const isLive = this._player.isLive();
    const navigationData: ItemData[] = [];
    const captionData: ItemData[] = [];
    payload.cues.forEach((cue: CuePoint) => {
      if (this._getCuePointType(cue) === ItemTypes.Slide && this._itemsFilter[ItemTypes.Slide]) {
        const preparedCuePoint = prepareCuePoint(cue, ItemTypes.Slide, isLive);
        if (!isLive) {
          navigationData.push(preparedCuePoint);
        } else {
          if (this.isFutureCuePoint(cue)) {
            // if current playback hasn't reached this cuePoint yet, save it to the future cue points map and don't show it.
            // We will display it when the playback reach it on the TimedMetadataChange event (see _onTimedMetadataChange)
            this._liveFutureCuePointsMap.set(cue.id, preparedCuePoint);
          } else {
            navigationData.push(preparedCuePoint);
          }
        }
      }
      if (this._getCuePointType(cue) === ItemTypes.Chapter && this._itemsFilter[ItemTypes.Chapter]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.Chapter, isLive));
      }
      if (this._getCuePointType(cue) === ItemTypes.Hotspot && this._itemsFilter[ItemTypes.Hotspot]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.Hotspot, isLive));
      }
      if (this._getCuePointType(cue) === ItemTypes.AnswerOnAir && this._itemsFilter[ItemTypes.AnswerOnAir]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.AnswerOnAir, isLive));
      }
      if (this._getCuePointType(cue) === ItemTypes.Caption && this._itemsFilter[ItemTypes.Caption]) {
        captionData.push(prepareCuePoint(cue, ItemTypes.Caption, isLive));
      }
    });
    if (navigationData.length) {
      this._addNavigationData(navigationData);
    }
    if (captionData.length) {
      this._addCaptionData(captionData);
    }
  };

  private _onTimedMetadataChange = ({payload}: TimedMetadataEvent) => {
    const navigationCuePoints: Array<CuePoint> = payload.cues.filter((cue: CuePoint) => {
      const cuePointType = this._getCuePointType(cue);
      const filterTypePassed = cuePointType && this._itemsFilter[cuePointType];
      if (filterTypePassed && cuePointType === ItemTypes.Caption && !this._isSearchActive()) {
        return false;
      }
      return filterTypePassed;
    });
    this._activeCuePointsMap = new Map();
    if (navigationCuePoints.length) {
      if (this._player.isLive()) {
        const latestNavigationCuePoint = navigationCuePoints[navigationCuePoints.length - 1];
        const id = latestNavigationCuePoint.id;
        if (this._liveFutureCuePointsMap.has(id)) {
          // if this is a cuepoint that wasn't displayed yet - show it in the panel and remove it from future cue points map
          this._addNavigationData([this._liveFutureCuePointsMap.get(id)!]);
          this._liveFutureCuePointsMap.delete(id);
        }
        this._activeCuePointsMap.set(id, true);
        this._updateNavigationPlugin();
      } else {
        const latestNavigationCuePoint = navigationCuePoints[navigationCuePoints.length - 1];
        // define navigation item group
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

  private _handleCloseClick = () => {
    this.sidePanelsManager.deactivateItem(this._navigationPanel);
    this._pluginState = PluginStates.CLOSED;
  };

  private _createOrUpdatePlugin = () => {
    if (this._navigationPanel) {
      this._updateNavigationPlugin();
    } else {
      this._createNavigationPlugin();
    }
  };

  private _createNavigationPlugin = () => {
    if (this._navigationPanel) {
      return;
    }
    this._navigationPanel = this.sidePanelsManager.addItem({
      label: 'Navigation',
      panelComponent: () => {
        return (
          <Navigation
            ref={node => {
              this._navigationComponentRef = node;
            }}
            onClose={this._handleCloseClick}
            data={this._data}
            onItemClicked={this._seekTo}
            isLoading={this._isLoading}
            hasError={this._hasError}
            highlightedMap={this._activeCuePointsMap}
            kitchenSinkActive={!!this.sidePanelsManager.isItemActive(this._navigationPanel)}
            toggledWithEnter={this._triggeredByKeyboard}
            itemsOrder={this._itemsOrder}
          />
        );
      },
      iconComponent: ({isActive}: {isActive: boolean}) => {
        return (
          <PluginButton
            isActive={isActive}
            onClick={(e: OnClickEvent, byKeyboard?: boolean) => {
              if (this.sidePanelsManager.isItemActive(this._navigationPanel)) {
                this._triggeredByKeyboard = false;
                this._handleCloseClick();
              } else {
                this._triggeredByKeyboard = Boolean(byKeyboard);
                this.sidePanelsManager.activateItem(this._navigationPanel);
              }
            }}
          />
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
      this._player.ready().then(() => {
        this.sidePanelsManager.activateItem(this._navigationPanel);
      });
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
    if (this._itemsFilter[ItemTypes.Caption]) {
      this.eventManager.listen(this._player, this._player.Event.TEXT_TRACK_CHANGED, this._handleLanguageChange);
    }
  }

  private _seekTo = (time: number) => {
    this.player.currentTime = time;
  };

  private _shouldExpandOnFirstPlay = () => {
    return (this.config.expandOnFirstPlay && !this._pluginState) || this._pluginState === PluginStates.OPENED;
  };

  reset(): void {
    if (this._navigationPanel) {
      this.sidePanelsManager.removeItem(this._navigationPanel);
      this._navigationPanel = null;
      this._navigationComponentRef = null;
    }
    this._activeCuePointsMap = new Map();
    this._activeCaptionMapId = '';
    this._captionMap = new Map();
    this._navigationData = [];
    this._isLoading = false;
    this._hasError = false;
    this._triggeredByKeyboard = false;
    this.eventManager.removeAll();
  }

  destroy(): void {
    this._pluginState = null;
  }
}
