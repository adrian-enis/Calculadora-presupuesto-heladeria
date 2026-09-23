import Svg, { Path, Rect } from 'react-native-svg';

type Props = { color: string; size?: number };

// SVGs de stitch_helader_a_dibuluc_cost_tracker/dashboard_helader_a_dibuluc —
// reemplazan MaterialIcons en el tab bar: ese font-icon se mide con ancho
// colapsado (~7px) en Expo Go 57.0.9 dentro de bottom-tabs animado con
// Reanimated/Fabric (bug del cliente, no del código). SVG no depende de
// medición de texto/font, esquiva el bug.
export function HomeIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path fill={color} stroke="none" d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H14v-6h-4v6H3.5a.5.5 0 0 1-.5-.5z" />
    </Svg>
  );
}

export function HistoryIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 12a9 9 0 1 0 3-6.7" />
      <Path d="M3 4v5h5" />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function InsumosIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={5} width={16} height={15} rx={1} />
      <Path d="M4 8h16" />
      <Path d="M9 5V3h6v2" />
    </Svg>
  );
}

export function RecetasIcon({ color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 0 5 22z" />
      <Path d="M5 4.5V22" />
      <Path d="M8.5 6h7" />
      <Path d="M8.5 9h7" />
    </Svg>
  );
}
