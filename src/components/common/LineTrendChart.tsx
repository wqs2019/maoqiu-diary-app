import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

type LineTrendChartProps = {
  values: number[];
  color: string;
  height?: number;
  strokeWidth?: number;
  pointRadius?: number;
};

const LineTrendChart: React.FC<LineTrendChartProps> = ({
  values,
  color,
  height = 72,
  strokeWidth = 3,
  pointRadius = 2.5,
}) => {
  const width = 300;
  const padding = 8;

  const points = useMemo(() => {
    if (!values.length) {
      return [];
    }

    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = Math.max(maxValue - minValue, 1);

    return values.map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : padding + (index * (width - padding * 2)) / (values.length - 1);
      const y = padding + ((maxValue - value) / range) * (height - padding * 2);
      return { x, y };
    });
  }, [height, values]);

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <View style={[styles.container, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {polylinePoints ? (
          <>
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((point, index) => (
              <Circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r={pointRadius} fill={color} />
            ))}
          </>
        ) : null}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default LineTrendChart;
