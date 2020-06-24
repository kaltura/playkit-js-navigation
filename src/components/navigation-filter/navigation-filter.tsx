import { h, Component } from "preact";
import * as styles from "./navigation-filter.scss";

export interface FilterProps {
  onChange(value: number): void;
  activeTab: number;
}

interface FilterState {}

export class NavigationFilter extends Component<FilterProps, FilterState> {
  state: FilterState = {};

  public _getIcon = (type: number): string => {
    switch (type) {
      case 2:
        return "aoa";
      case 3:
        return "chapter";
      case 4:
        return "hotspot";
      case 5:
        return "slide";
      default:
        return "";
    }
  };

  public _handleChange = (type: number) => {
    this.props.onChange(type);
  };

  public _renderTab = (tab: any) => {
    return (
      <button
        className={[
          styles.tab,
          styles[this._getIcon(tab.type)],
          tab.isActive ? styles.active : "",
        ].join(" ")}
        onClick={() => this._handleChange(tab.type)}
      >
        {tab.type === 1 && "All"}
      </button>
    );
  };

  render() {
    const tabs = [
      {
        type: 1,
        isActive: this.props.activeTab === 1,
      },
      {
        type: 2,
        isActive: this.props.activeTab === 2,
      },
      {
        type: 3,
        isActive: this.props.activeTab === 3,
      },
      {
        type: 4,
        isActive: this.props.activeTab === 4,
      },
      {
        type: 5,
        isActive: this.props.activeTab === 5,
      },
    ];
    const {} = this.props;
    return (
      <div className={styles.filterRoot}>
        {tabs.map((tab) => {
          return this._renderTab(tab);
        })}
      </div>
    );
  }
}
