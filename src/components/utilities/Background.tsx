import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import type { Background as BackgroundType, RadialBackground } from '../../types/background';

export interface BackgroundProps {
    layers?: BackgroundType[];
    style?: ViewStyle;
    width?: number;
    height?: number;
}

const RadialGradientLayer = ({ layer }: { layer: RadialBackground }) => {
    // Default to 50% 50% if not specified
    let cx = '50%';
    let cy = '50%';
    
    if (layer.center_x) {
        if (layer.center_x.type === 'fixed') {
            cx = `${layer.center_x.value}`;
        } else {
            cx = `${layer.center_x.value * 100}%`;
        }
    }
    
    if (layer.center_y) {
        if (layer.center_y.type === 'fixed') {
            cy = `${layer.center_y.value}`;
        } else {
            cy = `${layer.center_y.value * 100}%`;
        }
    }

    // Colors
    // If colors array provided, distribute evenly
    // If color_map provided, use it
    let stops: JSX.Element[] = [];

    if (layer.colors) {
        stops = layer.colors.map((color, index) => (
            <Stop
                key={index}
                offset={index / (layer.colors!.length - 1)}
                stopColor={color}
                stopOpacity={1}
            />
        ));
    } else if (layer.color_map) {
        stops = layer.color_map.map((point, index) => (
            <Stop
                key={index}
                offset={point.position}
                stopColor={point.color}
                stopOpacity={1}
            />
        ));
    }

    // Radius
    // DivKit defaults: farthest_corner
    // SVG RadialGradient rx ry defaults to 50%
    // To support "farthest_corner" accurately we might need complex math or just use a large radius like 100%?
    // For now, let's stick to 50% (containing circle) or 100%?
    // A safe default for radial gradients covering a view is often 50% rx/ry if the center is center.
    // If the center is custom, we might need adjustments.
    // Let's use '50%' for rx/ry which is standard for "closest-side" sort of.
    // Specifying units="userSpaceOnUse" allows pixel values.
    // Specifying units="objectBoundingBox" (default) allows percentages.
    
    // We'll use objectBoundingBox
    const rx = '50%';
    const ry = '50%';

    return (
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
                <RadialGradient
                    id="grad"
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fx={cx}
                    fy={cy}
                    gradientUnits="objectBoundingBox"
                >
                    {stops}
                </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
        </Svg>
    );
};

export const Background = ({ layers, style }: BackgroundProps) => {
    if (!layers || layers.length === 0) return null;

    return (
        <View style={[StyleSheet.absoluteFill, style, { zIndex: -1, overflow: 'hidden' }]} pointerEvents="none">
            {layers.map((layer, index) => {
                if (layer.type === 'solid') {
                    return (
                        <View
                            key={index}
                            style={[StyleSheet.absoluteFill, { backgroundColor: layer.color }]}
                        />
                    );
                }
                if (layer.type === 'radial_gradient') {
                    return (
                        <View key={index} style={StyleSheet.absoluteFill}>
                            <RadialGradientLayer layer={layer} />
                        </View>
                    );
                }
                return null;
            })}
        </View>
    );
};
