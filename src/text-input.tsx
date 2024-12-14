import {h, Component} from 'preact';
import {ui} from '@playkit-js/kaltura-player-js';

const {PLAYER_SIZE} = ui.Components;

const mapStateToProps = (state: any) => {
  return {
    isSmallSize: state.shell.playerSize === PLAYER_SIZE.TINY
  };
};

@ui.redux.connect(mapStateToProps)
class TextOverflowWrapper extends Component<any, any> {
  private _contentWrapperRef: HTMLDivElement | null = null;
  private _resizeObserver: ResizeObserver | null = null;

  constructor(props: any) {
    super(props);
    this.state = {
      renderContent: true,
      showContent: true
    };
  }

  componentDidMount(): void {
    this._resizeObserver = new ResizeObserver(this._handleResize);
    if (this._contentWrapperRef) {
      this._resizeObserver.observe(this._contentWrapperRef);
    }
  }

  componentDidUpdate(previousProps: Readonly<any>): void {
    if (previousProps.isSmallSize !== this.props.isSmallSize) {
      this._handleResize();
    }
  }

  componentWillUnmount(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  private _handleResize = () => {
    if (this._contentWrapperRef) {
      this.setState({
        showContent: this._contentWrapperRef.offsetWidth >= this.props.minWidth,
        renderContent: !this.props.isSmallSize
      });
    }
  };

  render() {
    return (
      <div
        id="contentWrapper"
        ref={node => {
          this._contentWrapperRef = node;
        }}
        style={{
          minWidth: '0px',
          maxWidth: '100%',
          marginRight: 'auto',
          visibility: this.state.showContent ? 'visible' : 'hidden',
          display: this.state.renderContent ? 'flex' : 'none'
        }}>
        {this.props.children}
      </div>
    );
  }
}

export default TextOverflowWrapper;
