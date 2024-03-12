import {h, Component} from 'preact';
import {preacti18n, utils} from '@playkit-js/playkit-js-ui';
import * as styles from './navigaton.scss';
import {OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {NavigationList, Props} from './navigation-list/NavigationList';
import {NavigationSearch} from '../navigation-search/navigation-search';
import {FilterProps, NavigationFilter} from '../navigation-filter';
import {Error} from '../error';
import {Loading} from '../loading';
import {
  getAvailableTabs,
  filterDataBySearchQuery,
  filterDataByActiveTab,
  addGroupData,
  itemTypesOrder,
  findCuepointType,
  isMapsEqual,
  makeDisplayTime
} from '../../utils';
import {AutoscrollButton} from './autoscroll-button';
import {ItemTypes, ItemData, HighlightedMap, ItemTypesTranslates} from '../../types';
import {CloseButton} from '../close-button';
import {ScreenReaderContext, ScreenReaderProvider} from '@playkit-js/common/dist/hoc/sr-wrapper';
import { NavigationEvent } from "../../events";

const {KeyMap} = utils;
const {withText, Text} = preacti18n;

export interface SearchFilter {
  searchQuery: string;
  activeTab: ItemTypes;
  availableTabs: ItemTypes[];
  totalResults: number;
}

export interface NavigationProps {
  data: Array<ItemData>;
  onItemClicked(time: number, itemType: string): void;
  onClose: OnClick;
  retry?: () => void;
  isLoading: boolean;
  hasError: boolean;
  highlightedMap: HighlightedMap;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;
  itemsOrder: typeof itemTypesOrder;
  dispatcher: (name: string, payload?: any) => void;
}

interface NavigationState {
  widgetWidth: number;
  searchFilter: SearchFilter;
  autoscroll: boolean;
  convertedData: ItemData[];
  listDataContainCaptions: boolean;
  highlightedTime: string;
}

const HEADER_HEIGHT = 94; // TODO: calculate Header height in runtime (only once);
const HEADER_HEIGHT_WITH_AMOUNT = 120;

const initialSearchFilter = {
  searchQuery: '',
  activeTab: ItemTypes.All,
  availableTabs: [ItemTypes.All, ItemTypes.Chapter, ItemTypes.Slide, ItemTypes.Hotspot, ItemTypes.AnswerOnAir, ItemTypes.QuizQuestion],
  totalResults: 0
};

const getItemTypesTranslates = (props: any): ItemTypesTranslates => {
  return {
    [ItemTypes.All]: props[ItemTypes.All],
    [ItemTypes.AnswerOnAir]: props[ItemTypes.AnswerOnAir],
    [ItemTypes.Chapter]: props[ItemTypes.Chapter],
    [ItemTypes.Slide]: props[ItemTypes.Slide],
    [ItemTypes.Hotspot]: props[ItemTypes.Hotspot],
    [ItemTypes.Caption]: props[ItemTypes.Caption],
    [ItemTypes.QuizQuestion]: props[ItemTypes.QuizQuestion]
  };
};

const translates = (count: number) => {
  return {
    [ItemTypes.All]: <Text id="navigation.all_types">All</Text>,
    [ItemTypes.AnswerOnAir]: <Text id="navigation.aoa_type" plural={count}>{`${count === 1 ? 'Answer On Air' : 'Answers On Air'}`}</Text>,
    [ItemTypes.Chapter]: <Text id="navigation.chapter_type" plural={count}>{`${count === 1 ? 'Chapter' : 'Chapters'}`}</Text>,
    [ItemTypes.Slide]: <Text id="navigation.slide_type" plural={count}>{`${count === 1 ? 'Slide' : 'Slides'}`}</Text>,
    [ItemTypes.Hotspot]: <Text id="navigation.hotspot_type" plural={count}>{`${count === 1 ? 'Hotspot' : 'Hotspots'}`}</Text>,
    [ItemTypes.Caption]: <Text id="navigation.caption_type" plural={count}>{`${count === 1 ? 'Caption' : 'Captions'}`}</Text>,
    [ItemTypes.QuizQuestion]: <Text id="navigation.quiz_question_type" plural={count}>{`${count === 1 ? 'Question' : 'Questions'}`}</Text>
  };
};

@withText(translates(2))
class TranslatedNavigationFilter extends Component<Omit<FilterProps, 'itemTypesTranslates' | 'setTextToRead'>> {
  render() {
    const itemTypesTranslates = getItemTypesTranslates(this.props);
    return (
      <ScreenReaderContext.Consumer>
        {(setTextToRead: (textToRead: string, delay?: number | undefined) => void) => {
          return <NavigationFilter {...this.props} itemTypesTranslates={itemTypesTranslates} setTextToRead={setTextToRead} />;
        }}
      </ScreenReaderContext.Consumer>
    );
  }
}

@withText(translates(1))
class TranslatedNavigationList extends Component<Omit<Props, 'itemTypesTranslates'>> {
  render() {
    const itemTypesTranslates = getItemTypesTranslates(this.props);
    return <NavigationList {...this.props} itemTypesTranslates={itemTypesTranslates} />;
  }
}

export class Navigation extends Component<NavigationProps, NavigationState> {
  private _widgetRootRef: HTMLElement | null = null;
  private _preventScrollEvent = false;
  private _listElementRef: HTMLDivElement | null = null;

  static defaultProps?: {
    retry: () => {};
  };

  constructor(props: NavigationProps) {
    super(props);
    this.state = {
      autoscroll: true,
      widgetWidth: 0,
      searchFilter: {...initialSearchFilter},
      convertedData: [],
      listDataContainCaptions: false,
      highlightedTime: ''
    };
  }

  componentDidMount(): void {
    this._prepareNavigationData(this.state.searchFilter);
  }

  componentDidUpdate(previousProps: Readonly<NavigationProps>): void {
    this._setWidgetSize();
    if (previousProps.data !== this.props.data || !isMapsEqual(previousProps.highlightedMap, this.props.highlightedMap)) {
      this._prepareNavigationData(this.state.searchFilter);
      return;
    }
  }

  private _prepareNavigationData = (searchFilter: SearchFilter) => {
    const {highlightedMap} = this.props;
    const {searchQuery, activeTab, availableTabs} = searchFilter;
    const filteredBySearchQuery = filterDataBySearchQuery(this.props.data, searchQuery);
    const listDataContainCaptions = searchQuery
      ? findCuepointType(filteredBySearchQuery, ItemTypes.Caption)
      : findCuepointType(this.props.data, ItemTypes.Caption);
    const convertedData = addGroupData(filterDataByActiveTab(filteredBySearchQuery, activeTab));

    const highlightedTime =
      searchQuery && activeTab === ItemTypes.All ? Math.max(...availableTabs.map(tab => highlightedMap.get(tab)!)) : highlightedMap.get(activeTab)!;
    const stateData: NavigationState = {
      ...this.state,
      listDataContainCaptions,
      convertedData,
      searchFilter: this._prepareSearchFilter(filteredBySearchQuery, searchFilter),
      highlightedTime: highlightedTime >= 0 ? makeDisplayTime(highlightedTime) : ''
    };
    if (this.state.searchFilter.searchQuery !== searchQuery) {
      // Any search interaction should stop autoscroll
      stateData.autoscroll = false;
    }
    if (!searchQuery) {
      // if the user erases all the chars in the input field, the auto-scroll functionality will be kept
      stateData.autoscroll = true;
    }
    this.setState(stateData);
  };

  private _prepareSearchFilter = (data: ItemData[], searchFilter: SearchFilter): SearchFilter => {
    const availableTabs = getAvailableTabs(data, this.props.itemsOrder);
    return {
      ...searchFilter,
      availableTabs
    };
  };

  private _setWidgetSize = () => {
    if (this._widgetRootRef) {
      const {width} = this._widgetRootRef.getBoundingClientRect();
      if (this.state.widgetWidth !== width) {
        this.setState({
          widgetWidth: width
        });
      }
    }
  };

  private _getHeaderStyles = (): string => {
    const {widgetWidth} = this.state;
    if (widgetWidth >= 692) {
      return '';
    }
    if (widgetWidth >= 649) {
      return styles.mediumWidth;
    }
    return styles.smallWidth;
  };

  public handleSearchFilterChange = (property: string) => (data: ItemTypes | string | null) => {
    const searchFilter: SearchFilter = {
      ...this.state.searchFilter,
      [property]: data
    };
    this.props.dispatcher(NavigationEvent.NAVIGATION_SEARCH, searchFilter);
    this._prepareNavigationData(searchFilter);
  };

  private _renderHeader = () => {
    const {toggledWithEnter, kitchenSinkActive, hasError} = this.props;
    const {searchFilter, convertedData, listDataContainCaptions} = this.state;

    return (
      <div className={styles.header}>
        {!hasError && (
          <div class={[styles.searchWrapper, this._getHeaderStyles()].join(' ')}>
            <NavigationSearch
              onChange={this.handleSearchFilterChange('searchQuery')}
              searchQuery={searchFilter.searchQuery}
              toggledWithEnter={toggledWithEnter}
              kitchenSinkActive={kitchenSinkActive}
            />
          </div>
        )}
        {hasError && <p className={styles.pluginName}>Navigation</p>}
        <CloseButton onClick={this.props.onClose} />

        {!hasError && (
          <TranslatedNavigationFilter
            onChange={this.handleSearchFilterChange('activeTab')}
            activeTab={searchFilter.activeTab}
            availableTabs={searchFilter.availableTabs}
            totalResults={searchFilter.searchQuery.length > 0 ? convertedData.length : null}
            listDataContainCaptions={listDataContainCaptions}
          />
        )}
      </div>
    );
  };

  private _handleSeek = (time: number, itemType: string) => {
    // we want to also autoscroll to the item
    this._preventScrollEvent = true;
    this.setState({autoscroll: true}, () => {
      this.props.onItemClicked(time, itemType);
    });
  };

  private _handleScroll = () => {
    if (this._preventScrollEvent) {
      this._preventScrollEvent = false;
      return;
    }
    if (this.state.autoscroll) {
      this.setState({autoscroll: false});
    }
  };

  private _renderNavigation = () => {
    const {searchFilter, widgetWidth, listDataContainCaptions, convertedData, highlightedTime} = this.state;
    const {hasError, retry} = this.props;
    if (hasError) {
      return <Error onRetryLoad={retry} />;
    }
    return (
      <TranslatedNavigationList
        searchActive={searchFilter.searchQuery.length > 0}
        widgetWidth={widgetWidth}
        autoScroll={false} // TODO: temporary disable auto-scroll till https://kaltura.atlassian.net/browse/FEV-804 got a fix
        onSeek={this._handleSeek}
        onScroll={this._scrollTo}
        data={convertedData}
        dispatcher={this.props.dispatcher}
        highlightedTime={highlightedTime}
        showItemsIcons={searchFilter.activeTab === ItemTypes.All}
        listDataContainCaptions={listDataContainCaptions}
      />
    );
  };

  private _renderLoading = () => {
    return <Loading />;
  };

  private _handleClose = (event: KeyboardEvent) => {
    if (event.keyCode === KeyMap.ESC) {
      this.props.onClose(event, true);
    }
  };

  private _enableAutoScroll = () => {
    if (this.state.autoscroll) {
      return;
    }
    this._preventScrollEvent = true;
    this.setState({
      autoscroll: true
    });
  };

  private _scrollTo = (selectedElementY: number) => {
    this._preventScrollEvent = true;
    if (this._listElementRef) {
      this._listElementRef.scrollTop = selectedElementY - (this.state.searchFilter.searchQuery ? HEADER_HEIGHT_WITH_AMOUNT : HEADER_HEIGHT);
    }
  };

  private _renderAutoscrollButton = () => {
    const {hasError} = this.props;
    const {autoscroll, searchFilter, convertedData} = this.state;
    const autoScrollDisabled = !autoscroll || searchFilter.searchQuery || !convertedData.length || hasError;
    return <AutoscrollButton onClick={this._enableAutoScroll} isAutoScrollEnabled={!autoScrollDisabled} />;
  };

  render(props: NavigationProps) {
    const {isLoading, kitchenSinkActive} = props;
    return (
      <ScreenReaderProvider>
        <div
          data-testid="navigation_root"
          className={`${styles.root} ${kitchenSinkActive ? '' : styles.hidden}`}
          ref={node => {
            this._widgetRootRef = node;
          }}
          onKeyUp={this._handleClose}>
          {isLoading ? (
            this._renderLoading()
          ) : (
            <div className={styles.globalContainer}>
              {this._renderHeader()}
              <div
                className={styles.body}
                onScroll={this._handleScroll}
                ref={node => {
                  this._listElementRef = node;
                }}>
                {this._renderNavigation()}
                {/* {this._renderAutoscrollButton()} // TODO: temporary disable auto-scroll till https://kaltura.atlassian.net/browse/FEV-804 got a fix */}
              </div>
            </div>
          )}
        </div>
      </ScreenReaderProvider>
    );
  }
}
