import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface UnknownProps {
    type: string;
    message?: string;
}

/**
 * Unknown component - fallback for unsupported component types
 * Renders a placeholder with error message
 */
export function Unknown({ type, message }: UnknownProps) {
    if (__DEV__) {
        console.warn(`[DivKit] Unknown component type: "${type}"${message ? ` - ${message}` : ''}`);
    }

    // Only show visual error in DEV mode
    if (__DEV__) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Unknown Component</Text>
                <Text style={styles.type}>Type: {type}</Text>
                {message && <Text style={styles.message}>{message}</Text>}
            </View>
        );
    }

    // In production, render nothing
    return null;
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        margin: 8,
        backgroundColor: '#fff3cd',
        borderWidth: 1,
        borderColor: '#ffc107',
        borderRadius: 4,
        borderStyle: 'dashed'
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 4
    },
    type: {
        fontSize: 12,
        color: '#856404',
        fontFamily: 'monospace'
    },
    message: {
        fontSize: 11,
        color: '#856404',
        marginTop: 4,
        fontStyle: 'italic'
    }
});
