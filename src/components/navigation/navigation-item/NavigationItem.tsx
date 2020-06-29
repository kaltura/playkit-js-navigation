import { h, Component } from "preact";
const { useRef } = KalturaPlayer.ui.preactHooks;
import * as styles from "./NavigationItem.scss";
import { groupTypes } from "../../../utils";
import { IconsFactory } from "../icons/IconsFactory";

export interface itemData {
  groupData?: groupTypes;
  displayTime?: string;
}

export interface props {
  data?: any;
  onSelected: (a: any) => void;
  currentTime: number;
  selectedItem: number;
  onClick: (a: any) => void;
}

export class NavigationItem extends Component<props> {
  state = { showDescription: false };

  shouldComponentUpdate(
    nextProps: Readonly<props>,
    nextState: Readonly<{}>,
    nextContext: any
  ): boolean {
    if (
      nextProps.currentTime === nextProps.data.startTime &&
      nextProps.selectedItem !== nextProps.currentTime &&
      (!nextProps.data.groupData ||
        nextProps.data.groupData === groupTypes.first)
    ) {
      // notify the parent that we need a scroll
      this.props.onSelected({
        time: nextProps.currentTime,
        itemY: this.itemElement.current.offsetTop
      });
    }
    return true;
  }

  onClickHandler(event: any) {
    // make sure the show more button does not trigger the item
    if (event.target.tagName !== "BUTTON") {
      this.props.onClick(this.props.data.startTime);
    }
  }

  itemElement = useRef(null);

  render(props: props) {
    const {
      startTime,
      previewImage,
      itemType,
      displayTime,
      groupData,
      displayTitle,
      shorthandTitle,
      displayDescription
    } = props.data;
    const { selectedItem } = this.props;
    return (
      <div
        ref={this.itemElement}
        className={[
          styles[groupData],
          styles.navigationItem,
          selectedItem === startTime ? styles.selected : null
        ].join(" ")}
        onClick={e => this.onClickHandler(e)}
      >
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
