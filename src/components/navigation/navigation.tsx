import { h, Component } from "preact";
import { KeyboardKeys } from "@playkit-js-contrib/ui";
import {
  getContribLogger,
  CuepointEngine,
  Cuepoint
} from "@playkit-js-contrib/common";
import * as styles from "./navigaton.scss";
import { NavigationList } from "./navigation-list/NavigationList";
import { NavigationSearch } from "../navigation-search/navigation-search";
import { NavigationFilter } from "../navigation-filter";
import {
  itemTypes,
  getAvailableTabs,
  filterDataBySearchQuery,
  filterDataByActiveTab
} from "../../utils";
import { AutoscrollIcon } from "./icons/AutoscrollIcon";
import { ItemData } from "./navigation-item/NavigationItem";

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
  isLoading: boolean;
  hasError: boolean;
  currentTime: number;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;
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
  class: "Navigation",
  module: "navigation-plugin"
});

const initialSearchFilter = {
  searchQuery: "",
  activeTab: itemTypes.All,
  availableTabs: [
    itemTypes.All,
    itemTypes.Chapter,
    itemTypes.Slide,
    itemTypes.Hotspot,
    itemTypes.AnswerOnAir
  ],
  totalResults: 0
};

export class Navigation extends Component<NavigationProps, NavigationState> {
  private _widgetRootRef: HTMLElement | null = null;
  private _engine: CuepointEngine<Cuepoint> | null = null;

  private _log = (msg: string, method: string) => {
    logger.trace(msg, {
      method: method || "Method not defined"
    });
  };

  constructor(props: NavigationProps) {
    super(props);
    this.state = {
      autoscroll: true,
      widgetWidth: 0,
      highlightedMap: {},
      searchFilter: { ...initialSearchFilter },
      convertedData: []
    };
  }

  componentDidMount(): void {
    this._log("Create navigation data", "componentDidMount");
    this._prepareNavigationData(this.state.searchFilter);
  }

  componentDidUpdate(
    previousProps: Readonly<NavigationProps>,
    previousState: Readonly<NavigationState>
  ): void {
    if (previousProps.data !== this.props.data) {
      this._log("Prepare navigation data", "componentDidUpdate");
      this._prepareNavigationData(this.state.searchFilter);
    }
    if (previousProps.currentTime !== this.props.currentTime) {
      this._syncVisibleData();
    }
    this._setWidgetSize();
  }

  componentWillUnmount(): void {
    this._log("Removing engine", "componentWillUnmount");
    this._engine = null;
  }

  private _prepareNavigationData = (searchFilter: SearchFilter) => {
    const { searchQuery, activeTab } = searchFilter;
    const filteredBySearchQuery = filterDataBySearchQuery(
      this.props.data,
      searchQuery
    );
    const stateData: NavigationState = {
      ...this.state,
      convertedData: filterDataByActiveTab(filteredBySearchQuery, activeTab),
      searchFilter: this._prepareSearchFilter(
        filteredBySearchQuery,
        searchFilter
      )
    };
    this._updateEngine(stateData);
  };

  private _prepareSearchFilter = (
    data: ItemData[],
    searchFilter: SearchFilter
  ): SearchFilter => {
    const availableTabs = getAvailableTabs(data);
    return {
      ...searchFilter,
      availableTabs
    };
  };

  private _updateEngine = (stateData: NavigationState) => {
    const { convertedData } = stateData;
    if (!convertedData || convertedData.length === 0) {
      this._engine = null;
      this.setState(stateData);
      return;
    }
    this._engine = new CuepointEngine<Cuepoint>(convertedData);
    this._syncVisibleData(stateData);
  };

  private _makeHighlightedMap = (cuepoints: any[]) => {
    const maxTime = cuepoints.reduce((acc, item) => {
      return acc > item.startTime ? acc : item.startTime;
    }, 0);
    const filtered = cuepoints.filter(item => item.startTime === maxTime);
    const highlightedMap = filtered.reduce((acc, item) => {
      return { ...acc, [item.id]: true };
    }, {});
    return highlightedMap;
  };

  private _syncVisibleData = (stateData: NavigationState = this.state) => {
    const { currentTime } = this.props;
    this.setState((state: NavigationState) => {
      const newState = { ...state, ...stateData };
      if (!this._engine) {
        return {
          ...newState,
          highlightedMap: {}
        };
      }
      const transcriptUpdate = this._engine.updateTime(currentTime);
      if (transcriptUpdate.snapshot) {
        return {
          ...newState,
          highlightedMap: this._makeHighlightedMap(transcriptUpdate.snapshot)
        };
      }
      if (!transcriptUpdate.delta) {
        return newState;
      }
      const { show } = transcriptUpdate.delta;
      if (show.length > 0) {
        return { highlightedMap: this._makeHighlightedMap(show) };
      }
      return newState;
    });
  };

  private _setWidgetSize = () => {
    if (this._widgetRootRef) {
      const { width } = this._widgetRootRef.getBoundingClientRect();
      if (this.state.widgetWidth !== width) {
        this.setState({
          widgetWidth: width
        });
      }
    }
  };

  private _getHeaderStyles = (): string => {
    const { widgetWidth } = this.state;
    if (widgetWidth >= 692) {
      return "";
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
      [property]: data
    };
    this._prepareNavigationData(searchFilter);
  };

  private _renderHeader = () => {
    const { toggledWithEnter, kitchenSinkActive } = this.props;
    const { searchFilter, convertedData } = this.state;
    return (
      <div className={styles.header}>
        <div class={[styles.searchWrapper, this._getHeaderStyles()].join(" ")}>
          <NavigationSearch
            onChange={this._handleSearchFilterChange("searchQuery")}
            searchQuery={searchFilter.searchQuery}
            toggledWithEnter={toggledWithEnter}
            kitchenSinkActive={kitchenSinkActive}
          />
        </div>
        <button
          className={styles.closeButton}
          tabIndex={1}
          onClick={this.props.onClose}
        />
        <NavigationFilter
          onChange={this._handleSearchFilterChange("activeTab")}
          activeTab={searchFilter.activeTab}
          availableTabs={searchFilter.availableTabs}
          totalResults={searchFilter.searchQuery.length > 0 ? convertedData.length : null}
        />
      </div>
    );
  };

  private _renderNavigation = () => {
    const { searchFilter, widgetWidth } = this.state;
    return (
      <NavigationList
        widgetWidth={widgetWidth}
        onWheel={() => this.setState({ autoscroll: false })}
        autoScroll={this.state.autoscroll}
        onSeek={n => {
          // we want to also autoscroll to the item
          this.setState({ autoscroll: true }, () => {
            this.props.onItemClicked(n);
          });
        }}
        data={this.state.convertedData}
        highlightedMap={this.state.highlightedMap}
        headerHeight={
          searchFilter.searchQuery ? HEADER_HEIGHT_WITH_AMOUNT : HEADER_HEIGHT
        }
      />
    );
  };

  private _renderLoading = () => {
    return (
      <div className={styles.loadingWrapper}>
        <h1>Spinner placeholder</h1>
      </div>
    );
  };

  private _handleClose = (event: KeyboardEvent) => {
    if (event.keyCode === KeyboardKeys.Esc) {
      this.props.onClose();
    }
  };

  render(props: NavigationProps, state: NavigationState) {
    const { isLoading, kitchenSinkActive } = props;
    const { autoscroll } = state;
    return (
      <div
        className={`${styles.root} ${kitchenSinkActive ? "" : styles.hidden}`}
        ref={node => {
          this._widgetRootRef = node;
        }}
        onKeyUp={this._handleClose}
      >
        <div className={styles.globalContainer}>
          {this._renderHeader()}
          <div className={styles.body}>
            {isLoading ? this._renderLoading() : this._renderNavigation()}
            {!autoscroll && (
              <button
                className={styles.skipButton}
                onClick={() => {
                  this.setState({ autoscroll: true });
                }}
              >
                <AutoscrollIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
