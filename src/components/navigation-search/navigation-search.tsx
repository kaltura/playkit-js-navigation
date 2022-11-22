import {h, Component} from 'preact';
import {A11yWrapper} from '@playkit-js/common';
import * as styles from './navigation-search.scss';
import {debounce} from '../../utils';

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
}

// TODO: UX expert have to finetune this value
const DEBOUNCE_TIMEOUT = 300;

class NavigationSearchComponent extends Component<SearchProps, SearchState> {
  private _inputRef: null | HTMLInputElement = null;
  private _debouncedOnChange: (value: string) => void;
  constructor(props: SearchProps) {
    super(props);
    this._debouncedOnChange = debounce(props.onChange, DEBOUNCE_TIMEOUT);
    this.state = {
      active: false
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
    const {kitchenSinkActive} = this.props;
    if (!previousProps.kitchenSinkActive && kitchenSinkActive) {
      this._inputRef?.focus();
    }
  }
  private _handleOnChange = (e: any) => {
    this._debouncedOnChange(e.target.value);
  };

  private _onClear = () => {
    this._inputRef?.focus();
    this.props.onChange('');
  };

  private _onFocus = () => {
    this.setState({
      active: true
    });
  };

  private _onBlur = () => {
    this.setState({
      active: false
    });
  };

  render() {
    const {searchQuery} = this.props;
    return (
      <div className={[styles.searchRoot, searchQuery || this.state.active ? styles.active : ''].join(' ')}>
        <input
          className={styles.searchInput}
          placeholder={this.props.searchPlaceholder}
          aria-label={this.props.searchPlaceholder}
          value={searchQuery}
          onInput={this._handleOnChange}
          onFocus={this._onFocus}
          onBlur={this._onBlur}
          tabIndex={0}
          ref={node => {
            this._inputRef = node;
          }}
        />
        {searchQuery && (
          <A11yWrapper onClick={this._onClear}>
            <button aria-label={this.props.clearSearch} className={styles.clearIcon} tabIndex={0}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M6 12C9.31371 12 12 9.31371 12 6C12 2.68629 9.31371 0 6 0C2.68629 0 0 2.68629 0 6C0 9.31371 2.68629 12 6 12ZM3.38951 2.3502L3.46013 2.41264L5.99548 4.9504L8.53067 2.41264L8.60129 2.3502C8.89537 2.12125 9.32081 2.1418 9.59133 2.41199C9.8844 2.70471 9.88469 3.17958 9.59197 3.47265L7.05523 6.01165L9.59197 8.55189C9.88469 8.84496 9.8844 9.31983 9.59133 9.61255C9.32081 9.88275 8.89537 9.90329 8.60129 9.67434L8.53067 9.61191L5.99548 7.0729L3.46013 9.61191L3.38951 9.67434C3.09543 9.90329 2.66999 9.88275 2.39947 9.61255C2.1064 9.31983 2.10611 8.84496 2.39883 8.55189L4.93498 6.01165L2.39883 3.47265C2.10611 3.17958 2.1064 2.70471 2.39947 2.41199C2.66999 2.1418 3.09543 2.12125 3.38951 2.3502Z"
                  fill="white"
                  fill-opacity="0.7"
                />
              </svg>
            </button>
          </A11yWrapper>
        )}
      </div>
    );
  }
}

export const NavigationSearch = withText(translates)(NavigationSearchComponent);
