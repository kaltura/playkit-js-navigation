import {h, Component, Fragment} from 'preact';
import * as styles from './navigation-filter.scss';
import {itemTypes} from '../../utils';
import {
  IconsFactory,
  IconColors,
  BackgroundColors,
} from '../navigation/icons/IconsFactory';
const {Tooltip} = KalturaPlayer.ui.components.Tooltip;

export interface FilterProps {
  onChange(value: itemTypes): void;
  activeTab: itemTypes;
  availableTabs: itemTypes[];
  totalResults: number | null;
  translates: Record<string, string>;
}

export interface TabData {
  type: itemTypes;
  isActive: boolean;
  label: string;
}

export class NavigationFilter extends Component<FilterProps> {
  static defaultProps = {
    translates: {
      [itemTypes.All]: 'All',
      [itemTypes.AnswerOnAir]: 'Answer On Air',
      [itemTypes.Chapter]: 'Chapters',
      [itemTypes.Slide]: 'Slides',
      [itemTypes.Hotspot]: 'Hotspots',
    },
  };

  shouldComponentUpdate(nextProps: Readonly<FilterProps>) {
    const {activeTab, availableTabs, totalResults} = this.props;
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

  public _renderTab = (tab: {
    isActive: boolean;
    type: itemTypes;
    label: string;
  }) => {
    const style = {
      borderColor: IconColors[tab.type],
      backgroundColor: BackgroundColors[tab.type],
    };
    return (
      <button
        key={tab.type}
        tabIndex={1}
        className={[styles.tab, tab.isActive ? styles.active : ''].join(' ')}
        style={style}
        onClick={() => this._handleChange(tab.type)}>
        {tab.type === itemTypes.All ? (
          <span>{this.props.translates[itemTypes.All]}</span>
        ) : (
          <Fragment>
            <Tooltip label={tab.label}>
              <IconsFactory
                iconType={tab.type}
                color={tab.isActive ? null : '#cccccc'}
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
    const {availableTabs, activeTab, translates} = this.props;
    const tabs: TabData[] = availableTabs.map((tab: itemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
        label: translates[tab],
      };
    });
    return tabs;
  };

  private _getResultLabel = (): string => {
    const {activeTab, translates, totalResults} = this.props;
    // TODO: add locale (i18n)
    // TODO: look how player translates plural and single
    // @ts-ignore
    return `${totalResults} result${totalResults > 1 ? 's' : ''} in ${
      activeTab === itemTypes.All
        ? 'all content'
        : translates[activeTab].toLowerCase()
    }`;
  };

  render() {
    const {totalResults} = this.props;
    const tabs = this._getTabsData();
    if (tabs.length < 2) {
      return null;
    }
    return (
      <div className={styles.filterRoot}>
        {totalResults !== 0 && (
          <div className={styles.tabsWrapper}>
            {tabs.map(tab => {
              return this._renderTab(tab);
            })}
          </div>
        )}
        {!!totalResults && (
          <div className={styles.totalResults}>{this._getResultLabel()}</div>
        )}
      </div>
    );
  }
}
