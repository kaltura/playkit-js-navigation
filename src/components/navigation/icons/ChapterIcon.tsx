import {h} from 'preact';

export interface Props {
  color?: string;
}

export const ChapterIcon = (props: Props) => {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M4 4.5C4 3.94772 4.44772 3.5 5 3.5H11C11.5523 3.5 12 3.94772 12 4.5V13.5C12 14.324 11.0592 14.7944 10.4 14.3L8.6 12.95C8.24444 12.6833 7.75556 12.6833 7.4 12.95L5.6 14.3C4.94076 14.7944 4 14.324 4 13.5V4.5Z"
        fill={props.color}
      />
    </svg>
  );
};

ChapterIcon.defaultProps = {
  color: '#FFFFFF'
};
