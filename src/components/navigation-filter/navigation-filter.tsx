import {h, Component, Fragment} from 'preact';
import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import * as styles from './navigation-filter.scss';
import {ItemTypes} from '../../types';
import {IconsFactory} from '../navigation/icons/IconsFactory';

const {Tooltip} = KalturaPlayer.ui.components;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

const translates = {
  [ItemTypes.All]: <Text id="navigation.all_types">All</Text>,
  [ItemTypes.AnswerOnAir]: <Text id="navigation.aoa_type">Answer On Air</Text>,
  [ItemTypes.Chapter]: <Text id="navigation.chapter_type">Chapters</Text>,
  [ItemTypes.Slide]: <Text id="navigation.slide_type">Slides</Text>,
  [ItemTypes.Hotspot]: <Text id="navigation.hotspot_type">Hotspots</Text>,
  [ItemTypes.Caption]: <Text id="navigation.caption_type">Captions</Text>
};

export interface FilterProps {
  onChange(value: ItemTypes): void;
  activeTab: ItemTypes;
  availableTabs: ItemTypes[];
  totalResults: number | null;
  listDataContainCaptions: boolean;
  [ItemTypes.All]?: string;
  [ItemTypes.AnswerOnAir]?: string;
  [ItemTypes.Chapter]?: string;
  [ItemTypes.Slide]?: string;
  [ItemTypes.Hotspot]?: string;
  [ItemTypes.Caption]?: string;
}

export interface TabData {
  type: ItemTypes;
  isActive: boolean;
  label?: string;
}

class NavigationFilterComponent extends Component<FilterProps> {
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

  public _renderTab = (tab: {isActive: boolean; type: ItemTypes; label?: string}, index: number) => {
    return (
      <Tooltip label={tab.label}>
        <A11yWrapper
          onClick={() => this._handleChange(tab.type)}
          onDownKeyPressed={this._handleDownKeyPressed(index)}
          onUpKeyPressed={this._handleUpKeyPressed(index)}
          role="radio">
          <button
            aria-label={`list ${tab.label}`}
            key={tab.type}
            tabIndex={0}
            type="checkbox"
            aria-checked={tab.isActive}
            className={[styles.tab, tab.isActive ? styles.active : ''].join(' ')}
            ref={node => {
              this._setTabRef(index, node);
            }}>
            {tab.type === ItemTypes.All ? (
              <span>{this.props[ItemTypes.All]}</span>
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
        label: this.props[tab]
      };
    });
    return tabs;
  };

  private _getResultLabel = () => {
    const {activeTab, totalResults, listDataContainCaptions} = this.props;
    const resultDefaultTranslate = `result${totalResults && totalResults > 1 ? 's' : ''}`;
    if (activeTab === ItemTypes.All) {
      if (listDataContainCaptions) {
        return (
          <Text
            id="navigation.search_result_all_types_with_captions"
            fields={{
              totalResults
            }}
            plural={totalResults}>{`${totalResults} ${resultDefaultTranslate} in all content including captions`}</Text>
        );
      }
      return (
        <Text
          id="navigation.search_result_all_types"
          fields={{
            totalResults
          }}
          plural={totalResults}>{`${totalResults} ${resultDefaultTranslate} in all content`}</Text>
      );
    }
    return (
      <Text
        id="navigation.search_result_one_type"
        fields={{
          totalResults,
          type: this.props[activeTab]
        }}
        plural={totalResults}>{`${totalResults} ${resultDefaultTranslate} in ${this.props[activeTab]?.toLowerCase()}`}</Text>
    );
  };

  private _renderSearchResult = () => {
    const searchResultsLabel = this._getResultLabel();
    return (
      <div className={styles.totalResults} aria-label={searchResultsLabel}>
        {searchResultsLabel}
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

export const NavigationFilter = withText(translates)(NavigationFilterComponent);
