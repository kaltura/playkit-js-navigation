import {core, ui} from '@playkit-js/kaltura-player-js';
import {h} from 'preact';
import * as sanitizeHtml from 'sanitize-html';
import {UpperBarManager, SidePanelsManager} from '@playkit-js/ui-managers';
import {OnClickEvent} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {
  itemTypesOrder,
  sortItems,
  filterDuplications,
  prepareCuePoint,
  prepareItemTypesOrder,
  isEmptyObject,
  getLastItem,
  decodeString
} from './utils';
import {Navigation} from './components/navigation';
import {PluginButton} from './components/navigation/plugin-button';
import {icons} from './components/icons';
import {NavigationConfig, PluginStates, ItemTypes, ItemData, CuePoint, HighlightedMap, CuePointsMap} from './types';
import {QuizTitle} from './components/navigation/navigation-item/QuizTitle';
import {NavigationEvent} from './events/events';

export const pluginName: string = 'navigation';

const {TimedMetadata} = core;
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
  private _quizQuestionData: ItemData[] = [];
  private _pluginButtonRef: HTMLButtonElement | null = null;
  private _navigationPluginRef: Navigation | null = null;

  private _player: KalturaPlayerTypes.Player;
  private _navigationPanel = -1;
  private _navigationIcon = -1;
  private _pluginState: PluginStates | null = null;
  private _liveFutureCuePointsMap: CuePointsMap = new Map(); // map holding future cuepoints that were not reached yet

  static defaultConfig: NavigationConfig = {
    position: SidePanelPositions.RIGHT,
    expandMode: SidePanelModes.ALONGSIDE,
    expandOnFirstPlay: false,
    itemsOrder: {},
    visible: true
  };

  constructor(name: string, player: KalturaPlayerTypes.Player, config: NavigationConfig) {
    super(name, player, config);
    this._player = player;
    this._activeCuePointsMap = this._getDefaultActiveCuePointsMap();
    this._itemsOrder = prepareItemTypesOrder(this.config.itemsOrder);
    this._itemsFilter = isEmptyObject(this.config.itemsOrder) ? itemTypesOrder : config.itemsOrder;
    this._player.registerService('navigation', this);
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

  get timelineManager() {
    return this._player.getService('timeline') as any;
  }

  private get _data() {
    const activeCaptions: Array<ItemData> = this._captionMap.get(this._activeCaptionMapId) || [];
    return sortItems([...this._navigationData, ...activeCaptions, ...this._quizQuestionData], this._itemsOrder);
  }

  private set _data(data: Array<ItemData>) {
    this._navigationData = filterDuplications(data);
  }

  private _getDefaultActiveCuePointsMap = () => {
    return new Map([
      [ItemTypes.All, -1],
      [ItemTypes.AnswerOnAir, -1],
      [ItemTypes.Caption, -1],
      [ItemTypes.Chapter, -1],
      [ItemTypes.Hotspot, -1],
      [ItemTypes.Slide, -1],
      [ItemTypes.QuizQuestion, -1]
    ]);
  };

  loadMedia(): void {
    if (!this.cuePointManager || !this.sidePanelsManager || !this.upperBarManager) {
      this.logger.warn("kalturaCuepoints, sidePanelsManager or upperBarManager haven't registered");
      return;
    }
    if (!this.config.visible) {
      this.logger.warn('visible configuration is false - not rendering the plugin.');
    }
    this._addPlayerListeners();
    this._registerCuePointTypes();
  }

  isVisible(): boolean {
    return this.config.visible;
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
    if (this._itemsFilter[ItemTypes.QuizQuestion]) {
      cuePointTypes.push(this.cuePointManager.CuepointType.QUIZ);
    }
    this.cuePointManager.registerTypes(cuePointTypes);
  };

  private _addNavigationData = (newData: ItemData[]) => {
    this._data = sortItems([...this._navigationData, ...newData], this._itemsOrder);
    this._createOrUpdatePlugin();
  };

  private _sanitizeCaptions = (data: ItemData[]) => {
    return data.map(itemData => ({
      ...itemData,
      displayTitle: sanitizeHtml(typeof itemData.displayTitle === 'string' ? itemData.displayTitle : '', {allowedTags: []})
    }));
  };

  private _addCaptionData = (newData: ItemData[]) => {
    this._activeCaptionMapId = this._getCaptionMapId();
    this._captionMap.set(this._activeCaptionMapId, this._sanitizeCaptions(newData));
    this._createOrUpdatePlugin();
  };

  private _addQuizData = (newData: ItemData[]) => {
    this._quizQuestionData = newData;
    this._createOrUpdatePlugin();
  };

  private _handleQuizQuestionChanged = (event: any) => {
    const qqa = event.payload.qqa;
    const quizQuestions = qqa.map(
      (quizQuestion: {id: string; index: number; type: number; question: string; startTime: number; state: number; onClick: () => void}) => {
        const cue: CuePoint = {
          id: quizQuestion.id,
          metadata: {
            cuePointType: ItemTypes.QuizQuestion
          },
          startTime: quizQuestion.startTime,
          type: ItemTypes.QuizQuestion
        };
        const itemData = prepareCuePoint(cue, ItemTypes.QuizQuestion, false);
        itemData.quizState = quizQuestion.state;
        itemData.displayTitle = this._makeQuizTitle(quizQuestion.state, quizQuestion.index, quizQuestion.type);
        itemData.displayDescription = decodeString(quizQuestion.question);
        itemData.ariaLabel = this._makeQuizTitleAriaLabel(quizQuestion.state, quizQuestion.index, quizQuestion.type, quizQuestion.question);
        itemData.onClick = quizQuestion.onClick;
        return itemData;
      }
    );
    this._addQuizData(quizQuestions);
  };

  private _makeQuizTitle = (state: number, index: number, type: number) => {
    return <QuizTitle questionState={state} questionIndex={index} questionType={type} />;
  };
  private _makeQuizTitleAriaLabel = (state: number, index: number, type: number, question: string): string => {
    const currentIndex = index + 1;

    let label = '';
    if (type === 3) {
      label = `Reflection point ${currentIndex}`;
    } else {
      label = `Question ${currentIndex}`;
    }
    if (state === 2) {
      label += ' - Answered';
    } else if (state === 3) {
      label += ' - Incorrect';
    } else if (state === 4) {
      label += ' - Correct';
    }
    if (question) {
      label += `: ${decodeString(question)}`;
    }
    return label;
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
    if (metadata?.cuePointType === KalturaCuePointType.QUIZ_QUESTION) {
      return ItemTypes.QuizQuestion;
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
        const preparedCuePoint: ItemData = prepareCuePoint(cue, ItemTypes.Chapter, isLive);
        navigationData.push(preparedCuePoint);
        this.timelineManager?.addKalturaCuePoint(cue.startTime, ItemTypes.Chapter, preparedCuePoint.id, preparedCuePoint.displayTitle, {
          onClick: this._handleTimelinePreviewClick
        });
      }
      if (this._getCuePointType(cue) === ItemTypes.Hotspot && this._itemsFilter[ItemTypes.Hotspot]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.Hotspot, isLive));
        const title = cue.metadata?.title || cue.metadata?.text || cue.text || '';
        this.timelineManager?.addKalturaCuePoint(cue.startTime, ItemTypes.Hotspot, cue.id, title, {
          onClick: this._handleTimelinePreviewClick
        });
      }
      if (this._getCuePointType(cue) === ItemTypes.AnswerOnAir && this._itemsFilter[ItemTypes.AnswerOnAir]) {
        navigationData.push(prepareCuePoint(cue, ItemTypes.AnswerOnAir, isLive));
        this.timelineManager?.addKalturaCuePoint(cue.startTime, ItemTypes.AnswerOnAir, cue.id, undefined, {
          onClick: this._handleTimelinePreviewClick
        });
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
      return cuePointType && this._itemsFilter[cuePointType];
    });
    if (this._player.currentTime < Math.max(...Array.from(this._activeCuePointsMap.values()))) {
      // seek back happened, reset startTime for each tab
      this._activeCuePointsMap = this._getDefaultActiveCuePointsMap();
    }
    if (navigationCuePoints.length) {
      const activeCueForAllTab = getLastItem(navigationCuePoints.filter(cue => this._getCuePointType(cue) !== ItemTypes.Caption));
      if (activeCueForAllTab && activeCueForAllTab.startTime > this._activeCuePointsMap.get(ItemTypes.All)!) {
        // update activeCue startTime for All tab
        this._activeCuePointsMap.set(ItemTypes.All, activeCueForAllTab.startTime);
      }
      navigationCuePoints.forEach(item => {
        if (this._player.isLive() && this._liveFutureCuePointsMap.has(item.id)) {
          // add posponed cues into navigation data
          this._addNavigationData([this._liveFutureCuePointsMap.get(item.id)!]);
          this._liveFutureCuePointsMap.delete(item.id);
        }
        // update activeCue startTime for each type of cues
        this._activeCuePointsMap.set(this._getCuePointType(item)!, item.startTime);
      });
    }
    this._updateNavigationPlugin();
  };

  private _createOrUpdatePlugin = () => {
    if (!this.config.visible) return;
    if (this._navigationPanel > 0) {
      this._updateNavigationPlugin();
    } else {
      this._createNavigationPlugin();
    }
  };

  private _handleClose = (e: OnClickEvent, byKeyboard: boolean) => {
    if (byKeyboard) {
      this._pluginButtonRef?.focus();
    }
    this._deactivatePlugin();
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
            onClose={this._handleClose}
            data={this._data}
            onItemClicked={this._seekTo}
            isLoading={this._isLoading}
            hasError={this._hasError}
            highlightedMap={this._activeCuePointsMap}
            kitchenSinkActive={this.isPluginActive()}
            toggledWithEnter={this._triggeredByKeyboard}
            itemsOrder={this._itemsOrder}
            ref={node => (this._navigationPluginRef = node)}
            dispatcher={(eventType, payload) => this.dispatchEvent(eventType, payload)}
          />
        ) as any;
      },
      presets: [ReservedPresetNames.Playback, ReservedPresetNames.Live, ReservedPresetNames.Ads],
      position: this.config.position,
      expandMode: this.config.expandMode === SidePanelModes.ALONGSIDE ? SidePanelModes.ALONGSIDE : SidePanelModes.OVER
    }) as number;

    this._navigationIcon = this.upperBarManager!.add({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ariaLabel: 'Navigation',
      displayName: 'Navigation',
      order: 10,
      svgIcon: {path: icons.PLUGIN_ICON, viewBox: `0 0 ${icons.BigSize} ${icons.BigSize}`},
      onClick: this._handleClickOnPluginIcon as () => void,
      component: () => {
        return (<PluginButton isActive={this.isPluginActive()} setRef={this._setPluginButtonRef} />) as any;
      }
    }) as number;

    if ((this.config.expandOnFirstPlay && !this._pluginState) || this._pluginState === PluginStates.OPENED) {
      this._activatePlugin(true);
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
      this._triggerOnTimedMetadataChange();
    });
  };

  private _triggerOnTimedMetadataChange = () => {
    const fakeEvent = {
      payload: {
        cues: this._player.cuePointManager.getActiveCuePoints()
      }
    };
    this._onTimedMetadataChange(fakeEvent);
  };

  private _addPlayerListeners() {
    this.eventManager.listen(this._player, this._player.Event.TIMED_METADATA_CHANGE, this._onTimedMetadataChange);
    this.eventManager.listen(this._player, this._player.Event.TIMED_METADATA_ADDED, this._onTimedMetadataAdded);
    this.eventManager.listen(this._player, this._player.Event.RESIZE, this._updateNavigationPlugin);
    this.eventManager.listen(this._player, this._player.Event.PLAYBACK_ENDED, this._onPlaybackEnded);
    this.eventManager.listen(this._player, 'QuizQuestionChanged', this._handleQuizQuestionChanged);
    if (this._itemsFilter[ItemTypes.Caption]) {
      this.eventManager.listen(this._player, this._player.Event.TEXT_TRACK_CHANGED, this._handleLanguageChange);
    }
  }

  private _handleTimelinePreviewClick = (payload: any) => {
    const {e, byKeyboard, cuePoint} = payload;
    if (!this.isVisible()) {
      return;
    }
    if (!this.isPluginActive()) {
      this._handleClickOnPluginIcon(e, byKeyboard);
    }
    this._navigationPluginRef?.handleSearchFilterChange('activeTab')(cuePoint?.type || ItemTypes.All);
  };

  private _seekTo = (time: number, itemType: string) => {
    if (this.player.isLive() && !this.player.isDvr()) {
      return; // prevent seek for live entry without DVR
    }
    this.player.currentTime = time;
    // need to trigger _onTimedMetadataChange in a case where the highlightedMap wasn't updated
    this._triggerOnTimedMetadataChange();
    this.dispatchEvent(NavigationEvent.NAVIGATION_ITEM_CLICK, {seekTo: time, itemType: itemType});
  };

  private _handleClickOnPluginIcon = (e: OnClickEvent, byKeyboard?: boolean) => {
    if (this.isPluginActive()) {
      this._triggeredByKeyboard = false;
      this._deactivatePlugin();
    } else {
      this._triggeredByKeyboard = Boolean(byKeyboard);
      this._activatePlugin();
    }
  };

  private _activatePlugin = (isFirstOpen = false) => {
    this.ready.then(() => {
      this.sidePanelsManager?.activateItem(this._navigationPanel);
      this._pluginState === PluginStates.OPENED;
      this.upperBarManager?.update(this._navigationIcon);
      this.dispatchEvent(NavigationEvent.NAVIGATION_OPEN, {auto: isFirstOpen});
    });
  };

  private _deactivatePlugin = () => {
    this.ready.then(() => {
      this.sidePanelsManager?.deactivateItem(this._navigationPanel);
      this._pluginState = PluginStates.CLOSED;
      this.upperBarManager?.update(this._navigationIcon);
      this.dispatchEvent(NavigationEvent.NAVIGATION_CLOSE);
    });
  };

  private _setPluginButtonRef = (ref: HTMLButtonElement) => {
    this._pluginButtonRef = ref;
  };

  isPluginActive(): boolean {
    return this.sidePanelsManager!.isItemActive(this._navigationPanel);
  }

  reset(): void {
    if (Math.max(this._navigationPanel, this._navigationIcon) > 0) {
      this.sidePanelsManager!.remove(this._navigationPanel);
      this.upperBarManager!.remove(this._navigationIcon);
      this._navigationPanel = -1;
      this._navigationIcon = -1;
      this._pluginButtonRef = null;
      this._navigationPluginRef = null;
    }
    this._activeCuePointsMap = this._getDefaultActiveCuePointsMap();
    this._activeCaptionMapId = '';
    this._captionMap = new Map();
    this._liveFutureCuePointsMap = new Map();
    this._navigationData = [];
    this._quizQuestionData = [];
    this._isLoading = false;
    this._hasError = false;
    this._triggeredByKeyboard = false;
    this.eventManager.removeAll();
  }

  destroy(): void {
    this._pluginState = null;
  }
}
