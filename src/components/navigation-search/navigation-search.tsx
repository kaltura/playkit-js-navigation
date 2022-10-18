import {h, Component} from 'preact';
import {A11yWrapper, OnClickEvent} from '@playkit-js/common';
import * as styles from './navigation-search.scss';
import {debounce} from '../../utils';
import {icons} from '../icons';

const {Icon} = KalturaPlayer.ui.components;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

const translates = {
  searchPlaceholder: <Text id="navigation.search_placeholder">Search in video</Text>,
  clearSearch: <Text id="navigation.clear_search">Clear search</Text>
};

export interface SearchProps {
  onChange(value: string): void;
  searchQuery: string;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;
  searchPlaceholder?: string;
  clearSearch?: string;
}

interface SearchState {
  active: boolean;
  focused: boolean;
}

// TODO: UX expert have to finetune this value
const DEBOUNCE_TIMEOUT = 300;

class NavigationSearchComponent extends Component<SearchProps, SearchState> {
  private _inputRef: null | HTMLInputElement = null;
  private _focusedByMouse = false;
  private _debouncedOnChange: (value: string) => void;
  constructor(props: SearchProps) {
    super(props);
    this._debouncedOnChange = debounce(props.onChange, DEBOUNCE_TIMEOUT);
    this.state = {
      active: false,
      focused: false
    };
  }
  shouldComponentUpdate(nextProps: Readonly<SearchProps>, nextState: Readonly<SearchState>) {
    const {searchQuery, kitchenSinkActive} = this.props;
    if (searchQuery !== nextProps.searchQuery || kitchenSinkActive !== nextProps.kitchenSinkActive || this.state.active !== nextState.active) {
      return true;
    }
    return false;
  }
  componentDidUpdate(previousProps: Readonly<SearchProps>): void {
    const {kitchenSinkActive, toggledWithEnter} = this.props;
    if (!previousProps.kitchenSinkActive && kitchenSinkActive) {
      this._focusedByMouse = !toggledWithEnter;
      this._inputRef?.focus();
    }
  }
  private _handleOnChange = (e: any) => {
    this._debouncedOnChange(e.target.value);
  };

  private _onClear = (event: OnClickEvent, byKeyboard?: boolean) => {
    if (!byKeyboard) {
      this._focusedByMouse = true;
    }
    this._inputRef?.focus();
    this.props.onChange('');
  };

  private _onFocus = () => {
    this.setState({
      active: true,
      focused: !this._focusedByMouse
    });
    this._focusedByMouse = false;
  };

  private _onBlur = () => {
    this.setState({
      active: false,
      focused: false
    });
  };

  _handleMouseDown = () => {
    this._focusedByMouse = true;
  };

  render() {
    const {searchQuery} = this.props;
    return (
      <div className={[styles.searchRoot, searchQuery || this.state.active ? styles.active : '', this.state.focused ? styles.focused : ''].join(' ')}>
        <input
          className={styles.searchInput}
          placeholder={this.props.searchPlaceholder}
          aria-label={this.props.searchPlaceholder}
          value={searchQuery}
          onInput={this._handleOnChange}
          onFocus={this._onFocus}
          onBlur={this._onBlur}
          onMouseDown={this._handleMouseDown}
          tabIndex={0}
          ref={node => {
            this._inputRef = node;
          }}
        />
        {searchQuery && (
          <A11yWrapper onClick={this._onClear}>
            <button aria-label={this.props.clearSearch} className={styles.clearIcon} tabIndex={0}>
              <Icon
                id="navigation-clear-search-button"
                height={icons.BigSize}
                width={icons.BigSize}
                viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`}
                path={icons.CLEAR_ICON}
                color="#cccccc"
              />
            </button>
          </A11yWrapper>
        )}
      </div>
    );
  }
}

export const NavigationSearch = withText(translates)(NavigationSearchComponent);
