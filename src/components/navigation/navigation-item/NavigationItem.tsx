import {Component, h, Fragment} from 'preact';
import {A11yWrapper} from '@playkit-js/common';
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
}

export interface NavigationItemState {
  expandText: boolean;
  imageLoaded: boolean;
  imageFailed: boolean;
  focused: boolean;
}

export class NavigationItem extends Component<NavigationItemProps, NavigationItemState> {
  private _itemElementRef: HTMLDivElement | null = null;
  private _textContainerRef: HTMLDivElement | null = null;
  
  state = {expandText: false, imageLoaded: false, imageFailed: false, focused: false};

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
      nextState.imageLoaded !== this.state.imageLoaded ||
      nextState.imageFailed !== this.state.imageFailed ||
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

  private _handleExpandChange = () => {
    this.setState({
      expandText: !this.state.expandText
    });
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
    return (
      <Fragment>
        <img {...imageProps} />
        <div className={styles.thumbGradient}></div>
      </Fragment>
    );
  };

  render({selectedItem, showIcon, data}: NavigationItemProps) {
    const {id, previewImage, itemType, displayTime, groupData, displayTitle, shorthandTitle, hasShowMore, displayDescription} = data;
    const {imageLoaded} = this.state;

    const a11yProps: Record<string, any> = {
      role: selectedItem ? 'text' : 'listitem',
      ariaCurrent: selectedItem,
      onFocus: this._handleFocus,
      onBlur: this._handleBlur,
      tabIndex: 0,
      ariaHidden: !(selectedItem || this.state.focused)
    };
    
    return (
      <A11yWrapper onClick={this._handleClick} onDownKeyPressed={this.props.onNext} onUpKeyPressed={this.props.onPrev}>
        <div
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
                <A11yWrapper onClick={this._handleExpandChange} onDownKeyPressed={() => {}} onUpKeyPressed={() => {}}>
                  <div role={'button'} tabIndex={0} className={styles.showMoreButton}>
                    {this.state.expandText ? <Text id="navigation.read_less">Read Less</Text> : <Text id="navigation.read_more">Read More</Text>}
                  </div>
                </A11yWrapper>
              )}
            </div>
          </div>
        </div>
      </A11yWrapper>
    );
  }
}
