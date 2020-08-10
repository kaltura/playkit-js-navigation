import {Component, h} from 'preact';
import * as styles from './NavigationList.scss';
import {NavigationItem, ItemData} from '../navigation-item/NavigationItem';
import {EmptyList} from '../icons/EmptyList';
import {isDataEqual, isMapEqual} from '../../../utils';

export interface Props {
  data: Array<ItemData>;
  onSeek: (n: number) => void;
  autoScroll: boolean;
  onScroll: (n: number) => void;
  widgetWidth: number;
  highlightedMap: Record<string, true>;
  showItemsIcons: boolean;
}

export class NavigationList extends Component<Props> {
  private _selectedElementY: number = 0;
  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    if (
      !isMapEqual(this.props.highlightedMap, nextProps.highlightedMap) ||
      !isDataEqual(this.props.data, nextProps.data) ||
      nextProps.autoScroll !== this.props.autoScroll ||
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
      this.props.onScroll(this._selectedElementY);
    }
  }

  private updateSelected = ({itemY}: {itemY: number}) => {
    this._selectedElementY = itemY;
    if (this.props.autoScroll) {
      this.props.onScroll(this._selectedElementY);
    }
  };

  render({data, widgetWidth, showItemsIcons, onSeek, highlightedMap}: Props) {
    if (!data.length) {
      return <EmptyList />;
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
