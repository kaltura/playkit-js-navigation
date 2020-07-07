import { h, Component } from "preact";
import * as styles from "./navigation-filter.scss";
import { itemTypes } from "../../utils";
import { IconsFactory, IconColors } from "../navigation/icons/IconsFactory";

export interface FilterProps {
  onChange(value: itemTypes): void;
  activeTab: itemTypes;
  availableTabs: itemTypes[];
  totalResults: number | null;
}

export interface TabData {
  type: itemTypes;
  isActive: boolean;
}

export class NavigationFilter extends Component<FilterProps> {

  shouldComponentUpdate(nextProps: Readonly<FilterProps>) {
    const { activeTab, availableTabs, totalResults } = this.props;
    if (
      activeTab !== nextProps.activeTab ||
      availableTabs !== nextProps.availableTabs ||
      totalResults !== nextProps.totalResults
    ) {
        return true;
    }
    return false;
  }

  public _handleChange = (type: itemTypes) => {
    this.props.onChange(type);
  };

  public _renderTab = (tab: { isActive: boolean; type: itemTypes }) => {
    return (
      <button
        key={tab.type}
        tabIndex={1}
        className={[styles.tab, tab.isActive ? styles.active : ""].join(" ")}
        style={{
          borderColor: IconColors[tab.type],
        }}
        onClick={() => this._handleChange(tab.type)}
      >
        {tab.type === itemTypes.All ? (
          <span>All</span>
        ) : (
          <IconsFactory
            iconType={tab.type}
            color={tab.isActive ? null : IconColors.All}
          />
        )}
      </button>
    );
  };

  private _getTabsData = (): TabData[] => {
    const { availableTabs, activeTab } = this.props;
    const tabs = availableTabs.map((tab: itemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
      };
    });
    return tabs;
  };

  private _getResultLabel = (totalResults: number): string => {
    // TODO: add locale (i18n)
    // TODO: look how player translates plural and single
    return `${totalResults} result${totalResults > 1 ? 's' : ''} in all content`
  }

  render() {
    const { totalResults } = this.props;
    return (
      <div className={styles.filterRoot}>
        {totalResults !== 0 && (
        <div className={styles.tabsWrapper}>
          {this._getTabsData().map((tab) => {
            return this._renderTab(tab);
          })}
        </div>
        )}
        {!!totalResults &&
          <div className={styles.totalResults}>{this._getResultLabel(totalResults)}</div>
        }
      </div>
    );
  }
}
