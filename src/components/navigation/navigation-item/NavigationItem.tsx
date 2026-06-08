import {Component, h, Fragment} from 'preact';
import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {ChevronRight} from '@playkit-js/common/dist/icon/icons/chevronRight';
import * as styles from './NavigationItem.scss';
import {GroupTypes, ItemData} from '../../../types';
import {IconsFactory} from '../icons/IconsFactory';
import {NavigationEvent} from '../../../events/events';
import {ui} from '@playkit-js/kaltura-player-js';
const {preacti18n} = ui;

//@ts-ignore
const {getDurationAsText} = KalturaPlayer.ui.utils;
const {withText, Text} = preacti18n;
const {withPlayer} = KalturaPlayer.ui.components;

export interface NavigationItemProps {
  data: ItemData;
  onSelected: (params: {time: number; itemY: number}) => void;
  selectedItem: boolean;
  widgetWidth: number;
  onClick: (time: number, itemType: string) => void;
  showIcon: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  dispatcher: (name: string, payload?: any) => void;
  slideNumber?: number;
  slideAltText?: string;
  instructionLabel?: string;
  timeLabel?: string;
  toggleLabel?: string;
  player?: any;
}

export interface NavigationItemState {
  imageLoaded: boolean;
  imageFailed: boolean;
  useExpandableText: boolean;
  isExpanded: boolean;
  announcement: string;
  hasOverflow: boolean;
}
const translates={
  slideAltText: <Text id="navigation.slide_type.one">Slide</Text>,
  instructionLabel: <Text id="navigation.instruction_label">Jump to this point in video</Text>,
  timeLabel: <Text id="navigation.time_label">Timestamp</Text>,
  toggleLabel: <Text id="navigation.toggle_description">Toggle description</Text>,

};
function getAriaLabelTitle(data: ItemData): string {
  if (typeof data.displayTitle === 'string') {
    return data.displayTitle;
  } else if (data.ariaLabel) {
    return data.ariaLabel;
  } else {
    return data.displayDescription || '';
  }
}
@withPlayer
@withText(translates)
export class NavigationItem extends Component<NavigationItemProps, NavigationItemState> {
  private _itemElementRef: HTMLDivElement | null = null;
  private _textContainerRef: HTMLDivElement | null = null;
  private _descriptionRef: HTMLDivElement | null = null;
  private _announcementTimeout?: number;
  private _overflowCheckFrame?: number;

  constructor(props: NavigationItemProps) {
    super(props);
    this.state = {
      imageLoaded: false,
      imageFailed: false,
      useExpandableText: typeof this.props.data?.displayTitle === 'string',
      isExpanded: false,
      announcement: '',
      hasOverflow: false
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
      data !== nextProps.data ||
      nextState.imageLoaded !== this.state.imageLoaded ||
      nextState.imageFailed !== this.state.imageFailed ||
      nextState.isExpanded !== this.state.isExpanded ||
      nextState.announcement !== this.state.announcement ||
      nextState.hasOverflow !== this.state.hasOverflow ||
      nextState.useExpandableText !== this.state.useExpandableText ||
      nextProps.widgetWidth !== widgetWidth
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(previousProps: Readonly<NavigationItemProps>, previousState: Readonly<NavigationItemState>) {
    if (this.state.announcement) {
      window.clearTimeout(this._announcementTimeout);

      this._announcementTimeout = window.setTimeout(() => {
        this.setState({announcement: ''});
      }, 150);
    }

    this._getSelected();
    this.matchHeight();
    
    // Only check overflow when conditions that affect it change
    const relevantPropsChanged = 
      previousProps.widgetWidth !== this.props.widgetWidth ||
      previousProps.data.displayDescription !== this.props.data.displayDescription;
    const imageJustLoaded = !previousState.imageLoaded && this.state.imageLoaded;
    const justCollapsed = previousState.isExpanded && !this.state.isExpanded;
    
    if (relevantPropsChanged || imageJustLoaded || justCollapsed) {
      this._checkOverflow();
    }
  }

  componentDidMount() {
    this._getSelected();
    this.matchHeight();
    this._checkOverflow();
  }
  componentWillUnmount() {
    if (this._announcementTimeout) {
      window.clearTimeout(this._announcementTimeout);
    }
    if (this._overflowCheckFrame) {
      window.cancelAnimationFrame(this._overflowCheckFrame);
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
    this.props.onClick(this.props.data.startTime, this.props.data.itemType);
  };

  private _toggleExpand = (e: MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    this.setState((prevState) => {
      const newExpandedState = !prevState.isExpanded;

      this.props.dispatcher(NavigationEvent.NAVIGATION_EXPANDABLE_TEXT_CLICK, {
        isTextExpanded: newExpandedState,
        itemType: this.props.data.itemType
      });

      let announcement = '';

      if (newExpandedState) {
        const {displayDescription, startTime} = this.props.data;
        const timestamp = getDurationAsText(Math.floor(startTime), this.props.player?.config.ui.locale, true);
        const titleText = getAriaLabelTitle(this.props.data);
        const descriptionText = typeof displayDescription === 'string' ? displayDescription : '';
        announcement = [`${this.props.timeLabel} ${timestamp}`, titleText, descriptionText].filter(Boolean).join('. ');
      }

      return {
        isExpanded: newExpandedState,
        announcement
      };
    });
  };

  private _checkOverflow = () => {
    // Cancel any pending check
    if (this._overflowCheckFrame) {
      window.cancelAnimationFrame(this._overflowCheckFrame);
    }
    
    // Schedule measurement in RAF to batch layout reads and reduce thrashing
    this._overflowCheckFrame = window.requestAnimationFrame(() => {
      // Only check overflow when collapsed - when expanded, the content is not clamped
      if (this.state.isExpanded) {
        return;
      }
      
      if (!this._descriptionRef || !this.props.data.displayDescription) {
        if (this.state.hasOverflow) {
          this.setState({hasOverflow: false});
        }
        return;
      }

      const isOverflowing = this._descriptionRef.scrollHeight > this._descriptionRef.clientHeight;
      if (isOverflowing !== this.state.hasOverflow) {
        // Reset isExpanded when overflow disappears to keep state clean
        const shouldResetExpanded = !isOverflowing && this.state.isExpanded;
        this.setState({
          hasOverflow: isOverflowing,
          ...(shouldResetExpanded ? {isExpanded: false} : {})
        });
      }
    });
  };

  private _renderToggleButton = () => {
    if (!this.state.hasOverflow) {
      return null;
    }

    return (
    <button
      onClick={this._toggleExpand}
      className={[styles.toggleButton, this.state.isExpanded ? styles.toggleButtonExpanded : null].filter(Boolean).join(' ')}
      aria-expanded={this.state.isExpanded}
      aria-controls={`nav-content-${this.props.data.id}`}
      type="button"
      aria-label={this.props.toggleLabel}>
      <ChevronRight />
    </button>
    );
  };

  private _renderThumbnail = () => {
    if (this.state.imageFailed) {
      return null;
    }
    const altText = `${this.props.slideAltText} ${this.props.slideNumber ? this.props.slideNumber + 1 : 1}`
    const {data} = this.props;
    const {previewImage} = data;
    const imageProps: Record<string, any> = {
      src: previewImage,
      alt: altText,
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

  private _renderTitleAndDescription = () => {
    const {previewImage, displayTitle, displayDescription} = this.props.data;
    const {isExpanded} = this.state;
    const hasTitle = Boolean(displayTitle || displayDescription);
    if (previewImage && hasTitle) {
      if (this.state.useExpandableText) {
        return (
          <div className={styles.titleWrapper}>
            <div id={`nav-content-${this.props.data.id}`}>
              {displayTitle && <div className={styles.title}>{displayTitle}</div>}
              {displayDescription && (
                <div
                  ref={node => { this._descriptionRef = node; }}
                  className={[styles.descriptionWrapper, !isExpanded ? styles['clamped-1'] : null].filter(Boolean).join(' ')}>
                  {displayDescription}
                </div>
              )}
            </div>
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
            <div
              ref={node => { this._descriptionRef = node; }}
              className={[isExpanded ? styles.expanded : styles.expandableText, !isExpanded ? styles['clamped-3'] : null].filter(Boolean).join(' ')}
              id={`nav-content-${this.props.data.id}`}>
              {displayDescription}
            </div>
          </div>
        )}
      </Fragment>
    );
  };

  render() {
    const {data, selectedItem, showIcon, instructionLabel, timeLabel, player} = this.props;
    const {id, previewImage, itemType, displayTime, liveCuePoint, groupData, displayDescription, startTime} = data;
    const {imageLoaded, isExpanded, hasOverflow} = this.state;
    const ariaLabelTitle = getAriaLabelTitle(data);
    const timestampLabel = `${timeLabel} ${getDurationAsText(Math.floor(startTime), player?.config.ui.locale, true)}`
    
    // Include description in aria-label when it exists but doesn't overflow (short description or already expanded)
    const descriptionText = typeof displayDescription === 'string' ? displayDescription : '';
    const includeDescriptionInLabel = descriptionText && !hasOverflow;
    const ariaLabelParts = [timestampLabel, ariaLabelTitle];
    if (includeDescriptionInLabel) {
      ariaLabelParts.push(descriptionText);
    }
    if (instructionLabel) {
      ariaLabelParts.push(instructionLabel);
    }

    const a11yProps: Record<string, any> = {
      ['aria-current']: selectedItem,
      ['aria-label']: ariaLabelParts.join(' '),
      ['aria-describedby']: isExpanded && displayDescription && hasOverflow ? `nav-content-${id}` : undefined,
      tabIndex: 0,
      role: 'button'
    };

    return (
      <div className={styles.itemContainer} data-testid="nav-item-container">
        <A11yWrapper onClick={this._handleClick}>
          <div
            ref={node => {
              this._itemElementRef = node;
            }}
            className={[
              styles[groupData ? groupData : 'single'],
              styles.navigationItem,
              selectedItem ? styles.selected : null,
              previewImage && !imageLoaded ? styles.hidden : null
            ].filter(Boolean).join(' ')}
            data-entry-id={id}
            {...a11yProps}>
            <div className={[styles.metadata, liveCuePoint ? null : styles.withTime].filter(Boolean).join(' ')}>
              {!liveCuePoint && <span>{displayTime}</span>}
              {showIcon && (
                <div className={styles.iconWrapper}>
                  <IconsFactory iconType={itemType} />
                </div>
              )}
            </div>
            <div className={[styles.content, previewImage ? styles.hasImage : null].filter(Boolean).join(' ')}>
              {this._renderTitleAndDescription()}
              {previewImage && this._renderThumbnail()}
            </div>
          </div>
        </A11yWrapper>
        {this._renderToggleButton()}
        <div
          aria-live="polite"
          aria-atomic="true"
          className={styles.srOnly}>
          {this.state.announcement}
        </div>
      </div>
    );
  }
}
