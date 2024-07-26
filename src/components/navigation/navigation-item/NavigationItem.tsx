import {Component, h, Fragment} from 'preact';
import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import * as styles from './NavigationItem.scss';
import {GroupTypes, ItemData} from '../../../types';
import {IconsFactory} from '../icons/IconsFactory';
import { NavigationEvent } from "../../../events/events";
import {ui} from '@playkit-js/kaltura-player-js';
const {preacti18n} = ui;

const {ExpandableText} = ui.components;
const {Text, Localizer} = preacti18n;

export interface NavigationItemProps {
  data: ItemData;
  onSelected: (params: {time: number; itemY: number}) => void;
  selectedItem: boolean;
  widgetWidth: number;
  onClick: (time: number, itemType: string) => void;
  showIcon: boolean;
  onNext: () => void;
  onPrev: () => void;
  dispatcher: (name: string, payload?: any) => void;
}

export interface NavigationItemState {
  imageLoaded: boolean;
  imageFailed: boolean;
  focused: boolean;
  useExpandableText: boolean;
}

export class NavigationItem extends Component<NavigationItemProps, NavigationItemState> {
  private _itemElementRef: HTMLDivElement | null = null;
  private _textContainerRef: HTMLDivElement | null = null;

  constructor(props: NavigationItemProps) {
    super(props);
    this.state = {
      imageLoaded: false,
      imageFailed: false,
      focused: false,
      useExpandableText: typeof this.props.data?.displayTitle === 'string'
    };
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
    this.props.onClick(this.props.data.startTime, this.props.data.itemType);
  };

  private _onExpand = (isTextExpanded: boolean) => {
    this.props.dispatcher(NavigationEvent.NAVIGATION_EXPANDABLE_TEXT_CLICK,  {isTextExpanded, itemType: this.props.data.itemType});
  }
  private _handleExpand = (e: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
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

  private _renderTitleAndDescription = (ariaLabelTitle: string) => {
    const {previewImage, displayTitle, displayDescription} = this.props.data;
    const hasTitle = Boolean(displayTitle || displayDescription);
    if (previewImage && hasTitle) {
      if (this.state.useExpandableText) {
        return (
          <div className={styles.titleWrapper}>
            <ExpandableText
              text={ariaLabelTitle || displayDescription || ''}
              lines={1}
              forceShowMore={Boolean(displayTitle && displayDescription)}
              onClick={this._handleExpand}
              onExpand={this._onExpand}
              className={styles.expandableText}
              classNameExpanded={styles.expanded}
              buttonProps={{
                tabIndex: 0
              }}>
              {displayTitle && <div className={styles.title}>{displayTitle}</div>}
              {displayDescription && <div className={styles.descriptionWrapper}>{displayDescription}</div>}
            </ExpandableText>
          </div>
        );
      }
      return <div className={styles.title}>{displayTitle || displayDescription}</div>;
    }
    return (
      <Fragment>
        {displayTitle && <div className={styles.title}>{displayTitle}</div>}
        {displayDescription && (
          <div className={styles.descriptionWrapper}>
            <Localizer>
              <ExpandableText
                buttonProps={{
                  tabIndex: 0,
                  readMoreLabel: <Text id="navigation.read_more">Read more</Text>,
                  readLessLabel: <Text id="navigation.read_less">Read less</Text>
                }}
                text={displayDescription}
                lines={3}
                className={styles.expandableText}
                classNameExpanded={styles.expanded}
                onClick={this._handleExpand}
                onExpand={this._onExpand}>
                {displayDescription}
              </ExpandableText>
            </Localizer>
          </div>
        )}
      </Fragment>
    );
  };

  render({selectedItem, showIcon, data}: NavigationItemProps) {
    const {id, previewImage, itemType, displayTime, liveCuePoint, groupData, displayTitle, displayDescription} = data;
    const {imageLoaded} = this.state;

    const a11yProps: Record<string, any> = {
      ['aria-current']: selectedItem,
      onFocus: this._handleFocus,
      onBlur: this._handleBlur,
      tabIndex: 0,
    };

    const ariaLabelTitle: string = typeof displayTitle === 'string' ? displayTitle : displayDescription || '';

    return (
      <A11yWrapper
        onClick={this._handleClick}
        onDownKeyPressed={this.props.onNext}
        onUpKeyPressed={this.props.onPrev}
        role={selectedItem ? 'text' : 'listitem'}>
        <div
          tabIndex={0}
          aria-label={ariaLabelTitle}
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
                <IconsFactory iconType={itemType} />
              </div>
            )}
          </div>
          <div className={[styles.content, previewImage ? styles.hasImage : null].join(' ')}>
            {this._renderTitleAndDescription(ariaLabelTitle)}
            {previewImage && this._renderThumbnail()}
          </div>
        </div>
      </A11yWrapper>
    );
  }
}
