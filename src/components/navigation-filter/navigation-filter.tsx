import {h, Component, Fragment} from 'preact';
import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import * as styles from './navigation-filter.scss';
import {ItemTypes, ItemTypesTranslates} from '../../types';
import {IconsFactory} from '../navigation/icons/IconsFactory';

const {Tooltip} = KalturaPlayer.ui.components;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

const translates = (props: FilterProps) => {
  const {activeTab, totalResults, listDataContainCaptions} = props;
  const resultDefaultTranslate = `result${totalResults && totalResults > 1 ? 's' : ''}`;
  const componentTranslates = {
    listType: <Text id="navigation.list_type">List</Text>
  };
  if (activeTab === ItemTypes.All) {
    if (listDataContainCaptions) {
      return {
        ...componentTranslates,
        searchResultsLabel: (
          <Text
            id="navigation.search_result_all_types_with_captions"
            fields={{
              totalResults
            }}
            plural={totalResults}>{`${totalResults} ${resultDefaultTranslate} in all content including captions`}</Text>
        )
      };
    }
    return {
      ...componentTranslates,
      searchResultsLabel: (
        <Text
          id="navigation.search_result_all_types"
          fields={{
            totalResults
          }}
          plural={totalResults}>{`${totalResults} ${resultDefaultTranslate} in all content`}</Text>
      )
    };
  }
  return {
    ...componentTranslates,
    searchResultsLabel: (
      <Text
        id="navigation.search_result_one_type"
        fields={{
          totalResults,
          type: props.itemTypesTranslates[activeTab]
        }}
        plural={totalResults}>{`${totalResults} ${resultDefaultTranslate} in ${props.itemTypesTranslates[activeTab]?.toLowerCase()}`}</Text>
    )
  };
};

export interface FilterProps {
  onChange(value: ItemTypes): void;
  activeTab: ItemTypes;
  availableTabs: ItemTypes[];
  totalResults: number | null;
  listDataContainCaptions: boolean;
  itemTypesTranslates: ItemTypesTranslates;
  searchResultsLabel?: string;
  listType?: string;
}

export interface TabData {
  type: ItemTypes;
  isActive: boolean;
  label: string;
}

@withText(translates)
export class NavigationFilter extends Component<FilterProps> {
  private _tabsRefMap: Map<number, HTMLButtonElement | null> = new Map();

  componentWillUnmount() {
    this._tabsRefMap = new Map();
  }

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
  private _getTabRef = (index: number) => {
    return this._tabsRefMap.get(index);
  };

  private _setTabRef = (index: number, ref: HTMLButtonElement | null) => {
    return this._tabsRefMap.set(index, ref);
  };

  private _handleUpKeyPressed = (currentIndex: number) => () => {
    this._getTabRef(currentIndex - 1)?.focus();
  };

  private _handleDownKeyPressed = (currentIndex: number) => () => {
    this._getTabRef(currentIndex + 1)?.focus();
  };

  public _renderTab = (tab: {isActive: boolean; type: ItemTypes; label: string}, index: number) => {
    return (
      <Tooltip label={tab.label}>
        <A11yWrapper
          onClick={() => this._handleChange(tab.type)}
          onDownKeyPressed={this._handleDownKeyPressed(index)}
          onUpKeyPressed={this._handleUpKeyPressed(index)}
          role="radio">
          <button
            aria-label={`${this.props.listType} ${tab.label}`}
            key={tab.type}
            tabIndex={0}
            type="checkbox"
            aria-checked={tab.isActive}
            className={[styles.tab, tab.isActive ? styles.active : ''].join(' ')}
            ref={node => {
              this._setTabRef(index, node);
            }}>
            {tab.type === ItemTypes.All ? (
              <span>{this.props.itemTypesTranslates[ItemTypes.All]}</span>
            ) : (
              <Fragment>
                <IconsFactory iconType={tab.type} />
                {this.props.availableTabs.length < 4 && <span className={styles.label}>{tab.label}</span>}
              </Fragment>
            )}
          </button>
        </A11yWrapper>
      </Tooltip>
    );
  };

  private _getTabsData = (): TabData[] => {
    const {availableTabs, activeTab} = this.props;
    const tabs: TabData[] = availableTabs.map((tab: ItemTypes) => {
      return {
        type: tab,
        isActive: activeTab === tab,
        label: this.props.itemTypesTranslates[tab]!
      };
    });
    return tabs;
  };

  private _renderSearchResult = () => {
    return (
      <div className={styles.totalResults} aria-label={this.props.searchResultsLabel}>
        {this.props.searchResultsLabel}
      </div>
    );
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
          <div className={styles.tabsWrapper} role="radiogroup">
            {tabs.map((tab, index) => {
              return this._renderTab(tab, index);
            })}
          </div>
        )}
        {!!totalResults && this._renderSearchResult()}
      </div>
    );
  }
}
