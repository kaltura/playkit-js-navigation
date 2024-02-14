import {h, Component} from 'preact';
import {preacti18n} from '@playkit-js/playkit-js-ui';
import {InputField} from '@playkit-js/common/dist/components/input-field';
import {debounce} from '@playkit-js/common/dist/utils-common/utils';

const {withText, Text} = preacti18n;

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

// TODO: UX expert have to finetune this value
const DEBOUNCE_TIMEOUT = 300;

class NavigationSearchComponent extends Component<SearchProps> {
  private _inputField: InputField | null = null;
  private _debouncedOnChange: (value: string) => void;
  constructor(props: SearchProps) {
    super(props);
    this._debouncedOnChange = debounce(props.onChange, DEBOUNCE_TIMEOUT);
  }
  shouldComponentUpdate(nextProps: Readonly<SearchProps>) {
    const {searchQuery, kitchenSinkActive} = this.props;
    if (searchQuery !== nextProps.searchQuery || kitchenSinkActive !== nextProps.kitchenSinkActive) {
      return true;
    }
    return false;
  }
  componentDidUpdate(previousProps: Readonly<SearchProps>): void {
    const {kitchenSinkActive, toggledWithEnter} = this.props;
    if (!previousProps.kitchenSinkActive && kitchenSinkActive && toggledWithEnter) {
      this._inputField?.setFocus({preventScroll: true});
    }
  }

  render() {
    const {searchQuery} = this.props;
    return (
      <InputField
        value={searchQuery}
        placeholder={this.props.searchPlaceholder}
        clearSearchLabel={this.props.clearSearch}
        onChange={this._debouncedOnChange}
        ref={node => {
          this._inputField = node;
        }}
      />
    );
  }
}

export const NavigationSearch = withText(translates)(NavigationSearchComponent);
