import { h, Component, Fragment } from "preact";
import * as styles from "./navigation-filter.scss";
import { itemTypes } from "../../utils";
import {
  IconsFactory,
  IconColors,
  BackgroundColors
} from "../navigation/icons/IconsFactory";
import { AnimationMarker } from "./animated-marker";
import { Props } from "../navigation/navigation-list/NavigationList";
const { Tooltip } = KalturaPlayer.ui.components.Tooltip;

export interface FilterProps {
  onChange(value: itemTypes): void;
  activeTab: itemTypes;
  availableTabs: itemTypes[];
  totalResults: number | null;
  translates: Record<string, string>;
  widgetWidth: number;
}

export interface TabData {
  type: itemTypes;
  isActive: boolean;
  label: string;
}

export class NavigationFilter extends Component<FilterProps> {
  static defaultProps = {
    translates: {
      [itemTypes.All]: "All",
      [itemTypes.AnswerOnAir]: "Answer On Air",
      [itemTypes.Chapter]: "Chapters",
      [itemTypes.Slide]: "Slides",
      [itemTypes.Hotspot]: "Hotspots"
    }
  };

  private _tabsContainer: null | HTMLDivElement = null;

  componentDidMount() {
    setTimeout(() => {
      // todo - find better way - consult Omri/Eran
      this.forceUpdate();
    }, 500);
  }

  shouldComponentUpdate(nextProps: Readonly<FilterProps>) {
    const { activeTab, availableTabs, totalResults } = this.props;
    if (
      activeTab !== nextProps.activeTab ||
      availableTabs !== nextProps.availableTabs ||
      totalResults !== nextProps.totalResults ||
      (nextProps.widgetWidth &&
        nextProps.widgetWidth !== this.props.widgetWidth)
    ) {
      return true;
    }
    return false;
  }

  public _handleChange = (type: itemTypes) => {
    this.props.onChange(type);
  };

  public _renderTab = (tab: {
    isActive: boolean;
    type: itemTypes;
    label: string;
  }) => {
    const style = {
      borderColor: IconColors[tab.type],
      backgroundColor: BackgroundColors[tab.type]
    };
    return (
      <button
        data-tab-name={tab.type}
        key={tab.type}
        tabIndex={1}
        className={[
          styles.tab,
          tab.isActive ? [styles.active, "active-filter-tab"].join(" ") : ""
        ].join(" ")}
        style={style}
        onClick={() => this._handleChange(tab.type)}
      >
        {tab.type === itemTypes.All ? (
          <span>{this.props.translates[itemTypes.All]}</span>
        ) : (
          <Fragment>
            <Tooltip label={tab.label}>
              <IconsFactory
                iconType={tab.type}
                color={tab.isActive ? null : "#cccccc"}
              />
            </Tooltip>
            {this.props.availableTabs.length < 4 && (
              <span className={styles.label}>{tab.label}</span>
            )}
          </Fragment>
        )}
      </button>
    );
  };

  private _getTabsData = (): TabData[] => {
    const { availableTabs, activeTab, translates } = this.props;
    const tabs: TabData[] = availableTabs.map((tab: itemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
        label: translates[tab]
      };
    });
    return tabs;
  };

  private _getAnimationMarkerData = () => {
    const tabs = this._getTabsData();

    if (!this._tabsContainer || !tabs.length) {
      return { width: 0, offset: 0, color: "" };
    }
    const currentTab = this._tabsContainer.querySelectorAll(
      `[data-tab-name='${this.props.activeTab}']`
    )[0] as HTMLElement;

    if (!currentTab || !tabs.length) {
      return { width: 0, offset: 0, color: "" };
    }

    return {
      width: currentTab.clientWidth,
      offset: currentTab.offsetLeft - 16,
      color: IconColors[this.props.activeTab]
    };
  };
  private _getResultLabel = (): string => {
    const { activeTab, translates, totalResults } = this.props;
    // TODO: add locale (i18n)
    // TODO: look how player translates plural and single
    // @ts-ignore
    return `${totalResults} result${totalResults > 1 ? "s" : ""} in ${
      activeTab === itemTypes.All
        ? "all content"
        : translates[activeTab].toLowerCase()
    }`;
  };
  render() {
    const { totalResults } = this.props;
    const tabs = this._getTabsData();
    const { width, color, offset } = this._getAnimationMarkerData();
    if (tabs.length < 2) {
      return null;
    }
    return (
      <div className={styles.filterRoot}>
        {totalResults !== 0 && (
          <Fragment>
            <div
              className={styles.tabsWrapper}
              ref={node => {
                this._tabsContainer = node;
              }}
            >
              {tabs.map(tab => {
                return this._renderTab(tab);
              })}
            </div>
            <AnimationMarker
              color={color}
              offset={offset}
              width={width}
            ></AnimationMarker>
          </Fragment>
        )}
        {!!totalResults && (
          <div className={styles.totalResults}>{this._getResultLabel()}</div>
        )}
      </div>
    );
  }
}
