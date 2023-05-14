import {Component, h} from 'preact';
import {ui} from 'kaltura-player-js';
import * as styles from './NavigationList.scss';
import {NavigationItem} from '../navigation-item/NavigationItem';
import {EmptyList} from '../icons/EmptyList';
import {EmptyState} from '../icons/EmptyState';
import {isDataEqual} from '../../../utils';
import {ItemData, ItemTypesTranslates} from '../../../types';

const {withText, Text} = ui.preacti18n;

const translates = {
  readLess: <Text id="navigation.read_less">Less</Text>,
  readMore: <Text id="navigation.read_more">More</Text>,
  readMoreLabel: <Text id="navigation.read_more_of">Read more of</Text>,
  readLessLabel: <Text id="navigation.read_less_of">Read less of</Text>
};

export interface Props {
  data: Array<ItemData>;
  onSeek: (n: number) => void;
  autoScroll: boolean;
  onScroll: (n: number) => void;
  widgetWidth: number;
  highlightedTime: string;
  showItemsIcons: boolean;
  listDataContainCaptions: boolean;
  searchActive: boolean;
  itemTypesTranslates: ItemTypesTranslates;
  readLess?: string;
  readMore?: string;
  readMoreLabel?: string;
  readLessLabel?: string;
}

@withText(translates)
export class NavigationList extends Component<Props> {
  private _selectedElementY = 0;
  private _itemsRefMap: Map<number, NavigationItem | null> = new Map();

  componentWillUnmount() {
    this._itemsRefMap = new Map();
  }

  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    if (
      this.props.highlightedTime !== nextProps.highlightedTime ||
      !isDataEqual(this.props.data, nextProps.data) ||
      nextProps.autoScroll !== this.props.autoScroll ||
      nextProps.listDataContainCaptions !== this.props.listDataContainCaptions ||
      (nextProps.widgetWidth && nextProps.widgetWidth !== this.props.widgetWidth)
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(previousProps: Readonly<Props>) {
    if (!previousProps.autoScroll && this.props.autoScroll) {
      // this is click on resume to autoscroll button
      this.props.onScroll(this._selectedElementY);
    }
  }

  private updateSelected = ({itemY}: {itemY: number}) => {
    this._selectedElementY = itemY;
    if (this.props.autoScroll) {
      this.props.onScroll(this._selectedElementY);
    }
  };

  private _setNavigationItemRef = (index: number, ref: NavigationItem | null) => {
    return this._itemsRefMap.set(index, ref);
  };

  private _getItemRef = (index: number) => {
    return this._itemsRefMap.get(index);
  };

  private _handleUpKeyPressed = (currentIndex: number) => {
    this._getItemRef(currentIndex - 1)?.setFocus();
  };

  private _handleDownKeyPressed = (currentIndex: number) => {
    this._getItemRef(currentIndex + 1)?.setFocus();
  };

  render({data, widgetWidth, showItemsIcons, onSeek, highlightedTime, listDataContainCaptions, searchActive}: Props) {
    if (!data.length) {
      return listDataContainCaptions ? <EmptyState /> : <EmptyList showNoResultsText={searchActive} />;
    }
    return (
      <div className={styles.navigationList} data-testid="navigation_list" aria-live="polite">
        {data.map((item: ItemData, index: number) => {
          const itemTypeTranslate = this.props.itemTypesTranslates[item.itemType];
          return (
            <NavigationItem
              key={item.id}
              ref={node => {
                this._setNavigationItemRef(index, node);
              }}
              widgetWidth={widgetWidth}
              onClick={onSeek}
              selectedItem={highlightedTime === item.displayTime}
              data={item}
              onSelected={this.updateSelected}
              showIcon={showItemsIcons}
              onNext={() => this._handleDownKeyPressed(index)}
              onPrev={() => this._handleUpKeyPressed(index)}
              readLessTranslate={this.props.readLess!}
              readMoreTranslate={this.props.readMore!}
              readMoreLabel={`${this.props.readMoreLabel} ${itemTypeTranslate}`}
              readLessLabel={`${this.props.readLessLabel} ${itemTypeTranslate}`}
            />
          );
        })}
      </div>
    );
  }
}
