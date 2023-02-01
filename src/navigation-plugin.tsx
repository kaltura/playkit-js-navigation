// @ts-ignore
import {core} from 'kaltura-player-js';
import {h} from 'preact';
import {UpperBarManager, SidePanelsManager} from '@playkit-js/ui-managers';
import {OnClickEvent} from '@playkit-js/common';
import {itemTypesOrder, sortItems, filterDuplications, prepareCuePoint, prepareItemTypesOrder, isEmptyObject, makeDisplayTime} from './utils';
import {Navigation} from './components/navigation';
import {PluginButton} from './components/navigation/plugin-button';
import {icons} from './components/icons';

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
  private _activeCuePointsMap: HighlightedMap;
  private _captionMap: Map<string, Array<ItemData>> = new Map();
  private _activeCaptionMapId: string = '';
  private _navigationComponentRef: Navigation | null = null;

  private _player: KalturaPlayerTypes.Player;
  private _navigationPanel = -1;
  private _navigationIcon = -1;
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
    this._activeCuePointsMap = this._makeDefaultActiveCuePointsMap();
    this._itemsOrder = prepareItemTypesOrder(this.config.itemsOrder);
    this._itemsFilter = isEmptyObject(this.config.itemsOrder) ? itemTypesOrder : config.itemsOrder;
  }

  get sidePanelsManager() {
    return this.player.getService('sidePanelsManager') as SidePanelsManager | undefined;
  }

  get upperBarManager() {
    return this.player.getService('upperBarManager') as UpperBarManager | undefined;
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

  private _makeDefaultActiveCuePointsMap = () => {
    return new Map([
      [ItemTypes.All, null],
      [ItemTypes.AnswerOnAir, null],
      [ItemTypes.Caption, null],
      [ItemTypes.Chapter, null],
      [ItemTypes.Hotspot, null],
      [ItemTypes.Slide, null]
    ]);
  };

  loadMedia(): void {
    if (!this.cuePointManager || !this.sidePanelsManager || !this.upperBarManager) {
      this.logger.warn("kalturaCuepoints, sidePanelsManager or upperBarManager haven't registered");
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
    this._activeCuePointsMap = this._makeDefaultActiveCuePointsMap();
    if (navigationCuePoints.length) {
      this._activeCuePointsMap.set(ItemTypes.All, makeDisplayTime(navigationCuePoints[navigationCuePoints.length - 1].startTime));
      navigationCuePoints.forEach(item => {
        if (this._player.isLive() && this._liveFutureCuePointsMap.has(item.id)) {
          this._addNavigationData([this._liveFutureCuePointsMap.get(item.id)!]);
          this._liveFutureCuePointsMap.delete(item.id);
        }
        this._activeCuePointsMap.set(this._getCuePointType(item)!, makeDisplayTime(item.startTime));
      });
    }
    this._updateNavigationPlugin();
  };

  private _createOrUpdatePlugin = () => {
    if (this._navigationPanel > 0) {
      this._updateNavigationPlugin();
    } else {
      this._createNavigationPlugin();
    }
  };

  private _createNavigationPlugin = () => {
    if (Math.max(this._navigationPanel, this._navigationIcon) > 0) {
      this.logger.warn('navigation plugin already initialized');
      return;
    }

    this._navigationPanel = this.sidePanelsManager!.add({
      label: 'Navigation',
      panelComponent: () => {
        return (
          <Navigation
            ref={node => {
              this._navigationComponentRef = node;
            }}
            onClose={this._deactivatePlugin}
            data={this._data}
            onItemClicked={this._seekTo}
            isLoading={this._isLoading}
            hasError={this._hasError}
            highlightedMap={this._activeCuePointsMap}
            kitchenSinkActive={this._isPluginActive()}
            toggledWithEnter={this._triggeredByKeyboard}
            itemsOrder={this._itemsOrder}
          />
        );
      },
      presets: [ReservedPresetNames.Playback, ReservedPresetNames.Live, ReservedPresetNames.Ads],
      position: this.config.position,
      expandMode: this.config.expandMode === SidePanelModes.ALONGSIDE ? SidePanelModes.ALONGSIDE : SidePanelModes.OVER,
      onDeactivate: this._deactivatePlugin
    }) as number;

    this._navigationIcon = this.upperBarManager!.add({
      label: 'Navigation',
      svgIcon: {path: icons.PLUGIN_ICON, viewBox: `0 0 ${icons.BigSize} ${icons.BigSize}`},
      onClick: this._handleClickOnPluginIcon as () => void,
      component: () => {
        return <PluginButton isActive={this._isPluginActive()} onClick={this._handleClickOnPluginIcon} />;
      }
    }) as number;

    if ((this.config.expandOnFirstPlay && !this._pluginState) || this._pluginState === PluginStates.OPENED) {
      this._activatePlugin();
    }
  };

  private _updateNavigationPlugin = () => {
    if (this._navigationPanel > 0) {
      this.sidePanelsManager!.update(this._navigationPanel);
    }
  };

  private _onPlaybackEnded = () => {
    this.eventManager.listenOnce(this._player, this._player.Event.PLAY, () => {
      // resetting active cues to remove highlight from the last cp
      this._activeCuePointsMap = new Map();
      this._updateNavigationPlugin();
      // need to trigger _onTimedMetadataChange in a case where there is an active cp at position 0
      const fakeEvent = {
        payload: {
          cues: this._player.cuePointManager.getActiveCuePoints()
        }
      };
      this._onTimedMetadataChange(fakeEvent);
    });
  };

  private _addPlayerListeners() {
    this.eventManager.listen(this._player, this._player.Event.TIMED_METADATA_CHANGE, this._onTimedMetadataChange);
    this.eventManager.listen(this._player, this._player.Event.TIMED_METADATA_ADDED, this._onTimedMetadataAdded);
    this.eventManager.listen(this._player, this._player.Event.RESIZE, this._updateNavigationPlugin);
    this.eventManager.listen(this._player, this._player.Event.PLAYBACK_ENDED, this._onPlaybackEnded);
    if (this._itemsFilter[ItemTypes.Caption]) {
      this.eventManager.listen(this._player, this._player.Event.TEXT_TRACK_CHANGED, this._handleLanguageChange);
    }
  }

  private _seekTo = (time: number) => {
    this.player.currentTime = time;
  };

  private _handleClickOnPluginIcon = (e: OnClickEvent, byKeyboard?: boolean) => {
    if (this._isPluginActive()) {
      this._triggeredByKeyboard = false;
      this._deactivatePlugin();
    } else {
      this._triggeredByKeyboard = Boolean(byKeyboard);
      this._activatePlugin();
    }
  };

  private _activatePlugin = () => {
    this.ready.then(() => {
      this.sidePanelsManager?.activateItem(this._navigationPanel);
      this._pluginState === PluginStates.OPENED;
      this.upperBarManager?.update(this._navigationIcon);
    });
  };

  private _deactivatePlugin = () => {
    this.ready.then(() => {
      this.sidePanelsManager?.deactivateItem(this._navigationPanel);
      this._pluginState = PluginStates.CLOSED;
      this.upperBarManager?.update(this._navigationIcon);
    });
  };

  private _isPluginActive = () => {
    return this.sidePanelsManager!.isItemActive(this._navigationPanel);
  };

  reset(): void {
    if (Math.max(this._navigationPanel, this._navigationIcon) > 0) {
      this.sidePanelsManager!.remove(this._navigationPanel);
      this.upperBarManager!.remove(this._navigationIcon);
      this._navigationPanel = -1;
      this._navigationIcon = -1;
      this._navigationComponentRef = null;
    }
    this._activeCuePointsMap = this._makeDefaultActiveCuePointsMap();
    this._activeCaptionMapId = '';
    this._captionMap = new Map();
    this._liveFutureCuePointsMap = new Map();
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
