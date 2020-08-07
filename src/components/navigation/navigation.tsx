import {h, Component} from 'preact';
import {KeyboardKeys} from '@playkit-js-contrib/ui';
import {
  getContribLogger,
  CuepointEngine,
  Cuepoint,
} from '@playkit-js-contrib/common';
import * as styles from './navigaton.scss';
import {NavigationList} from './navigation-list/NavigationList';
import {NavigationSearch} from '../navigation-search/navigation-search';
import {NavigationFilter} from '../navigation-filter';
import {Error} from '../error';
import {Loading} from '../loading';
import {
  itemTypes,
  getAvailableTabs,
  filterDataBySearchQuery,
  filterDataByActiveTab,
  addGroupData,
  itemTypesOrder,
} from '../../utils';
import {AutoscrollIcon} from './icons/AutoscrollIcon';
import {ItemData} from './navigation-item/NavigationItem';

export interface SearchFilter {
  searchQuery: string;
  activeTab: itemTypes;
  availableTabs: itemTypes[];
  totalResults: number;
}

export interface NavigationProps {
  data: Array<ItemData>;
  onItemClicked(time: number): void;
  onClose: () => void;
  retry: () => void;
  isLoading: boolean;
  hasError: boolean;
  currentTime: number;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;
  itemsOrder: typeof itemTypesOrder;
}

interface NavigationState {
  widgetWidth: number;
  searchFilter: SearchFilter;
  autoscroll: boolean;
  highlightedMap: Record<number, true>;
  convertedData: ItemData[];
}

const HEADER_HEIGHT = 94; // TODO: calculate Header height in runtime (only once);
const HEADER_HEIGHT_WITH_AMOUNT = 120;

const logger = getContribLogger({
  class: 'Navigation',
  module: 'navigation-plugin',
});

const initialSearchFilter = {
  searchQuery: '',
  activeTab: itemTypes.All,
  availableTabs: [
    itemTypes.All,
    itemTypes.Chapter,
    itemTypes.Slide,
    itemTypes.Hotspot,
    itemTypes.AnswerOnAir,
  ],
  totalResults: 0,
};

export class Navigation extends Component<NavigationProps, NavigationState> {
  private _widgetRootRef: HTMLElement | null = null;
  private _engine: CuepointEngine<Cuepoint> | null = null;
  private _preventScrollEvent: boolean = false;
  private _listElementRef: HTMLDivElement | null = null;

  private _log = (msg: string, method: string) => {
    logger.trace(msg, {
      method: method || 'Method not defined',
    });
  };

  constructor(props: NavigationProps) {
    super(props);
    this.state = {
      autoscroll: true,
      widgetWidth: 0,
      highlightedMap: {},
      searchFilter: {...initialSearchFilter},
      convertedData: [],
    };
  }

  componentDidMount(): void {
    this._log('Create navigation data', 'componentDidMount');
    this._prepareNavigationData(this.state.searchFilter);
  }

  componentDidUpdate(
    previousProps: Readonly<NavigationProps>,
    previousState: Readonly<NavigationState>
  ): void {
    this._setWidgetSize();
    if (previousProps.data !== this.props.data) {
      this._log('Prepare navigation data', 'componentDidUpdate');
      this._prepareNavigationData(this.state.searchFilter);
      return;
    }
    if (previousProps.currentTime !== this.props.currentTime) {
      this._syncVisibleData();
    }
  }

  componentWillUnmount(): void {
    this._log('Removing engine', 'componentWillUnmount');
    this._engine = null;
  }

  private _prepareNavigationData = (searchFilter: SearchFilter) => {
    const {searchQuery, activeTab} = searchFilter;
    const filteredBySearchQuery = filterDataBySearchQuery(
      this.props.data,
      searchQuery
    );
    const stateData: NavigationState = {
      ...this.state,
      convertedData: addGroupData(
        filterDataByActiveTab(filteredBySearchQuery, activeTab)
      ),
      searchFilter: this._prepareSearchFilter(
        filteredBySearchQuery,
        searchFilter
      ),
    };
    if (this.state.searchFilter.searchQuery !== searchQuery) {
      // Any search interaction should stop autoscroll
      stateData.autoscroll = false;
    }
    if (!searchQuery) {
      // if the user erases all the chars in the input field, the auto-scroll functionality will be kept
      stateData.autoscroll = true;
    }
    this._updateEngine(stateData);
  };

  private _prepareSearchFilter = (
    data: ItemData[],
    searchFilter: SearchFilter
  ): SearchFilter => {
    const availableTabs = getAvailableTabs(data, this.props.itemsOrder);
    return {
      ...searchFilter,
      availableTabs,
    };
  };

  private _updateEngine = (stateData: NavigationState) => {
    const {convertedData} = stateData;
    if (!convertedData || convertedData.length === 0) {
      this._engine = null;
      this.setState(stateData);
      return;
    }
    this._engine = new CuepointEngine<Cuepoint>(convertedData);
    this._syncVisibleData(stateData);
  };

  private _makeHighlightedMap = (cuepoints: any[]) => {
    const startTime = cuepoints[cuepoints.length - 1]?.startTime;
    const maxTime = startTime !== undefined ? startTime : -1;
    const filtered = cuepoints.filter(item => item.startTime === maxTime);
    const highlightedMap = filtered.reduce((acc, item) => {
      return {...acc, [item.id]: true};
    }, {});
    return highlightedMap;
  };

  private _syncVisibleData = (stateData: NavigationState = this.state) => {
    const {currentTime} = this.props;
    this.setState((state: NavigationState) => {
      const newState = {...state, ...stateData};
      if (!this._engine) {
        return {
          ...newState,
          highlightedMap: {},
        };
      }
      const itemsUpdate = this._engine.updateTime(currentTime);
      if (itemsUpdate.snapshot) {
        return {
          ...newState,
          highlightedMap: this._makeHighlightedMap(itemsUpdate.snapshot),
        };
      }
      if (!itemsUpdate.delta) {
        return newState;
      }
      const {show} = itemsUpdate.delta;
      if (show.length > 0) {
        return {highlightedMap: this._makeHighlightedMap(show)};
      }
      return newState;
    });
  };

  private _setWidgetSize = () => {
    if (this._widgetRootRef) {
      const {width} = this._widgetRootRef.getBoundingClientRect();
      if (this.state.widgetWidth !== width) {
        this.setState({
          widgetWidth: width,
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

  private _handleSearchFilterChange = (property: string) => (
    data: itemTypes | string | null
  ) => {
    const searchFilter: SearchFilter = {
      ...this.state.searchFilter,
      [property]: data,
    };
    this._prepareNavigationData(searchFilter);
  };

  private _renderHeader = () => {
    const {toggledWithEnter, kitchenSinkActive, hasError} = this.props;
    const {searchFilter, convertedData} = this.state;

    return (
      <div className={styles.header}>
        {!hasError && (
          <div
            class={[styles.searchWrapper, this._getHeaderStyles()].join(' ')}>
            <NavigationSearch
              onChange={this._handleSearchFilterChange('searchQuery')}
              searchQuery={searchFilter.searchQuery}
              toggledWithEnter={toggledWithEnter}
              kitchenSinkActive={kitchenSinkActive}
            />
          </div>
        )}
        {hasError && <p className={styles.pluginName}>Navigation</p>}
        <button
          className={styles.closeButton}
          tabIndex={1}
          onClick={this.props.onClose}
        />
        {!hasError && (
          <NavigationFilter
            onChange={this._handleSearchFilterChange('activeTab')}
            activeTab={searchFilter.activeTab}
            availableTabs={searchFilter.availableTabs}
            totalResults={
              searchFilter.searchQuery.length > 0 ? convertedData.length : null
            }
          />
        )}
      </div>
    );
  };

  private _handleSeek = (time: number) => {
    // we want to also autoscroll to the item
    this._preventScrollEvent = true;
    this.setState({autoscroll: true}, () => {
      this.props.onItemClicked(time);
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
    const {searchFilter, widgetWidth} = this.state;
    const {hasError, retry} = this.props;
    if (hasError) {
      return <Error onRetryLoad={retry} />;
    }
    return (
      <NavigationList
        widgetWidth={widgetWidth}
        autoScroll={this.state.autoscroll}
        onSeek={this._handleSeek}
        scroll={this._scroll}
        data={this.state.convertedData}
        highlightedMap={this.state.highlightedMap}
        showItemsIcons={searchFilter.activeTab === itemTypes.All}
      />
    );
  };

  private _renderLoading = () => {
    return <Loading />;
  };

  private _handleClose = (event: KeyboardEvent) => {
    if (event.keyCode === KeyboardKeys.Esc) {
      this.props.onClose();
    }
  };

  private _enableAutoScroll = (event: any) => {
    event.preventDefault();
    if (this.state.autoscroll) {
      return;
    }
    this._preventScrollEvent = true;
    this.setState({
      autoscroll: true,
    });
  };

  private _scroll = (selectedElementY: number) => {
    this._preventScrollEvent = true;
    if (this._listElementRef) {
      this._listElementRef.scrollTop =
        selectedElementY -
        (this.state.searchFilter.searchQuery
          ? HEADER_HEIGHT_WITH_AMOUNT
          : HEADER_HEIGHT);
    }
  };

  render(props: NavigationProps, state: NavigationState) {
    const {isLoading, kitchenSinkActive} = props;
    const {autoscroll, searchFilter} = state;
    return (
      <div
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
              {!autoscroll && !searchFilter.searchQuery && (
                <button
                  className={styles.skipButton}
                  onClick={this._enableAutoScroll}>
                  <AutoscrollIcon />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}
