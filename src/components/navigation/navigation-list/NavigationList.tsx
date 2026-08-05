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
  getScrollContainer?: () => HTMLElement | null;
}

export class NavigationList extends Component<Props> {
  private _selectedElementY = 0;
  private _focusableElements: Map<string, HTMLElement> = new Map();

  private _scrollItemIntoViewVertically = (element: HTMLElement): void => {
    const container = this.props.getScrollContainer?.();
    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const padding = 8;

    if (elementRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - elementRect.top + padding;
      return;
    }

    if (elementRect.bottom > containerRect.bottom) {
      container.scrollTop += elementRect.bottom - containerRect.bottom + padding;
    }
  };

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
    const element = this._focusableElements.get(itemId);
    if (!element) return;

    try {
      // Use preventScroll to avoid browser-specific scrolling issues (Firefox/Safari)
      // Scrolling is handled separately by _scrollItemIntoViewVertically
      element.focus({preventScroll: true});
    } catch (_error) {
      // Fallback for browsers that don't support preventScroll option
      element.focus();
    }

    this._scrollItemIntoViewVertically(element);
  };

  private _handleFocusableElement = (id: string) => (element: HTMLElement | null) => {
    if (element) {
      this._focusableElements.set(id, element);
    } else {
      this._focusableElements.delete(id);
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
              onFocusableElementReady={this._handleFocusableElement(item.id)}
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
