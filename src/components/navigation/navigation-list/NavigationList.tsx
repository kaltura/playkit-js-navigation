import { Component, h } from "preact";
import * as styles from "./NavigationList.scss";
import { NavigationItem } from "../navigation-item/NavigationItem";
import { SearchFilter } from "..";
import { itemTypes } from "../../../utils";

export interface props {
  data?: Array<any>; // TODO: add interface
  filter: SearchFilter;
}
const convertData = (data: Array<any> | undefined, filter: SearchFilter) => {
  let returnValue = data?.slice();
  if (!returnValue || !returnValue.length) {
    return null;
  }
  if (filter.activeTab !== itemTypes.All) {
    returnValue = returnValue.filter(
      (item: any) => item.itemType === filter.activeTab
    );
  }
  if (filter.searchQuery) {
    const lowerQuery = filter.searchQuery.toLowerCase();
    returnValue = returnValue.filter((item: any) => {
      return item.indexedText.indexOf(lowerQuery) > -1;
    });
  }

  return returnValue.map((item: any, index: number) => {
    return <NavigationItem key={item.id} data={item}></NavigationItem>;
  });
};

export class NavigationList extends Component<props> {
  render(props: props) {
    return (
      <div className={styles.navigationList}>
        {props.data && convertData(props.data, props.filter)}
      </div>
    );
  }
}
