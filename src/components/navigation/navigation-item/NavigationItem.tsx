import {Component, h, Fragment} from 'preact';
import * as styles from './NavigationItem.scss';
import {GroupTypes, ItemData} from '../../../types';
import {IconsFactory} from '../icons/IconsFactory';

const {KeyMap} = KalturaPlayer.ui.utils;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

export interface NavigationItemProps {
  data: ItemData;
  onSelected: (params: {time: number; itemY: number}) => void;
  selectedItem: boolean;
  widgetWidth: number;
  onClick: (time: number) => void;
  showIcon: boolean;
  readLess?: string;
  readMore?: string;
}

export interface NavigationItemState {
  expandText: boolean;
  imageLoaded: boolean;
  imageFailed: boolean;
}

const translates = () => {
  return {
    readLess: <Text id="navigation.read_less">Read Less</Text>,
    readMore: <Text id="navigation.read_more">Read More</Text>
  };
};

@withText(translates)
export class NavigationItem extends Component<NavigationItemProps, NavigationItemState> {
  private _itemElementRef: HTMLDivElement | null = null;
  private _textContainerRef: HTMLDivElement | null = null;
  state = {expandText: false, imageLoaded: false, imageFailed: false};

  matchHeight() {
    if (!this._textContainerRef || !this._itemElementRef) {
      // no point point calculate height of there is no mechanism of show-more button
      return;
    }
    this._itemElementRef.style.minHeight = this._textContainerRef.offsetHeight + 4 + 'px';
  }

  shouldComponentUpdate(nextProps: Readonly<NavigationItemProps>, nextState: Readonly<NavigationItemState>) {
    const {selectedItem, data, widgetWidth} = this.props;
    if (
      selectedItem !== nextProps.selectedItem ||
      data !== nextProps.data ||
      nextState.expandText !== this.state.expandText ||
      (selectedItem && nextState.imageLoaded && !this.state.imageLoaded) ||
      nextProps.widgetWidth !== widgetWidth
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(previousProps: Readonly<NavigationItemProps>) {
    this._getSelected();
    this.matchHeight();
  }

  componentDidMount() {
    this._getSelected();
    this.matchHeight();
  }

  private _getSelected = () => {
    const {selectedItem, data} = this.props;
    const {groupData, startTime, previewImage} = data;
    if (this._itemElementRef && selectedItem && (!groupData || groupData === GroupTypes.first)) {
      if (previewImage && this.state.imageLoaded) {
        this.props.onSelected({
          time: startTime,
          itemY: this._itemElementRef.offsetTop
        });
      } else if (!previewImage) {
        this.props.onSelected({
          time: startTime,
          itemY: this._itemElementRef.offsetTop
        });
      }
    }
  };

  private _handleClickHandler = () => {
    this.props.onClick(this.props.data.startTime);
  };

  private _handleKeyHandler = (e: KeyboardEvent) => {
    if (e.keyCode === KeyMap.ENTER || e.keyCode === KeyMap.SPACE) {
      this._handleClickHandler();
    }
  };

  private _handleExpandChange = (event: Event) => {
    event.stopPropagation();
    this.setState({
      expandText: !this.state.expandText
    });
  };

  private _renderThumbnail = () => {
    if (this.state.imageFailed) {
      return null;
    }
    const {data, selectedItem} = this.props;
    const {previewImage} = data;
    const imageProps: Record<string, any> = {
      src: previewImage,
      alt: 'Slide Preview',
      className: styles.thumbnail,
      onLoad: () => {
        this.setState({imageLoaded: true});
      },
      onError: () => {
        this.setState({imageFailed: true});
      }
    };
    return (
      <Fragment>
        <img {...imageProps} />
        <div className={styles.thumbGradient}></div>
      </Fragment>
    );
  };

  render({selectedItem, showIcon, data, ...otherProps}: NavigationItemProps) {
    const {id, previewImage, itemType, displayTime, groupData, displayTitle, shorthandTitle, hasShowMore, displayDescription} = data;
    return (
      <div
        tabIndex={0}
        role="button"
        ref={node => {
          this._itemElementRef = node;
        }}
        className={[styles[groupData ? groupData : 'single'], styles.navigationItem, selectedItem ? styles.selected : null].join(' ')}
        data-entry-id={id}
        onClick={this._handleClickHandler}
        onKeyDown={this._handleKeyHandler}>
        <div className={[styles.metadata, displayTime ? styles.withTime : null].join(' ')}>
          {displayTime && <span>{displayTime}</span>}
          {showIcon && (
            <div className={styles.iconWrapper}>
              <IconsFactory iconType={itemType}></IconsFactory>
            </div>
          )}
        </div>
        <div className={[styles.content, previewImage ? styles.hasImage : null].join(' ')}>
          {previewImage && this._renderThumbnail()}
          <div
            className={styles.contentText}
            ref={node => {
              this._textContainerRef = node;
            }}>
            {shorthandTitle && !this.state.expandText && <span className={styles.title}>{shorthandTitle}</span>}

            {displayTitle && (!shorthandTitle || this.state.expandText) && <span className={styles.title}>{displayTitle}</span>}

            {displayDescription && this.state.expandText && <div className={styles.description}>{displayDescription}</div>}
            {hasShowMore && (
              <div
                role={'button'}
                tabIndex={0}
                className={styles.showMoreButton}
                onClick={e => {
                  this._handleExpandChange(e);
                }}
                onKeyDown={e => {
                  if (e.keyCode === KeyMap.ENTER || e.keyCode === KeyMap.SPACE) {
                    this._handleExpandChange(e);
                  }
                }}>
                {this.state.expandText ? otherProps.readLess : otherProps.readMore}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
