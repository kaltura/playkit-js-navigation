import { Component, h, Fragment } from "preact";
import * as styles from "./NavigationList.scss";
import { NavigationItem } from "../navigation-item/NavigationItem";
import { SearchFilter } from "..";
import { itemTypes } from "../../../utils";
import { EmptyList } from "../icons/EmptyList";
import { AutoscrollIcon } from "../icons/AutoscrollIcon";
const { useRef } = KalturaPlayer.ui.preactHooks;

export interface props {
  data?: Array<any>; // TODO: add interface
  filter: SearchFilter;
  currentTime: number;
  onSeek: (n: number) => void;
  autoScroll: boolean;
  onWheel: () => void;
}

export interface navigationListState {
  selectedTime: number;
  selectedElementY: number;
}

export class NavigationList extends Component<props, navigationListState> {
  shouldComponentUpdate(
    nextProps: Readonly<props>,
    nextState: Readonly<navigationListState>,
    nextContext: any
  ): boolean {
    if (nextProps.currentTime !== this.state.selectedTime) {
      return true;
    }
    // also cover data changes - check if filter too, autoScroll
    return false;
  }

  componentDidUpdate(
    previousProps: Readonly<props>,
    previousState: Readonly<navigationListState>,
    snapshot: any
  ) {
    if (!previousProps.autoScroll && this.props.autoScroll) {
      // this is click on resume to autoscroll button
      this.listElement.current.parentElement.scrollTo(
        0,
        this.state.selectedElementY - 94 // convert to const
      );
    }
  }

  componentDidMount() {
    this.listElement.current.parentElement.onwheel = (e: any) =>
      this.props.onWheel(); // touch does work
  }

  componentWillUnmount() {
    this.listElement.current.parentElement.onwheel = null;
  }

  private convertData = (
    data: Array<any> | undefined,
    filter: SearchFilter,
    currentTime: number
  ): any => {
    let returnValue = data?.slice();
    if (!returnValue || !returnValue.length) {
      return null;
    }
    // apply the query string filter
    if (filter.searchQuery) {
      const lowerQuery = filter.searchQuery.toLowerCase();
      returnValue = returnValue.filter((item: any) => {
        return item.indexedText.indexOf(lowerQuery) > -1;
      });

      returnValue.map(item => {
        item.groupData = null;
        return item;
      });
    }
    // apply the activeTab filter
    if (filter.activeTab !== itemTypes.All) {
      returnValue = returnValue.filter(
        (item: any) => item.itemType === filter.activeTab
      );
      //clear group values
      returnValue.map(item => {
        item.groupData = null;
        return item;
      });
    }

    if (returnValue.length) {
      // todo - ask product if important to re-assign group items
      return returnValue.map((item: any, index: number) => {
        return (
          <NavigationItem
            onClick={n => this.props.onSeek(n)}
            currentTime={currentTime}
            selectedItem={this.state.selectedTime}
            key={item.id}
            data={item}
            onSelected={this.updateSelected}
          />
        );
      });
    }
    return <EmptyList></EmptyList>;
  };

  listElement = useRef(null);

  private updateSelected = (selctedItemData: any) => {
    if (this.props.autoScroll) {
      this.listElement.current.parentElement.scrollTo(
        0,
        selctedItemData.itemY - 94 //TODO magic number
      );
    }
    // TODO - try to not use setState and use local variable instead
    this.setState({
      selectedTime: selctedItemData.time,
      selectedElementY: selctedItemData.itemY
    });
  };
  render(props: props) {
    const covertedData = this.convertData(
      props.data,
      props.filter,
      props.currentTime
    );
    return (
      <div ref={this.listElement} className={styles.navigationList}>
        {covertedData}
      </div>
    );
  }
}
