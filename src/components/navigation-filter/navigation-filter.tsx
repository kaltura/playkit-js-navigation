import { h, Component } from "preact";
import * as styles from "./navigation-filter.scss";
import { itemTypes } from "../../utils"

export interface FilterProps {
  onChange(value: any): void;
  activeTab: itemTypes | null;
  availableTabs: Array<itemTypes|null>;
}

interface FilterState {}

export class NavigationFilter extends Component<FilterProps, FilterState> {
  state: FilterState = {};

  public _getIcon = (type: itemTypes): string => {
    switch (type) {
      case itemTypes.AnswerOnAir:
        return "aoa";
      case itemTypes.Chapter:
        return "chapter";
      case itemTypes.Hotspot:
        return "hotspot";
      case itemTypes.Slide:
        return "slide";
      default:
        return "";
    }
  };

  public _handleChange = (type: itemTypes | null) => {
    this.props.onChange(type);
  };

  public _renderTab = (tab: any) => {
    return (
      <button
        key={tab.type}
        className={[
          styles.tab,
          styles[this._getIcon(tab.type)],
          tab.isActive ? styles.active : "",
        ].join(" ")}
        onClick={() => this._handleChange(tab.type)}
      >
        {tab.type === null && "All"}
      </button>
    );
  };

  private _prepareTabs = (): any[] => {
    const { availableTabs, activeTab } = this.props;
    const tabs = availableTabs.map((tab: itemTypes | null) => {
      return {
        type: tab,
        isActive: activeTab === tab,
      }
    });
    tabs.unshift({
      type: null,
      isActive: activeTab === null,
    })
    return tabs;
  }

  render() {
    const {} = this.props;
    return (
      <div className={styles.filterRoot}>
        {this._prepareTabs().map((tab) => {
          return this._renderTab(tab);
        })}
      </div>
    );
  }
}
