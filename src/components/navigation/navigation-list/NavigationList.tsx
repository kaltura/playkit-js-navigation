import { h, Component } from "preact";
import * as styles from "./NavigationList.scss";
import { NavigationItem } from "../navigation-item/NavigationItem";

export interface props {
  data?: Array<any>; // TODO: add interface
}
const convertData = (data: Array<any> | undefined) => {
  if (!data || !data.length) {
    return null;
  }
  return data.map((item: any, index: number) => {
    return <NavigationItem key={item.id} data={item}></NavigationItem>;
  });
};

export class NavigationList extends Component<props> {
  render(props: props) {
    return (
      <div className={styles.navigationList}>
        {props.data && convertData(props.data)}
      </div>
    );
  }
}
