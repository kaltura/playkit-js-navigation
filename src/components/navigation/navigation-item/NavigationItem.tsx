import {Component, h} from 'preact';
import {A11yWrapper, OnClickEvent} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import * as styles from './NavigationItem.scss';
import {GroupTypes, ItemData} from '../../../types';
import {IconsFactory} from '../icons/IconsFactory';

const {Text} = KalturaPlayer.ui.preacti18n;

export interface NavigationItemProps {
  data: ItemData;
  onSelected: (params: {time: number; itemY: number}) => void;
  selectedItem: boolean;
  widgetWidth: number;
  onClick: (time: number) => void;
  showIcon: boolean;
  onNext: () => void;
  onPrev: () => void;
  readLessTranslate: string;
  readMoreTranslate: string;
  readMoreLabel: string;
  readLessLabel: string;
}

export interface NavigationItemState {
  expandText: boolean;
  titleTrimmed: boolean;
  imageLoaded: boolean;
  imageFailed: boolean;
  focused: boolean;
}

export class NavigationItem extends Component<NavigationItemProps, NavigationItemState> {
  private _itemElementRef: HTMLDivElement | null = null;
  private _textContainerRef: HTMLDivElement | null = null;
  private _titleRef: HTMLSpanElement | null = null;
  private _showMoreButtonRef: HTMLDivElement | null = null;
  private _showLessButtonRef: HTMLDivElement | null = null;

  constructor(props: NavigationItemProps) {
    super(props);
    this.state = {expandText: !props.data.previewImage, imageLoaded: false, imageFailed: false, titleTrimmed: false, focused: false};
  }

  public setFocus() {
    this._itemElementRef?.focus();
  }

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
      this.state.focused !== nextState.focused ||
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

  private _handleFocus = () => {
    this.setState({
      focused: true
    });
  };

  private _handleBlur = () => {
    this.setState({
      focused: false
    });
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
    const {data} = this.props;
    const {previewImage} = data;
    const imageProps: Record<string, any> = {
      src: previewImage,
      alt: <Text id="navigation.image_alt">Slide Preview</Text>,
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

  private _renderShowMoreLessButton = (title: string) => {
    if (!this.props.data.previewImage) {
      return null;
    }
    const {expandText} = this.state;
    return (
      <A11yWrapper onClick={this._handleExpandChange}>
        <div
          tabIndex={0}
          className={styles.showMoreButton}
          ref={node => {
            if (expandText) {
              this._showLessButtonRef = node;
            } else {
              this._showMoreButtonRef = node;
            }
          }}
          aria-label={`${expandText ? this.props.readLessLabel : this.props.readMoreLabel} ${title}`}>
          {expandText ? this.props.readLessTranslate : this.props.readMoreTranslate}
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
    const {id, previewImage, itemType, displayTime, liveCuePoint, groupData, displayTitle, displayDescription} = data;
    const hasTitle = Boolean(displayTitle || displayDescription);
    const {imageLoaded} = this.state;

    const a11yProps: Record<string, any> = {
      ['aria-current']: selectedItem,
      onFocus: this._handleFocus,
      onBlur: this._handleBlur,
      tabIndex: 0,
      ariaHidden: !(selectedItem || this.state.focused)
    };

    const readLessMoreAriaTitle: string = displayTitle as string || displayDescription || '';

    return (
      <A11yWrapper
        onClick={this._handleClick}
        onDownKeyPressed={this.props.onNext}
        onUpKeyPressed={this.props.onPrev}
        role={selectedItem ? 'text' : 'listitem'}>
        <div
          tabIndex={0}
          aria-label={displayTitle || displayDescription}
          ref={node => {
            this._itemElementRef = node;
          }}
          className={[
            styles[groupData ? groupData : 'single'],
            styles.navigationItem,
            selectedItem ? styles.selected : null,
            previewImage && !imageLoaded ? styles.hidden : null
          ].join(' ')}
          data-entry-id={id}
          {...a11yProps}>
          <div className={[styles.metadata, liveCuePoint ? null : styles.withTime].join(' ')}>
            {!liveCuePoint && <span>{displayTime}</span>}
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
                  {this.state.titleTrimmed && this._renderShowMoreLessButton(readLessMoreAriaTitle)}
                </div>
              )}
              {this.state.expandText && (
                <div className={styles.expandTextWrapper}>
                  {displayTitle && <span>{displayTitle}</span>}
                  {displayDescription && <div className={styles.description}>{displayDescription}</div>}
                  {this._renderShowMoreLessButton(readLessMoreAriaTitle)}
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
