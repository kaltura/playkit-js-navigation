import { h, Component } from "preact";
import * as styles from "./NavigationItem.scss";
import { groupTypes } from "../../../utils";

export interface itemData {
  groupData?: groupTypes;
  displayTime?: string;
}

export interface props {
  data?: any;
}

export class NavigationItem extends Component<props> {
  state = { showDescription: false };

  render(props: props) {
    const {
      itemType,
      displayTime,
      groupData,
      displayTitle,
      displayDescription
    } = props.data;
    return (
      <div className={styles[itemType]}>
        <div
          className={[styles[groupData], styles.groupIndicator].join(" ")}
        ></div>
        <div className={styles.metadata}>
          <span>{displayTime}</span>
          <div className={styles.icon}> </div>
        </div>
        <div className={styles.content}>
          {displayTitle && <span className={styles.title}>{displayTitle}</span>}
          {displayDescription && (
            <button className={styles.showMore}>Read More</button>
          )}
          {displayDescription && this.state.showDescription && (
            <span className={styles.description}>{displayDescription}</span>
          )}
        </div>
      </div>
    );
  }
}
