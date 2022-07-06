import {h, Component, Fragment} from 'preact';
import * as styles from './navigation-filter.scss';
import {ItemTypes} from '../../types';
import {IconsFactory, IconColors, BackgroundColors} from '../navigation/icons/IconsFactory';
const {Tooltip} = KalturaPlayer.ui.components;

export interface FilterProps {
  onChange(value: ItemTypes): void;
  activeTab: ItemTypes;
  availableTabs: ItemTypes[];
  totalResults: number | null;
  translates: Record<string, string>;
  listDataContainCaptions: boolean;
}

export interface TabData {
  type: ItemTypes;
  isActive: boolean;
  label: string;
}

export class NavigationFilter extends Component<FilterProps> {
  static defaultProps = {
    translates: {
      [ItemTypes.All]: 'All',
      [ItemTypes.AnswerOnAir]: 'Answer On Air',
      [ItemTypes.Chapter]: 'Chapters',
      [ItemTypes.Slide]: 'Slides',
      [ItemTypes.Hotspot]: 'Hotspots',
      [ItemTypes.Caption]: 'Captions'
    }
  };

  shouldComponentUpdate(nextProps: Readonly<FilterProps>) {
    const {activeTab, availableTabs, totalResults} = this.props;
    if (activeTab !== nextProps.activeTab || availableTabs !== nextProps.availableTabs || totalResults !== nextProps.totalResults) {
      return true;
    }
    return false;
  }

  public _handleChange = (type: ItemTypes) => {
    this.props.onChange(type);
  };

  public _renderTab = (tab: {isActive: boolean; type: ItemTypes; label: string}) => {
    const style = {
      borderColor: IconColors[tab.type],
      backgroundColor: BackgroundColors[tab.type]
    };
    return (
      <Tooltip label={tab.label}>
        <button
          aria-label={tab.label}
          key={tab.type}
          tabIndex={0}
          className={[styles.tab, tab.isActive ? styles.active : ''].join(' ')}
          style={style}
          onClick={() => this._handleChange(tab.type)}
        >
          {tab.type === ItemTypes.All ? (
            <span>{this.props.translates[ItemTypes.All]}</span>
          ) : (
            <Fragment>
              <IconsFactory iconType={tab.type} color={tab.isActive ? null : '#cccccc'} />
              {this.props.availableTabs.length < 4 && <span className={styles.label}>{tab.label}</span>}
            </Fragment>
          )}
        </button>
      </Tooltip>
    );
  };

  private _getTabsData = (): TabData[] => {
    const {availableTabs, activeTab, translates} = this.props;
    const tabs: TabData[] = availableTabs.map((tab: ItemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
        label: translates[tab]
      };
    });
    return tabs;
  };

  private _getResultLabel = (): string => {
    const {activeTab, translates, totalResults, listDataContainCaptions} = this.props;
    // TODO: add locale (i18n)
    // TODO: look how player translates plural and single
    return `${totalResults} result${totalResults && totalResults > 1 ? 's' : ''} in ${
      activeTab === ItemTypes.All ? `all content${listDataContainCaptions ? ' including captions' : ''}` : translates[activeTab].toLowerCase()
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
        {!!totalResults && <div className={styles.totalResults}>{this._getResultLabel()}</div>}
      </div>
    );
  }
}
