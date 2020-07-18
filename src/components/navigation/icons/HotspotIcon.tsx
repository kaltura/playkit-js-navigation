import {h} from 'preact';

export interface props {
  color?: string;
}

export const HotspotIcon = (props: props) => {
  return (
    <svg width="12px" height="12px" viewBox="0 0 12 12" version="1.1">
      <g
        id="Icons/12/hotspot"
        stroke="none"
        stroke-width="1"
        fill="none"
        fill-rule="evenodd">
        <path
          d="M1.71356562,8.71826909 C1.32304133,9.10879339 1.32304133,9.74195836 1.71356562,10.1324827 C2.10408991,10.5230069 2.73725489,10.5230069 3.12777918,10.1324827 L3.83488597,9.42537588 C4.22541026,9.03485158 4.22541026,8.4016866 3.83488597,8.01116231 C3.44436167,7.62063802 2.8111967,7.62063802 2.4206724,8.01116231 L1.71356562,8.71826909 Z M8.07752665,2.35430806 C7.68700236,2.74483235 7.68700236,3.37799733 8.07752665,3.76852163 C8.46805094,4.15904592 9.10121592,4.15904592 9.49174022,3.76852163 L10.198847,3.06141484 C10.5893713,2.67089055 10.5893713,2.03772557 10.198847,1.64720128 C9.8083227,1.25667699 9.17515773,1.25667699 8.78463343,1.64720128 L8.07752665,2.35430806 Z M5,0 C4.48716416,0 4.06449284,0.38604019 4.00672773,0.883378875 L4,1 L4,2 C4,2.55228475 4.44771525,3 5,3 C5.51283584,3 5.93550716,2.61395981 5.99327227,2.11662113 L6,2 L6,1 C6,0.44771525 5.55228475,0 5,0 Z M5.03353,5.45134032 C5.14743877,5.10937025 5.51627947,4.92138528 5.85735876,5.03146414 L5.85735876,5.03146414 L11.5551412,6.87034864 C11.6520317,6.90161878 11.7399495,6.95530689 11.8117885,7.02707252 C12.0646771,7.279709 12.0624384,7.69156431 11.8067877,7.94697779 L11.8067877,7.94697779 L10.9731056,8.77988616 C10.8601518,8.89273517 10.8532121,9.07321331 10.9572561,9.19207926 L10.9572561,9.19207926 L11.6344936,9.96391024 C12.0165361,10.4471237 11.9806364,11.154337 11.5294068,11.6051503 L11.5294068,11.6051503 L11.501519,11.6331064 C11.0155297,12.1185479 10.231919,12.1228281 9.75122702,11.642618 L9.75122702,11.642618 L9.18153853,10.9926766 C9.06505218,10.8755013 8.87482944,10.876215 8.75666414,10.9942706 L8.75666414,10.9942706 L7.94987827,11.8003077 C7.87725549,11.8728631 7.78874887,11.9275149 7.69151269,11.9598454 C7.34921645,12.0736569 6.98239748,11.8896902 6.87219958,11.5489442 L6.87219958,11.5489442 L5.03132653,5.85672976 C4.98881738,5.72528603 4.98958938,5.58325624 5.03353,5.45134032 Z M2,4 C2.55228475,4 3,4.44771525 3,5 C3,5.55228475 2.55228475,6 2,6 L2,6 L1,6 C0.44771525,6 0,5.55228475 0,5 C0,4.44771525 0.44771525,4 1,4 L1,4 Z"
          id="Shape"
          fill={props.color}></path>
      </g>
    </svg>
  );
};

HotspotIcon.defaultProps = {
  color: '#FFFFFF',
};
