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
      shorthandTitle,
      displayDescription
    } = props.data;

    return (
      <div className={[styles[groupData], styles.navigationItem].join(" ")}>
        <div className={styles.metadata}>
          <span className={styles.time}>{displayTime}</span>
          <IconsFactory iconType={itemType}></IconsFactory>
        </div>
        <div className={styles.content}>
          <div className={styles.contentInner}>
            {previewImage && (
              <img
                src={previewImage}
                alt={"Slide Preview"}
                className={styles.thumbnail}
              />
            )}

            <div className={styles.contentText}>
              {shorthandTitle && !this.state.showDescription && (
                <span className={styles.title}>{shorthandTitle}</span>
              )}

              {displayTitle &&
                (!shorthandTitle || this.state.showDescription) && (
                  <span className={styles.title}>{displayTitle}</span>
                )}

              {displayDescription && this.state.showDescription && (
                <div className={styles.description}>{displayDescription}</div>
              )}
              {(displayDescription || shorthandTitle) && (
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
      </div>
    );
  }
}
