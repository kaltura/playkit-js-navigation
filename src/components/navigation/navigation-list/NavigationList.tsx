import {Component, h} from 'preact';
import * as styles from './NavigationList.scss';
import {NavigationItem} from '../navigation-item/NavigationItem';
import {EmptyList} from '../icons/EmptyList';
import {EmptyState} from '../icons/EmptyState';
import {isDataEqual} from '../../../utils';
import {ItemData, ItemTypesTranslates} from '../../../types';

export interface Props {
  data: Array<ItemData>;
  onSeek: (n: number, itemType: string) => void;
  autoScroll: boolean;
  onScroll: (n: number) => void;
  widgetWidth: number;
  highlightedTime: string;
  showItemsIcons: boolean;
  listDataContainCaptions: boolean;
  searchActive: boolean;
  itemTypesTranslates: ItemTypesTranslates;
  dispatcher: (name: string, payload?: any) => void;
}

export class NavigationList extends Component<Props> {
  private _selectedElementY = 0;
  private _itemRefs: Map<string, NavigationItem> = new Map();

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

  public focusItemById = (itemId: string) => {
    const item = this._itemRefs.get(itemId);
    if (!item?.base || !(item.base instanceof HTMLElement)) return;

    // NavigationItem is wrapped by HOCs, so access the focusable element via DOM query
    const focusableElement = item.base.querySelector(`[data-entry-id="${itemId}"]`);
    if (focusableElement instanceof HTMLElement) {
      focusableElement.focus({preventScroll: true});
    }
  };

  private _setItemRef = (id: string, ref: NavigationItem | null) => {
    if (ref) {
      this._itemRefs.set(id, ref);
    } else {
      this._itemRefs.delete(id);
    }
  };

  render({data, widgetWidth, showItemsIcons, onSeek, highlightedTime, listDataContainCaptions, searchActive}: Props) {
    if (!data.length) {
      return listDataContainCaptions ? <EmptyState /> : <EmptyList showNoResultsText={searchActive} />;
    }
    return (
      <div className={styles.navigationList} data-testid="navigation_list" aria-live="polite" role="tabpanel">
        {data.map((item: ItemData, index: number) => {
          return (
            <NavigationItem
              key={item.id}
              ref={(ref) => this._setItemRef(item.id, ref)}
              widgetWidth={widgetWidth}
              onClick={item.onClick ?? onSeek}
              selectedItem={highlightedTime === item.displayTime}
              data={item}
              onSelected={this.updateSelected}
              showIcon={showItemsIcons}
              dispatcher={this.props.dispatcher}
              slideNumber={index}
            />
          );
        })}
      </div>
    );
  }
}
