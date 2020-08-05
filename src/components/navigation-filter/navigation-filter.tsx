import {h, Component, Fragment} from 'preact';
import * as styles from './navigation-filter.scss';
import {itemTypes} from '../../utils';
import {
  IconsFactory,
  IconColors,
  BackgroundColors,
} from '../navigation/icons/IconsFactory';
const {Tooltip} = KalturaPlayer.ui.components.Tooltip;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

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

const AllText = withText('navigation.AnswerOnAir')((props: any) =>
  <h1>{props.AnswerOnAir}</h1>
)

export class NavigationFilter extends Component<FilterProps> {
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
    const tabs: TabData[] = availableTabs.map((tab: itemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
        label: `navigation.${tab}`,
      };
    });
    return tabs;
  };

  private _getResultLabel = (activeTab: itemTypes, totalResults: number) => {
    const defaultTranslate = `${totalResults} result${
      // @ts-ignore
      totalResults > 1 ? 's' : ''
    } in ${activeTab === itemTypes.All ? 'all content' : 'specific tab'}`;
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
              ? 'localized string ALL'
              : 'specific tab',
        }}
      />
    );
  };

  render({activeTab, totalResults}: FilterProps) {
    console.log('>>> all props', this.props);
    const tabs = this._getTabsData();
    return (
      <div className={styles.filterRoot}>
        <AllText />
        {totalResults !== 0 && tabs.length > 1 && (
          <div className={styles.tabsWrapper}>
            {tabs.map(tab => {
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
