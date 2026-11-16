import { Easing } from 'react-native-reanimated';

// One rhythm for every animation in Corpus (ui-ux-pro-max: motion-consistency, spring-physics,
// exit-faster-than-enter). Every motion answers something you did; Reduce Motion turns them off.
export const Spring = {
  press: { damping: 18, stiffness: 420, mass: 0.6 },   // finger down / up
  snappy: { damping: 22, stiffness: 260, mass: 0.9 },  // tab pill, toggles, pickers
  sheet: { damping: 26, stiffness: 240, mass: 1 },     // sheets arriving
};
export const Duration = { enter: 260, exit: 170, number: 650 };
export const EaseOut = Easing.out(Easing.cubic);
export const EaseIn = Easing.in(Easing.cubic);
export const PRESS_SCALE = 0.97;
