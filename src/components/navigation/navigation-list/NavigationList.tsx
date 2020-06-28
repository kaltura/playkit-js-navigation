import { Component, h } from "preact";
import * as styles from "./NavigationList.scss";
import { NavigationItem } from "../navigation-item/NavigationItem";
import { SearchFilter } from "..";
import { itemTypes } from "../../../utils";
import { EmptyList } from "../icons/EmptyList";

export interface props {
  data?: Array<any>; // TODO: add interface
  filter: SearchFilter;
}
const convertData = (data: Array<any> | undefined, filter: SearchFilter) => {
  let returnValue = data?.slice();
  if (!returnValue || !returnValue.length) {
    return null;
  }
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
      return <NavigationItem key={item.id} data={item}></NavigationItem>;
    });
  } else {
    return <EmptyList></EmptyList>;
  }
};

export class NavigationList extends Component<props> {
  render(props: props) {
    const covertedData = convertData(props.data, props.filter);
    return (
      <div className={styles.navigationList}>
        {covertedData && covertedData}
      </div>
    );
  }
}
