import {h} from 'preact';
import {ui} from '@playkit-js/kaltura-player-js';
import * as styles from './plugin-button.scss';
import {icons} from '../../icons';
import {A11yWrapper, OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';

const {Tooltip, Icon} = KalturaPlayer.ui.components;
const {withText, Text} = ui.preacti18n;

const translates = ({isActive}: PluginButtonProps) => {
  return {
    label: isActive ? <Text id="navigation.hide_plugin">Hide Navigation</Text> : <Text id="navigation.show_plugin">Show Navigation</Text>
  };
};

interface PluginButtonProps {
  isActive: boolean;
  onClick: OnClick;
  setRef: (ref: HTMLButtonElement | null) => void;
  label?: string;
}

export const PluginButton = withText(translates)(({isActive, onClick, setRef, ...otherProps}: PluginButtonProps) => {
  return (
    <Tooltip label={otherProps.label} type="bottom">
      <A11yWrapper onClick={onClick}>
        <button
          ref={node => {
            setRef(node);
          }}
          aria-label={otherProps.label}
          className={[ui.style.upperBarIcon, styles.pluginButton, isActive ? styles.active : ''].join(' ')}
          data-testid={'navigation_pluginButton'}>
          <Icon
            id="navigation-plugin-button"
            height={icons.BigSize}
            width={icons.BigSize}
            viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`}
            path={icons.PLUGIN_ICON}
          />
        </button>
      </A11yWrapper>
    </Tooltip>
  );
});
