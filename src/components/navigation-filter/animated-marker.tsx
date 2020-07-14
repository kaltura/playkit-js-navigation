import { Component, h } from "preact";
import * as styles from "./navigation-filter.scss";

export interface State {}
export interface Props {
  color: string;
  offset: number;
  width: number;
}

export class AnimationMarker extends Component<Props, State> {
  private _barRef: null | HTMLDivElement = null;

  componentDidUpdate() {
    if (!this._barRef) {
      return;
    }
    this._barRef.style.background = this.props.color;
    this._barRef.style.minWidth = this.props.width + "px";
    this._barRef.style.maxWidth = this.props.width + "px";
    this._barRef.style.left = this.props.offset + "px";
    this._barRef.style.position = "relative";
  }

  shouldComponentUpdate(
    nextProps: Readonly<Props>,
    nextState: Readonly<State>,
    nextContext: any
  ): boolean {
    if (!this._barRef) {
      return false;
    }
    this._barRef.style.background = nextProps.color;
    this._barRef.style.minWidth = nextProps.width + "px";
    this._barRef.style.maxWidth = nextProps.width + "px";
    this._barRef.style.left = nextProps.offset + "px";
    return false;
  }

  render(props: Props) {
    const { color, width, offset } = this.props;
    return (
      <div className={styles.animationMarker}>
        <div
          style={{
            "min-height": "2px",
            position: "relative",
            "-webkit-transition-property": "background-color left",
            "-webkit-transition-duration": "0.2s",
            "transition-property": "background-color left",
            "transition-duration": "0.2s"
          }}
          ref={node => {
            this._barRef = node;
          }}
        />
      </div>
    );
  }
}
