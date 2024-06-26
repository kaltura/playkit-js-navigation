import {h} from 'preact';
import * as styles from './autoscroll-button.scss';
import {A11yWrapper, OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {ui} from '@playkit-js/kaltura-player-js';
const {preacti18n} = ui;

const {withText, Text} = preacti18n;
const {Tooltip} = ui.components;

interface AutoscrollButtonProps {
  onClick: OnClick;
  isAutoScrollEnabled: boolean;
  setAutoscrollButtonRef?: (node: HTMLDivElement | null) => void;
  autoScrollLabel?: string;
}

const translates = {
  autoScrollLabel: <Text id="transcript.auto_scroll">Resume AutoScroll</Text>
};

export const AutoscrollButton = withText(translates)(
  ({onClick, isAutoScrollEnabled, setAutoscrollButtonRef = () => {}, autoScrollLabel}: AutoscrollButtonProps) => {
    return (
      <A11yWrapper onClick={onClick}>
        <div
          className={`${styles.autoscrollButton} ${isAutoScrollEnabled ? '' : styles.autoscrollButtonVisible}`}
          tabIndex={isAutoScrollEnabled ? -1 : 1}
          aria-label={autoScrollLabel}
          ref={setAutoscrollButtonRef}>
          <Tooltip label={autoScrollLabel!} type="left">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6.29289 15.2929C6.65338 14.9324 7.22061 14.9047 7.6129 15.2097L7.70711 15.2929L12 19.585L16.2929 15.2929C16.6534 14.9324 17.2206 14.9047 17.6129 15.2097L17.7071 15.2929C18.0676 15.6534 18.0953 16.2206 17.7903 16.6129L17.7071 16.7071L12.7071 21.7071C12.3466 22.0676 11.7794 22.0953 11.3871 21.7903L11.2929 21.7071L6.29289 16.7071C5.90237 16.3166 5.90237 15.6834 6.29289 15.2929Z"
                fill="white"
              />
              <path
                d="M17.7071 8.70711C17.3466 9.06759 16.7794 9.09532 16.3871 8.7903L16.2929 8.70711L12 4.415L7.70711 8.70711C7.34662 9.06759 6.77939 9.09532 6.3871 8.79029L6.29289 8.70711C5.93241 8.34662 5.90468 7.77939 6.2097 7.3871L6.29289 7.29289L11.2929 2.29289C11.6534 1.93241 12.2206 1.90468 12.6129 2.2097L12.7071 2.29289L17.7071 7.29289C18.0976 7.68342 18.0976 8.31658 17.7071 8.70711Z"
                fill="white"
              />
              <rect x="10" y="10" width="4" height="4" rx="2" fill="white" />
            </svg>
          </Tooltip>
        </div>
      </A11yWrapper>
    );
  }
);
