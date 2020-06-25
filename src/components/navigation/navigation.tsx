import { h, Component } from "preact";
import { KeyboardKeys } from "@playkit-js-contrib/ui";
import { getContribLogger } from "@playkit-js-contrib/common";
import * as styles from "./navigaton.scss";
import { NavigationList } from "./navigation-list/NavigationList";
import { NavigationSearch } from "../navigation-search/navigation-search-hook";
import { NavigationFilter } from "../navigation-filter";

export interface NavigationProps {
  data: Array<any>;
  onSeek(time: number): void;
  onClose: () => void;
  isLoading: boolean;
  hasError: boolean;
  currentTime: number;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;
}

interface NavigationState {
  widgetWidth: number;
}

const logger = getContribLogger({
  class: "Navigation",
  module: "navigation-plugin",
});

export class Navigation extends Component<NavigationProps, NavigationState> {
  private _widgetRootRef: HTMLElement | null = null;
  private _log = (msg: string, method: string) => {
    logger.trace(msg, {
      method: method || "Method not defined",
    });
  };
  state: NavigationState = {
    widgetWidth: 0,
  };

  componentDidUpdate(
    previousProps: Readonly<NavigationProps>,
    previousState: Readonly<NavigationState>
  ): void {
    this._setWidgetSize();
  }

  private _setWidgetSize = () => {
    if (this._widgetRootRef) {
      const {
        width,
        height,
        top,
      } = this._widgetRootRef.getBoundingClientRect();
      if (this.state.widgetWidth !== width) {
        this.setState({
          widgetWidth: width,
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

  private _renderHeader = () => {
    const { toggledWithEnter, kitchenSinkActive } = this.props;
    return (
      <div className={[styles.header, this._getHeaderStyles()].join(" ")}>
        <div className={styles.header}>
          <NavigationSearch
            onChange={val => console.log(val)}
            searchQuery=""
            toggledWithEnter={false}
            kitchenSinkActive={true}
          />
          <button
              className={styles.closeButton}
              tabIndex={1}
              onClick={this.props.onClose}
          />
          <NavigationFilter
            onChange={val => console.log(val)}
            activeTab={1}
          />
        </div>
      </div>
    );
  };

  private _renderNavigation = () => {
    return <NavigationList data={this.props.data} />;
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
    const { onClose, isLoading, kitchenSinkActive } = props;
    return (
      <div
        className={`${styles.root} ${kitchenSinkActive ? "" : styles.hidden}`}
        ref={(node) => {
          this._widgetRootRef = node;
        }}
        onKeyUp={this._handleClose}
      >
        <div className={styles.globalContainer}>
          {this._renderHeader()}
          <button
            className={styles.closeButton}
            tabIndex={1}
            onClick={onClose}
          />
          <div className={styles.body}>
            {isLoading ? this._renderLoading() : this._renderNavigation()}
          </div>
        </div>
      </div>
    );
  }
}
