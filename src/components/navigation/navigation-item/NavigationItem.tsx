import { h, Component } from "preact";
import * as styles from "./NavigationItem.scss";
import { groupTypes } from "../../../utils";
import { IconsFactory } from "../icons/IconsFactory";

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
      previewImage,
      itemType,
      displayTime,
      groupData,
      displayTitle,
      displayDescription
    } = props.data;

    return (
      <div className={[styles[groupData], styles.navigationItem].join(" ")}>
        <div className={styles.metadata}>
          <span className={styles.time}>{displayTime}</span>
          <IconsFactory iconType={itemType}></IconsFactory>
        </div>
        <div className={styles.content}>
          {/* TODO - build better */}
          {previewImage && (
            <img
              src={previewImage}
              alt={"Slide Preview"}
              className={styles.thumbnail}
            />
          )}
          {/* TODO - do we really need this container for title and description? */}
          <div className={styles.content}>
            {displayTitle && (
              <span className={styles.title}>{displayTitle}</span>
            )}
            {displayDescription && this.state.showDescription && (
              <div className={styles.description}>{displayDescription}</div>
            )}
            {displayDescription && (
              <button
                className={styles.showMoreButton}
                onClick={() =>
                  this.setState({
                    showDescription: !this.state.showDescription
                  })
                }
              >
                {/* TODO - locale */}
                {this.state.showDescription ? "Read Less" : "Read More"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
