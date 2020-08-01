import {Component, h} from 'preact';
import * as styles from './NavigationList.scss';
import {NavigationItem, ItemData} from '../navigation-item/NavigationItem';
import {EmptyList} from '../icons/EmptyList';

export interface Props {
  data: Array<ItemData>;
  onSeek: (n: number) => void;
  autoScroll: boolean;
  onWheel: () => void;
  widgetWidth: number;
  highlightedMap: Record<string, true>;
  visibleLiveItemsMap: Record<string, true> | null;
  headerHeight: number;
  showItemsIcons: boolean;
}

export class NavigationList extends Component<Props> {
  private _listElementRef: HTMLDivElement | null = null;
  private _selectedElementY: number = 0;
  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    if (
      nextProps.highlightedMap !== this.props.highlightedMap ||
      nextProps.visibleLiveItemsMap !== this.props.visibleLiveItemsMap ||
      nextProps.data !== this.props.data ||
      nextProps.autoScroll !== this.props.autoScroll ||
      nextProps.headerHeight !== this.props.headerHeight ||
      (nextProps.widgetWidth &&
        nextProps.widgetWidth !== this.props.widgetWidth)
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(previousProps: Readonly<Props>) {
    if (!previousProps.autoScroll && this.props.autoScroll) {
      // this is click on resume to autoscroll button
      this._scroll();
    }
  }

  private _scroll = () => {
    this._listElementRef?.parentElement?.scrollTo(
      0,
      this._selectedElementY - this.props.headerHeight
    );
  };

  private updateSelected = (selectedItemData: any) => {
    this._selectedElementY = selectedItemData.itemY;
    if (this.props.autoScroll) {
      this._scroll();
    }
  };

  render(props: Props) {
    const {data, widgetWidth, showItemsIcons, visibleLiveItemsMap} = this.props;
    if (!data.length) {
      return <EmptyList />;
    }
    const navigationData = visibleLiveItemsMap
      ? data.filter((item: ItemData) => visibleLiveItemsMap[item.id])
      : data;
    return (
      <div
        ref={node => {
          this._listElementRef = node;
        }}
        className={styles.navigationList}
        onWheel={this.props.onWheel}>
        {navigationData.map((item: ItemData) => {
          return (
            <NavigationItem
              widgetWidth={widgetWidth}
              onClick={this.props.onSeek}
              selectedItem={this.props.highlightedMap[item.id]}
              key={item.id}
              data={item}
              onSelected={this.updateSelected}
              showIcon={showItemsIcons}
            />
          );
        })}
      </div>
    );
  }
}
