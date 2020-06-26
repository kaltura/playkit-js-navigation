import { h, Component } from "preact";
import * as styles from "./navigation-filter.scss";
import { itemTypes } from "../../utils";
import { IconsFactory, IconColors } from "../navigation/icons/IconsFactory";

export interface FilterProps {
  onChange(value: any): void;
  activeTab: itemTypes;
  availableTabs: itemTypes[];
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

  private _getTabData = (): any[] => {
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
    const {} = this.props;
    return (
      <div className={styles.filterRoot}>
        {this._getTabData().map((tab) => {
          return this._renderTab(tab);
        })}
      </div>
    );
  }
}
