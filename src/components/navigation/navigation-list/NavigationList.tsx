import {Component, h} from 'preact';
import * as styles from './NavigationList.scss';
import {NavigationItem, ItemData} from '../navigation-item/NavigationItem';
import {EmptyList} from '../icons/EmptyList';
import {EmptyState} from '../icons/EmptyState';
import {isDataEqual, isMapEqual} from '../../../utils';

export interface Props {
  data: Array<ItemData>;
  onSeek: (n: number) => void;
  autoScroll: boolean;
  onScroll: (n: number) => void;
  widgetWidth: number;
  highlightedMap: Record<string, true>;
  showItemsIcons: boolean;
  listDataContainCaptions: boolean;
  searchActive: boolean;
}

export class NavigationList extends Component<Props> {
  private _selectedElementY = 0;
  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    if (
      !isMapEqual(this.props.highlightedMap, nextProps.highlightedMap) ||
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

  render({data, widgetWidth, showItemsIcons, onSeek, highlightedMap, listDataContainCaptions, searchActive}: Props) {
    if (!data.length) {
      return listDataContainCaptions ? <EmptyState /> : <EmptyList showNoResultsText={searchActive} />;
    }
    return (
      <div className={styles.navigationList}>
        {data.map((item: ItemData) => {
          return (
            <NavigationItem
              widgetWidth={widgetWidth}
              onClick={onSeek}
              selectedItem={highlightedMap[item.id]}
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
