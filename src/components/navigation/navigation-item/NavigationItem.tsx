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
  displayTitle?: string;
  shorthandTitle?: string;
  displayDescription?: string;
  shorthandDescription?: string;
  indexedText: string;
  originalTime: number;
  hasShowMore: boolean;
}

export interface Props {
  data?: any;
  onSelected: (a: any) => void;
  selectedItem: boolean;
  widgetWidth: number;
  onClick: (a: any) => void;
}

export interface State {
  expandText: boolean;
}

export class NavigationItem extends Component<Props, State> {
  private _itemElementRef: HTMLDivElement | null = null;
  private _textContainer: HTMLDivElement | null = null;
  state = { expandText: false };

  matchHeight() {
    if (
      !this.props.data.hasShowMore ||
      !this._textContainer ||
      !this._itemElementRef
    ) {
      // no point point calculate height of there is no mechanism of show-more button
      return;
    }
    this._itemElementRef!.style.minHeight =
      this._textContainer!.offsetHeight + "px";
  }

  shouldComponentUpdate(
    nextProps: Readonly<Props>,
    nextState: Readonly<State>
  ) {
    const { selectedItem, data, widgetWidth } = this.props;
    if (
      selectedItem !== nextProps.selectedItem ||
      data !== nextProps.data ||
      nextState.expandText !== this.state.expandText ||
      (data.hasShowMore && nextProps.widgetWidth !== widgetWidth)
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(previousProps: Readonly<Props>) {
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
  componentDidMount() {
    this.matchHeight();
  }

  private _handleClickHandler = () => {
    this.props.onClick(this.props.data.startTime);
  };

  private _handleExpandChange = (event: Event) => {
    event.stopImmediatePropagation();
    this.setState({
      expandText: !this.state.expandText
    });
  };

  render(props: Props) {
    const {
      previewImage,
      itemType,
      displayTime,
      groupData,
      displayTitle,
      shorthandTitle,
      hasShowMore,
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
          className={[
            styles.content,
            previewImage ? styles.hasImage : null
          ].join(" ")}
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
              this._textContainer = node;
            }}
          >
            {shorthandTitle && !this.state.expandText && (
              <span className={styles.title}>{shorthandTitle}</span>
            )}

            {displayTitle && (!shorthandTitle || this.state.expandText) && (
              <span className={styles.title}>{displayTitle}</span>
            )}

            {displayDescription && this.state.expandText && (
              <div className={styles.description}>{displayDescription}</div>
            )}
            {hasShowMore && (
              <button
                className={styles.showMoreButton}
                onClick={this._handleExpandChange}
              >
                {/* TODO - locale */}
                {this.state.expandText ? "Read Less" : "Read More"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
