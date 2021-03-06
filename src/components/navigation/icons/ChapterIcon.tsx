import {h} from 'preact';

export interface Props {
  color?: string;
}

export const ChapterIcon = (props: Props) => {
  return (
    <svg width="12px" height="12px" viewBox="0 0 12 12" version="1.1">
      <g
        id="Icons/12/chapter"
        stroke="none"
        stroke-width="1"
        fill="none"
        fill-rule="evenodd">
        <path
          d="M10.4444444,0 C10.7512693,0 11,0.200670434 11,0.448209958 L11,11.5517852 C11,11.7993248 10.7512693,12 10.4444444,12 C10.308381,12 10.1770485,11.9597107 10.0753534,11.8867815 L6.36909102,9.2288876 C6.15859879,9.07793605 5.84140121,9.07793605 5.63090898,9.2288876 L1.92464658,11.8867815 C1.69532282,12.0512378 1.3441715,12.0345731 1.14032816,11.8495597 C1.04993254,11.7675144 1,11.6615582 1,11.5517852 L1,0.448209958 C1,0.200670434 1.24873069,0 1.55555556,0 L10.4444444,0 Z"
          id="Path"
          fill={props.color}></path>
      </g>
    </svg>
  );
};

ChapterIcon.defaultProps = {
  color: '#FFFFFF',
};
