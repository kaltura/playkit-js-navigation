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
  originalTime: number;
}

export interface Props {
  data?: any;
  onSelected: (a: any) => void;
  selectedItem: boolean;
  onClick: (a: any) => void;
}

export class NavigationItem extends Component<Props> {
  private _itemElementRef: HTMLDivElement | null  = null;
  state = { showDescription: false };

  shouldComponentUpdate(
    nextProps: Readonly<Props>,
  ) {
      const { selectedItem, data } = this.props;
      if (
        selectedItem !== nextProps.selectedItem ||
        data !== nextProps.data
      ) {
          return true;
      }
      return false;
  }

  componentDidUpdate(
    previousProps: Readonly<Props>,
  ) {
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
  }

  private _handleClickHandler = () => {
    console.log(">> start time of item", this.props.data.startTime)
    this.props.onClick(this.props.data.startTime);
  }

  private _handleExpandChange = (event: Event) => {
    event.stopImmediatePropagation();
    this.setState({
      showDescription: !this.state.showDescription
    });
  }

  render(props: Props) {
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
                  // consider use method and stopPropagation
                  onClick={this._handleExpandChange}
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
