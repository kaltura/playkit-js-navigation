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
  defaultTranslates: Record<string, string>;
}

export interface TabData {
  type: itemTypes;
  isActive: boolean;
  label: string;
  i18nLabel: string;
}

export class NavigationFilter extends Component<FilterProps> {
  static defaultProps = {
    defaultTranslates: {
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
            <Text id={'navigation.All'}>
              {this.props.defaultTranslates[itemTypes.All]}
            </Text>
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
                <Text id={tab.i18nLabel}>{tab.label}</Text>
              </span>
            )}
          </Fragment>
        )}
      </button>
    );
  };

  private _getTabsData = (): TabData[] => {
    const {availableTabs, activeTab, defaultTranslates} = this.props;
    const tabs: TabData[] = availableTabs.map((tab: itemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
        label: defaultTranslates[tab],
        i18nLabel: `navigation.${tab}`,
      };
    });
    return tabs;
  };

  private _getResultLabel = (
    activeTab: itemTypes,
    defaultTranslates: Record<string, string>,
    totalResults: number
  ) => {
    const defaultTranslate = `${totalResults} result${
      // @ts-ignore
      totalResults > 1 ? 's' : ''
    } in ${
      activeTab === itemTypes.All
        ? 'all content'
        : defaultTranslates[activeTab].toLowerCase()
    }`;
    return (
      // @ts-ignore
      <Text
        key={`result_${totalResults}`}
        id="navigation.result"
        plural={totalResults}
        fields={{
          count: totalResults,
          tabName:
            activeTab === itemTypes.All
              ? 'all content'
              : defaultTranslates[activeTab].toLowerCase(),
        }}>
        {defaultTranslate}
      </Text>
    );
  };

  render({activeTab, defaultTranslates, totalResults}: FilterProps) {
    const tabs = this._getTabsData();
    return (
      <div className={styles.filterRoot}>
        {totalResults !== 0 && tabs.length > 1 && (
          <div className={styles.tabsWrapper}>
            {tabs.map(tab => {
              return this._renderTab(tab);
            })}
          </div>
        )}
        {!!totalResults && (
          <div className={styles.totalResults}>
            {this._getResultLabel(activeTab, defaultTranslates, totalResults)}
          </div>
        )}
      </div>
    );
  }
}
