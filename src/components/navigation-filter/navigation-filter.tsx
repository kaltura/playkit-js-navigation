import {h, Component, Fragment} from 'preact';
import * as styles from './navigation-filter.scss';
import {itemTypes} from '../../utils';
import {
  IconsFactory,
  IconColors,
  BackgroundColors,
} from '../navigation/icons/IconsFactory';
const {Tooltip} = KalturaPlayer.ui.components.Tooltip;
const {Text} = KalturaPlayer.ui.preacti18n;

export interface FilterProps {
  onChange(value: itemTypes): void;
  activeTab: itemTypes;
  availableTabs: itemTypes[];
  totalResults: number | null;
}

export interface TabData {
  type: itemTypes;
  isActive: boolean;
  label: string;
}

export class NavigationFilter extends Component<FilterProps> {
  shouldComponentUpdate(nextProps: Readonly<FilterProps>) {
    const {activeTab, availableTabs, totalResults} = this.props;
    return (
      activeTab !== nextProps.activeTab ||
      availableTabs !== nextProps.availableTabs ||
      totalResults !== nextProps.totalResults
    );
  }

  public _handleChange = (type: itemTypes) => {
    this.props.onChange(type);
  };

  public _renderTab = (tab: TabData) => {
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
          <span>
            <Text id={'navigation.All'} />
          </span>
        ) : (
          <Fragment>
            <Tooltip label={tab.label}>
              <IconsFactory
                iconType={tab.type}
                color={tab.isActive ? null : '#cccccc'}
              />
            </Tooltip>
            {this.props.availableTabs.length < 4 && (
              <span className={styles.label}>
                <Text id={tab.label} />
              </span>
            )}
          </Fragment>
        )}
      </button>
    );
  };

  private _getTabsData = (): TabData[] => {
    const {availableTabs, activeTab} = this.props;
    return availableTabs.map((tab: itemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
        label: `navigation.${tab}`,
      };
    });
  };

  private _getResultLabel = (activeTab: itemTypes, totalResults: number) => {
    return (
      <Text
        key={`result_${totalResults}`}
        id={`navigation.results.${activeTab}`}
        plural={totalResults}
        fields={{
          count: totalResults,
        }}
      />
    );
  };

  render({activeTab, totalResults}: FilterProps) {
    const tabs = this._getTabsData();
    return (
      <div className={styles.filterRoot}>
        {totalResults !== 0 && tabs.length > 1 && (
          <div className={styles.tabsWrapper}>
            {tabs.map((tab) => {
              return this._renderTab(tab);
            })}
          </div>
        )}
        {!!totalResults && (
          <div className={styles.totalResults}>
            {this._getResultLabel(activeTab, totalResults)}
          </div>
        )}
      </div>
    );
  }
}
