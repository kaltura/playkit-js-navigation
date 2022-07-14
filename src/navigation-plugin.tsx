// @ts-ignore
import {core} from 'kaltura-player-js';
import {h} from 'preact';
import {
  itemTypesOrder,
  sortItems,
  filterDuplications,
  prepareCuePoint,
  prepareItemTypesOrder,
  isEmptyObject
} from './utils';
import {Navigation} from './components/navigation';
import {PluginButton} from './components/navigation/plugin-button';
import {OnClickEvent} from './components/a11y-wrapper';

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
  private _navigationData: Array<ItemData> = [];
  private _triggeredByKeyboard = false;
  private _isLoading = false;
  private _hasError = false;
  private _itemsOrder = itemTypesOrder;
  private _itemsFilter = itemTypesOrder;
  private _activeCuePointsMap: HighlightedMap = new Map();
  private _captionMap: Map<string, Array<ItemData>> = new Map();

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
  }

  get sidePanelsManager() {
    return this.player.getService('sidePanelsManager') as any;
  }

  get cuePointManager() {
    return this._player.getService('kalturaCuepoints') as any;
  }

  private get _data() {
    const captionMapId = this._getCaptionMapId(); // TODO: consider keep as class property
    const activeCaptions: Array<ItemData> = this._captionMap.get(captionMapId) || [];
    return sortItems([...this._navigationData, ...activeCaptions], this._itemsOrder);
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

    if (this.player.isLive()) {
      this._createNavigationPlugin();
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
    if (this._itemsFilter[ItemTypes.Caption]) {
      cuePointTypes.push(this.cuePointManager.CuepointType.CAPTION);
    }
    this.cuePointManager.registerTypes(cuePointTypes);
  };

  private _addNavigationData = (newData: ItemData[]) => {
    this._data = sortItems([...this._data, ...newData], this._itemsOrder);
    if (this._navigationPanel) {
      this._updateNavigationPlugin();
    } else {
      this._createNavigationPlugin();
    }
  };

  private _addCaptionData = (newData: ItemData[]) => {
    const captionMapId = this._getCaptionMapId();
    this._captionMap.set(captionMapId, newData);
    if (this._navigationPanel) {
      this._updateNavigationPlugin();
    } else {
      this._createNavigationPlugin();
    }
  };

  private _handleLanguageChange = () => {
    const captionMapId = this._getCaptionMapId();
    if (this._captionMap.has(captionMapId)) {
      this._updateNavigationPlugin();
    }
  };

  private _getCaptionMapId = (): string => {
    // @ts-ignore TODO
    const allTextTracks = this._player.getTracks(this._player.Track.TEXT) || [];
    // @ts-ignore TODO
    const activeTextTrack = allTextTracks.find(track => track.active);
    if (activeTextTrack) {
      const captionMapId = `${activeTextTrack.language}-${activeTextTrack.label}`;
      return captionMapId;
    }
    return '';
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

  private _onTimedMetadataAdded = ({payload}: TimedMetadataEvent) => {
    const isLive = this._player.isLive();
    const navigationData: ItemData[] = [];
    const captionData: ItemData[] = [];
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
      // TODO: for caption cues filter by current player language
      // TODO: add captions only of search active (capitons visible)
      return filterTypePassed;
    });
    this._activeCuePointsMap = new Map();
    if (navigationCuePoints.length) {
      if (this._player.isLive()) {
        const latestNavigationCuePoint = navigationCuePoints[navigationCuePoints.length - 1];
        this._activeCuePointsMap.set(latestNavigationCuePoint.id, true);
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

  private _createNavigationPlugin = () => {
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
                this._pluginState = PluginStates.CLOSED;
                this.sidePanelsManager.deactivateItem(this._navigationPanel);
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
      this.ready.then(() => {
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
    this._navigationPanel = null;
    this._activeCuePointsMap = new Map();
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
