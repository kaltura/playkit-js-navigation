import { h, Component } from "preact";
import { KeyboardKeys } from "@playkit-js-contrib/ui";
import { getContribLogger, CuepointEngine } from "@playkit-js-contrib/common";
import * as styles from "./navigaton.scss";
import { NavigationList } from "./navigation-list/NavigationList";
import { NavigationSearch } from "../navigation-search/navigation-search";
import { NavigationFilter } from "../navigation-filter";
import { itemTypes } from "../../utils";
import { AutoscrollIcon } from "./icons/AutoscrollIcon";

export interface SearchFilter {
  searchQuery: string;
  activeTab: itemTypes;
  availableTabs: itemTypes[];
}

export interface NavigationProps {
  data: Array<any>;
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
}

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
  ]
};

export class Navigation extends Component<NavigationProps, NavigationState> {
  private _widgetRootRef: HTMLElement | null = null;
  private _engine: CuepointEngine<any> | null = null;
  private _keepHighlighted = false;

  private _getAvailableTabs = (): itemTypes[] => {
    const localData = this.props.data;
    const ret = localData.reduce((acc: [], item: any) => {
      // @ts-ignore
      if (item.itemType && acc.indexOf(item.itemType) === -1) {
        // @ts-ignore
        acc.push(item.itemType);
      }
      return acc;
    }, []);
    // @ts-ignore
    ret.unshift(itemTypes.All);
    return ret;
  };
  private _log = (msg: string, method: string) => {
    logger.trace(msg, {
      method: method || "Method not defined"
    });
  };
  filterData = {
    searchQuery: "",
    activeTab: itemTypes.All,
    availableTabs: this._getAvailableTabs()
  };
  state: NavigationState = {
    autoscroll: true,
    widgetWidth: 0,
    highlightedMap: {},
    searchFilter: { ...initialSearchFilter },
  };

  componentDidMount(): void {
    this._log("Creating engine", "componentDidMount");
    this._createEngine();
  }

  componentDidUpdate(
    previousProps: Readonly<NavigationProps>,
    previousState: Readonly<NavigationState>
  ): void {
    if (previousProps.data !== this.props.data) {
      this._log("Re-creating engine", "componentDidUpdate");
      this._createEngine();
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

  private _createEngine = () => {
    const { data } = this.props;
    if (!data || data.length === 0) {
        this._engine = null;
        return;
    }
    this._engine = new CuepointEngine<any>(data);
    this._syncVisibleData();
  };

  private _makeHighlightedMap = (cuepoints: any[]) => {
    const maxTime = cuepoints.reduce((acc, item) => {
      return ( acc > item.startTime ? acc : item.startTime );
    }, 0);
    const filtered = cuepoints.filter((item) => (item.startTime === maxTime))
    const highlightedMap = filtered.reduce((acc, item) => {
        return { ...acc, [item.id]: true };
    }, {});
    return highlightedMap;
  }

  private _syncVisibleData = (forceSnapshot = false) => {
    const { currentTime } = this.props;
    this.setState((state: NavigationState) => {
        if (!this._engine) {
            return {
                highlightedMap: {}
            };
        }
        const transcriptUpdate = this._engine.updateTime(currentTime, forceSnapshot);
        if (transcriptUpdate.snapshot) {
            this._keepHighlighted = false;
            return { highlightedMap: this._makeHighlightedMap(transcriptUpdate.snapshot) };
        }
        if (!transcriptUpdate.delta) {
            return state;
        }
        const { show, hide } = transcriptUpdate.delta;

        if (show.length === 0 && hide.length > 0) {
            this._keepHighlighted = true;
            return state;
        }

        if (show.length > 0) {
            if (this._keepHighlighted) {
                this._keepHighlighted = false;
            }
            return { highlightedMap: this._makeHighlightedMap(show) };
        }
        return state;
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
    this.setState((state: NavigationState) => {
      return {
        searchFilter: {
          ...state.searchFilter,
          availableTabs: this._getAvailableTabs(),
          [property]: data
        }
      };
    });
  };

  private _renderHeader = () => {
    const { toggledWithEnter, kitchenSinkActive } = this.props;
    const { searchFilter } = this.state;
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
        />
      </div>
    );
  };

  private _renderNavigation = () => {
    return (
      <NavigationList
        onWheel={() => this.setState({ autoscroll: false })}
        autoScroll={this.state.autoscroll}
        onSeek={n => {
          // we want to also autoscroll to the item
          this.setState({ autoscroll: true }, () => {
            this.props.onItemClicked(n);
          });
        }}
        filter={this.state.searchFilter}
        data={this.props.data}
        highlightedMap={this.state.highlightedMap}
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
