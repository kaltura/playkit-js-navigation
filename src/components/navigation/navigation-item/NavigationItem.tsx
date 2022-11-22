import {Component, h} from 'preact';
import {A11yWrapper, OnClickEvent} from '@playkit-js/common';
import * as styles from './NavigationItem.scss';
import {GroupTypes, ItemData} from '../../../types';
import {IconsFactory} from '../icons/IconsFactory';

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
  imageAlt?: string;
}

export interface NavigationItemState {
  expandText: boolean;
  titleTrimmed: boolean;
  imageLoaded: boolean;
  imageFailed: boolean;
}

const translates = () => {
  return {
    readLess: <Text id="navigation.read_less">Less</Text>,
    readMore: <Text id="navigation.read_more">More</Text>,
    imageAlt: <Text id="navigation.image_alt">Slide Preview</Text>
  };
};

@withText(translates)
export class NavigationItem extends Component<NavigationItemProps, NavigationItemState> {
  private _itemElementRef: HTMLDivElement | null = null;
  private _textContainerRef: HTMLDivElement | null = null;
  private _titleRef: HTMLSpanElement | null = null;
  private _showMoreButtonRef: HTMLDivElement | null = null;
  private _showLessButtonRef: HTMLDivElement | null = null;

  state = {expandText: false, imageLoaded: false, imageFailed: false, titleTrimmed: false};

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
      nextState.titleTrimmed !== this.state.titleTrimmed ||
      nextState.imageLoaded !== this.state.imageLoaded ||
      nextState.imageFailed !== this.state.imageFailed ||
      nextProps.widgetWidth !== widgetWidth
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(previousProps: Readonly<NavigationItemProps>, nextState: Readonly<NavigationItemState>) {
    this._getSelected();
    this.matchHeight();
    if (nextState.imageLoaded !== this.state.imageLoaded) {
      this.setState({
        titleTrimmed: this._isEllipsisActive()
      });
    }
  }

  componentDidMount() {
    this._getSelected();
    this.matchHeight();
    if (!this.props.data?.previewImage) {
      this.setState({
        titleTrimmed: this._isEllipsisActive()
      });
    }
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

  private _handleClick = () => {
    this.props.onClick(this.props.data.startTime);
  };

  private _handleExpandChange = (e: OnClickEvent, byKeyboard?: boolean) => {
    this.setState(
      {
        expandText: !this.state.expandText
      },
      () => {
        if (byKeyboard) {
          if (this.state.expandText) {
            this._showLessButtonRef?.focus();
          } else {
            this._showMoreButtonRef?.focus();
          }
        }
      }
    );
  };

  private _renderThumbnail = () => {
    if (this.state.imageFailed) {
      return null;
    }
    const {data, imageAlt} = this.props;
    const {previewImage} = data;
    const imageProps: Record<string, any> = {
      src: previewImage,
      alt: imageAlt,
      className: styles.thumbnail,
      onLoad: () => {
        this.setState({imageLoaded: true});
      },
      onError: () => {
        this.setState({imageFailed: true});
      }
    };
    return <img {...imageProps} />;
  };

  private _renderShowMoreLessButton = () => {
    const {readLess, readMore} = this.props;
    const {expandText} = this.state;
    return (
      <A11yWrapper onClick={this._handleExpandChange}>
        <div
          role={'button'}
          tabIndex={0}
          className={styles.showMoreButton}
          ref={node => {
            if (expandText) {
              this._showLessButtonRef = node;
            } else {
              this._showMoreButtonRef = node;
            }
          }}>
          {expandText ? readLess : readMore}
        </div>
      </A11yWrapper>
    );
  };

  private _isEllipsisActive() {
    if (!this._titleRef || !this._textContainerRef) {
      return false;
    }
    return this._titleRef.getBoundingClientRect().width > this._textContainerRef.getBoundingClientRect().width;
  }

  render({selectedItem, showIcon, data}: NavigationItemProps) {
    const {id, previewImage, itemType, displayTime, groupData, displayTitle, displayDescription} = data;
    const {imageLoaded} = this.state;
    const hasTitle = Boolean(displayTitle || displayDescription);
    return (
      <A11yWrapper onClick={this._handleClick}>
        <div
          tabIndex={0}
          role="listitem"
          area-label={displayTitle}
          ref={node => {
            this._itemElementRef = node;
          }}
          className={[
            styles[groupData ? groupData : 'single'],
            styles.navigationItem,
            selectedItem ? styles.selected : null,
            previewImage && !imageLoaded ? styles.hidden : null
          ].join(' ')}
          data-entry-id={id}>
          <div className={[styles.metadata, displayTime ? styles.withTime : null].join(' ')}>
            {displayTime && <span>{displayTime}</span>}
            {showIcon && (
              <div className={styles.iconWrapper}>
                <IconsFactory iconType={itemType}></IconsFactory>
              </div>
            )}
          </div>
          <div className={[styles.content, previewImage ? styles.hasImage : null].join(' ')}>
            <div
              className={styles.contentText}
              ref={node => {
                this._textContainerRef = node;
              }}>
              {hasTitle && !this.state.expandText && (
                <div className={styles.titleWrapper}>
                  <div className={styles.title}>
                    <span
                      ref={node => {
                        this._titleRef = node;
                      }}>
                      {displayTitle || displayDescription}
                    </span>
                  </div>
                  {this.state.titleTrimmed && this._renderShowMoreLessButton()}
                </div>
              )}
              {this.state.expandText && (
                <div className={styles.expandTextWrapper}>
                  {displayTitle && <span>{displayTitle}</span>}
                  {displayDescription && <div className={styles.description}>{displayDescription}</div>}
                  {this._renderShowMoreLessButton()}
                </div>
              )}
            </div>
            {previewImage && this._renderThumbnail()}
          </div>
        </div>
      </A11yWrapper>
    );
  }
}
