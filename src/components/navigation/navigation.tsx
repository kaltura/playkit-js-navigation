import { h, Component } from "preact";
import { KeyboardKeys } from "@playkit-js-contrib/ui";
import { getContribLogger } from "@playkit-js-contrib/common";
import * as styles from "./navigaton.scss";
import { NavigationList } from "./navigation-list/NavigationList";
import { NavigationSearch } from "../navigation-search/navigation-search";
import { NavigationFilter } from "../navigation-filter";
import { itemTypes } from "../../utils";

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
    widgetWidth: 0,
    searchFilter: { ...initialSearchFilter }
  };

  componentDidUpdate(
    previousProps: Readonly<NavigationProps>,
    previousState: Readonly<NavigationState>
  ): void {
    this._setWidgetSize();
  }

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
      <NavigationList data={this.props.data} filter={this.state.searchFilter} />
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

  render(props: NavigationProps) {
    const { isLoading, kitchenSinkActive } = props;
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
          </div>
        </div>
      </div>
    );
  }
}
