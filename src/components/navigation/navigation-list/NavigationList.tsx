import {Component, h} from 'preact';
import * as styles from './NavigationList.scss';
import {NavigationItem} from '../navigation-item/NavigationItem';
import {EmptyList} from '../icons/EmptyList';
import {EmptyState} from '../icons/EmptyState';
import {isDataEqual, isMapsEqual} from '../../../utils';
import {ItemData, HighlightedMap} from '../../../types';

export interface Props {
  data: Array<ItemData>;
  onSeek: (n: number) => void;
  autoScroll: boolean;
  onScroll: (n: number) => void;
  widgetWidth: number;
  highlightedMap: HighlightedMap;
  showItemsIcons: boolean;
  listDataContainCaptions: boolean;
  searchActive: boolean;
}

export class NavigationList extends Component<Props> {
  private _selectedElementY = 0;
  private _itemsRefMap: Map<number, NavigationItem | null> = new Map();

  componentWillUnmount() {
    this._itemsRefMap = new Map();
  }

  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    if (
      !isMapsEqual(this.props.highlightedMap, nextProps.highlightedMap) ||
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

  render({data, widgetWidth, showItemsIcons, onSeek, highlightedMap, listDataContainCaptions, searchActive}: Props) {
    if (!data.length) {
      return listDataContainCaptions ? <EmptyState /> : <EmptyList showNoResultsText={searchActive} />;
    }
    return (
      <div className={styles.navigationList} aria-live="polite">
        {data.map((item: ItemData, index: number) => {
          return (
            <NavigationItem
              ref={node => {
                this._setNavigationItemRef(index, node);
              }}
              widgetWidth={widgetWidth}
              onClick={onSeek}
              selectedItem={highlightedMap.has(item.id)}
              key={item.id}
              data={item}
              onSelected={this.updateSelected}
              showIcon={showItemsIcons}
              onNext={() => this._handleDownKeyPressed(index)}
              onPrev={() => this._handleUpKeyPressed(index)}
            />
          );
        })}
      </div>
    );
  }
}
