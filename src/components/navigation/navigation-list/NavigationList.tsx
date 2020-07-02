import { Component, h } from "preact";
import * as styles from "./NavigationList.scss";
import { NavigationItem, ItemData } from "../navigation-item/NavigationItem";
import { EmptyList } from "../icons/EmptyList";
import { convertData } from "../../../utils";

export interface Props {
  data: Array<ItemData>;
  onSeek: (n: number) => void;
  autoScroll: boolean;
  onWheel: () => void;
  highlightedMap: Record<string, true>;
  filter: any;
}

const HEADER_HEIGHT = 94;

export class NavigationList extends Component<Props> {
  private _listElementRef: HTMLDivElement | null = null;
  private _selectedElementY: number = 0;
  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    if (
      nextProps.highlightedMap !== this.props.highlightedMap ||
      nextProps.data !== this.props.data ||
      nextProps.filter !== this.props.filter ||
      nextProps.autoScroll !== this.props.autoScroll
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(previousProps: Readonly<Props>) {
    if (!previousProps.autoScroll && this.props.autoScroll) {
      // this is click on resume to autoscroll button
      this._makeScroll();
    }
  }

  componentDidMount() {
  };

  componentWillUnmount() {
  };

  private _makeScroll = () => {
    this._listElementRef?.parentElement?.scrollTo(
      0,
      this._selectedElementY - HEADER_HEIGHT
    );
  };

  private updateSelected = (selctedItemData: any) => {
    this._selectedElementY = selctedItemData.itemY;
    if (this.props.autoScroll) {
      this._makeScroll();
    }
  };

  render(props: Props) {
    const { data, filter } = this.props;
    const convertedData = convertData(data, filter);
    if (!convertedData) {
      return <EmptyList />;
    }
    return (
      <div
        ref={node => {
          this._listElementRef = node;
        }}
        className={styles.navigationList}
        onWheel={this.props.onWheel}
      >
        {convertedData.map((item: ItemData, index: number) => {
          return (
            <NavigationItem
              onClick={n => this.props.onSeek(n)}
              selectedItem={this.props.highlightedMap[item.id]}
              key={item.id}
              data={item}
              onSelected={this.updateSelected}
            />
          )})
        }
      </div>
    );
  }
}
