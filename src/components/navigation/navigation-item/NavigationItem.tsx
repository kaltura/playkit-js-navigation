import { h, Component } from "preact";
import * as styles from "./NavigationItem.scss";
import { groupTypes, itemTypes } from "../../../utils";
import { IconsFactory } from "../icons/IconsFactory";

export interface ItemData {
  id: string;
  startTime: number;
  previewImage: string;
  itemType: itemTypes;
  displayTime: string;
  groupData: groupTypes | null;
  displayTitle: string;
  shorthandTitle: string;
  displayDescription: string;
  indexedText: string;
}

export interface props {
  data?: any;
  onSelected: (a: any) => void;
  selectedItem: boolean;
  onClick: (a: any) => void;
}

export class NavigationItem extends Component<props> {
  matchHeight() {
    if (this._contentContainer!.offsetHeight) {
      this._content!.style.minHeight =
        this._contentContainer!.offsetHeight + "px";
    }
  }
  private _content: HTMLDivElement | null = null;
  private _contentContainer: HTMLDivElement | null = null;
  private _itemElementRef: HTMLDivElement | null = null;

  state = { expandedText: false };

  componentDidUpdate(previousProps: Readonly<props>) {
    if (
      this.props.selectedItem &&
      (!this.props.data.groupData ||
        this.props.data.groupData === groupTypes.first)
    ) {
      this.props.onSelected({
        time: this.props.data.startTime,
        itemY: this._itemElementRef?.offsetTop
      });
    }
    this.matchHeight();
  }

  private _handleClickHandler = () => {
    this.props.onClick(this.props.data.startTime);
  };

  private _handleExpandChange = (event: Event) => {
    event.stopImmediatePropagation();
    // if possible - calculate here the new height - for now it will happen post setState
    this.setState(
      {
        expandedText: !this.state.expandedText
      },
      () => {
        this.matchHeight();
      }
    );
  };

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
    const { selectedItem } = this.props;
    return (
      <div
        ref={node => {
          this._itemElementRef = node;
        }}
        className={[
          styles[groupData ? groupData : "single"],
          styles.navigationItem,
          selectedItem ? styles.selected : null // TODO move to parent or switch to engine
        ].join(" ")}
        onClick={this._handleClickHandler}
      >
        <div className={styles.metadata}>
          <span className={styles.time}>{displayTime}</span>
          <IconsFactory iconType={itemType}></IconsFactory>
        </div>
        <div
          className={styles.content}
          ref={node => {
            this._content = node;
          }}
        >
          {previewImage && (
            <img
              src={previewImage}
              alt={"Slide Preview"}
              className={styles.thumbnail}
            />
          )}
          <div
            className={styles.contentText}
            ref={node => {
              this._contentContainer = node;
            }}
          >
            {shorthandTitle && !this.state.expandedText && (
              <span className={styles.title}>{shorthandTitle}</span>
            )}
            {displayTitle && (!shorthandTitle || this.state.expandedText) && (
              <span className={styles.title}>{displayTitle}</span>
            )}
            {displayDescription && this.state.expandedText && (
              <div className={styles.description}>{displayDescription}</div>
            )}
            {(displayDescription || shorthandTitle) && (
              <button
                className={styles.showMoreButton}
                onClick={this._handleExpandChange}
              >
                {/* TODO - locale */}
                {this.state.expandedText ? "Read Less" : "Read More"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
