import {h} from 'preact';
import {ui} from '@playkit-js/kaltura-player-js';
import * as styles from './close-button.scss';
import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {icons} from '../icons';
const {Icon} = KalturaPlayer.ui.components;

interface CloseButtonProps {
  onClick: () => void;
  closeButtonLabel?: string;
}

const {withText, Text} = ui.preacti18n;

const translates = {
  closeButtonLabel: <Text id="navigation.hide_plugin">Hide Navigation</Text>
};

export const CloseButton = withText(translates)((props: CloseButtonProps) => (
  <A11yWrapper onClick={props.onClick}>
    <button
      className={[styles.closeButtonIcon, 'kaltura-navigation__close-button'].join(' ')}
      tabIndex={0}
      aria-label={props.closeButtonLabel}
      data-testid="navigation_closeButton">
      <Icon
        id="navigation-plugin-close-button"
        height={icons.BigSize}
        width={icons.BigSize}
        viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`}
        path={icons.CLOSE_ICON}
      />
    </button>
  </A11yWrapper>
));
