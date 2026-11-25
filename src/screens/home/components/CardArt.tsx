import { isDark } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

// A quiet picture behind each "Your numbers" card, drawn in the card's own colour so it reads as part of
// the card, not on top of it. Each one hints at what the number is about. Kept to the right-hand side
// so the words stay clear. Original shapes, no images to load.
const O = isDark ? [0.1, 0.16, 0.24] : [0.14, 0.22, 0.32];

function Scene({ kind, c }: { kind: string; c: string }) {
  const [a, b, d] = O;
  switch (kind) {
    case 'nw': // a range of hills with a moon: what you own, building up over time
      return (
        <G>
          <Circle cx={250} cy={46} r={18} fill={c} fillOpacity={d} />
          <Path d="M120 190 L196 92 L236 136 L268 104 L340 190 Z" fill={c} fillOpacity={a} />
          <Path d="M170 190 L236 120 L276 150 L300 132 L340 190 Z" fill={c} fillOpacity={b} />
          <Path d="M210 190 Q262 150 310 166 L310 190 Z" fill={c} fillOpacity={d} />
        </G>
      );
    case 'score': // a dial seen from the side: how close you are to 100
      return (
        <G fill="none" stroke={c}>
          <Circle cx={290} cy={260} r={150} strokeWidth={16} strokeOpacity={a} />
          <Circle cx={290} cy={260} r={112} strokeWidth={16} strokeOpacity={b} />
          <Circle cx={290} cy={260} r={74} strokeWidth={16} strokeOpacity={d} />
        </G>
      );
    case 'vs': // a low sun with its bands: this month against the last
      return (
        <G>
          <Circle cx={250} cy={120} r={62} fill={c} fillOpacity={b} />
          <Circle cx={250} cy={120} r={38} fill={c} fillOpacity={d} />
          {[0, 1, 2, 3].map((k) => <Rect key={k} x={150} y={132 + k * 14} width={200} height={6} rx={3} fill={c} fillOpacity={a} />)}
        </G>
      );
    case 'kept': // a sprout: money kept is money that grows
      return (
        <G>
          <Ellipse cx={252} cy={190} rx={70} ry={22} fill={c} fillOpacity={a} />
          <Path d="M252 190 C252 150 254 120 262 92" stroke={c} strokeOpacity={d} strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d="M260 104 C286 70 320 74 326 84 C306 112 280 116 260 104 Z" fill={c} fillOpacity={d} />
          <Path d="M254 136 C226 110 196 118 190 128 C212 152 236 150 254 136 Z" fill={c} fillOpacity={b} />
          <Path d="M262 92 C254 64 262 42 276 34 C288 54 282 78 262 92 Z" fill={c} fillOpacity={b} />
        </G>
      );
    case 'jar': // coins stacking up toward the goal
      return (
        <G>
          {[[214, 4], [254, 7], [294, 10]].map(([x, n]) => Array.from({ length: n }, (_, k) => (
            <G key={`${x}-${k}`}>
              <Rect x={x - 22} y={176 - k * 12} width={44} height={12} fill={c} fillOpacity={k === n - 1 ? d : a} />
              <Ellipse cx={x} cy={176 - k * 12} rx={22} ry={6} fill={c} fillOpacity={k === n - 1 ? d : b} />
            </G>
          )))}
        </G>
      );
    case 'debt': // steps going down to a flag: the balance coming down to zero
      return (
        <G>
          <Path d="M150 80 H190 V108 H230 V136 H270 V164 H320 V190 H150 Z" fill={c} fillOpacity={a} />
          <Path d="M190 108 H230 V136 H270 V164 H320 V190 H190 Z" fill={c} fillOpacity={b} />
          <Path d="M286 164 V112" stroke={c} strokeOpacity={d} strokeWidth={3} strokeLinecap="round" />
          <Path d="M287 112 L314 122 L287 132 Z" fill={c} fillOpacity={d} />
        </G>
      );
    default:
      return <Circle cx={260} cy={150} r={70} fill={c} fillOpacity={a} />;
  }
}

export default function CardArt({ kind, color }: { kind: string; color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 320 190" preserveAspectRatio="xMaxYMax slice">
        <Scene kind={kind} c={color} />
      </Svg>
    </View>
  );
}
