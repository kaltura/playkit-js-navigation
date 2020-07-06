import { h, Component } from "preact";
import * as styles from "./navigation-filter.scss";
import { itemTypes } from "../../utils";
import { IconsFactory, IconColors } from "../navigation/icons/IconsFactory";

export interface FilterProps {
  onChange(value: itemTypes): void;
  activeTab: itemTypes;
  availableTabs: itemTypes[];
  resultsAmount: number | null;
}

export interface TabData {
  type: itemTypes;
  isActive: boolean;
}

interface FilterState {}

export class NavigationFilter extends Component<FilterProps, FilterState> {
  state: FilterState = {};

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

  private _getTabData = (): TabData[] => {
    const { availableTabs, activeTab } = this.props;
    const tabs = availableTabs.map((tab: itemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
      };
    });
    return tabs;
  };

  render() {
    const { resultsAmount } = this.props;
    return (
      <div className={styles.filterRoot}>
        {resultsAmount !== 0 && (
        <div className={styles.tabsWrapper}>
          {this._getTabData().map((tab) => {
            return this._renderTab(tab);
          })}
        </div>
        )}
        {!!resultsAmount &&
          <div className={styles.resultsAmount}>{`${resultsAmount} result${resultsAmount > 1 ? 's' : ''} in all content`}</div>
        }
      </div>
    );
  }
}
