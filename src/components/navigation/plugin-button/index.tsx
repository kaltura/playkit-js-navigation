import {h} from 'preact';
import * as styles from './plugin-button.scss';
import {icons} from '../../icons';
import {A11yWrapper, OnClick} from '../../a11y-wrapper';

const {Tooltip, Icon} = KalturaPlayer.ui.components;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

const translates = ({isActive}: PluginButtonProps) => {
  return {
    label: isActive ? <Text id="navigation.hide_plugin">Hide Navigation</Text> : <Text id="navigation.show_plugin">Show Navigation</Text>
  };
};

interface PluginButtonProps {
  isActive: boolean;
  onClick: OnClick;
  label?: string;
}

export const PluginButton = withText(translates)(({isActive, onClick, ...otherProps}: PluginButtonProps) => {
  return (
    <Tooltip label={otherProps.label} type="bottom">
      <A11yWrapper onClick={onClick}>
        <button aria-label={otherProps.label} className={[styles.pluginButton, isActive ? styles.active : ''].join(' ')}>
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
