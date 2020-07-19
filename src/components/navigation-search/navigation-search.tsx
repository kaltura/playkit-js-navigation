import {h, Component} from 'preact';
import * as styles from './navigation-search.scss';

export interface SearchProps {
  onChange(value: string): void;
  searchQuery: string;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;
}

interface SearchState {
  active: boolean;
  focused: boolean;
}

export class NavigationSearch extends Component<SearchProps, SearchState> {
  state: SearchState = {
    active: false,
    focused: false,
  };
  private _inputRef: null | HTMLInputElement = null;
  private _focusedByMouse = false;

  shouldComponentUpdate(
    nextProps: Readonly<SearchProps>,
    nextState: Readonly<SearchState>
  ) {
    const {searchQuery, kitchenSinkActive} = this.props;
    if (
      searchQuery !== nextProps.searchQuery ||
      kitchenSinkActive !== nextProps.kitchenSinkActive ||
      this.state.active !== nextState.active
    ) {
      return true;
    }
    return false;
  }
  componentDidUpdate(previousProps: Readonly<SearchProps>): void {
    const {kitchenSinkActive, toggledWithEnter} = this.props;
    if (
      !previousProps.kitchenSinkActive &&
      kitchenSinkActive &&
      toggledWithEnter
    ) {
      this._inputRef?.focus();
    }
  }
  private _handleOnChange = (e: any) => {
    this.props.onChange(e.target.value);
  };

  private _onClear = (event: MouseEvent) => {
    if (event.x !== 0 && event.y !== 0) {
      this._focusedByMouse = true;
    }
    this._inputRef?.focus();
    this.props.onChange('');
  };

  private _onFocus = () => {
    this.setState({
      active: true,
      focused: !this._focusedByMouse,
    });
    this._focusedByMouse = false;
  };

  private _onBlur = () => {
    this.setState({
      active: false,
      focused: false,
    });
  };

  _handleMouseDown = () => {
    this._focusedByMouse = true;
  };

  render() {
    const {searchQuery} = this.props;
    return (
      <div
        className={[
          styles.searchRoot,
          searchQuery || this.state.active ? styles.active : '',
          this.state.focused ? styles.focused : '',
        ].join(' ')}>
        <input
          className={styles.searchInput}
          placeholder={'Search in video'}
          value={searchQuery}
          onInput={this._handleOnChange}
          onFocus={this._onFocus}
          onBlur={this._onBlur}
          onMouseDown={this._handleMouseDown}
          tabIndex={1}
          ref={node => {
            this._inputRef = node;
          }}
        />
        {searchQuery && (
          <button
            className={styles.clearIcon}
            onClick={this._onClear}
            tabIndex={1}
          />
        )}
      </div>
    );
  }
}
