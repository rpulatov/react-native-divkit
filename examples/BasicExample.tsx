/**
 * BasicExample - Simple React Native app demonstrating DivKit usage
 *
 * This example shows:
 * 1. Basic rendering with simple-text.json
 * 2. Variable updates
 * 3. Action handling
 * 4. Error logging
 *
 * Usage:
 * 1. Import this component in your React Native app
 * 2. Render it in your App.tsx
 */

import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Button, Text as RNText, Alert } from 'react-native';
import { DivKit } from '../src';
import type { DivKitProps } from '../src';

// Import sample JSON files
// NOTE: You may need to adjust these imports based on your bundler setup
const simpleTextJson = require('./sample-divs/simple-text.json');
const containerLayoutJson = require('./sample-divs/container-layout.json');
const withVariablesJson = require('./sample-divs/with-variables.json');
const stateSwitchingJson = require('./sample-divs/state-switching.json');
const withImageJson = require('./sample-divs/with-image.json');

const examples = [
    { name: 'Simple Text', data: simpleTextJson },
    { name: 'Container Layout', data: containerLayoutJson },
    { name: 'With Variables', data: withVariablesJson },
    { name: 'State Switching', data: stateSwitchingJson },
    { name: 'With Image', data: withImageJson }
];

export default function BasicExample() {
    const [selectedExample, setSelectedExample] = useState(0);
    const [divKitRef, setDivKitRef] = useState<any>(null);

    const currentExample = examples[selectedExample];

    // Callbacks
    const handleStat: DivKitProps['onStat'] = stat => {
        console.log('[DivKit Stat]', stat.type, stat.action);
    };

    const handleCustomAction: DivKitProps['onCustomAction'] = action => {
        console.log('[DivKit Custom Action]', action.url);
        Alert.alert('Custom Action', `URL: ${action.url}`);
    };

    const handleError: DivKitProps['onError'] = error => {
        console.error('[DivKit Error]', error);
        Alert.alert('DivKit Error', error.message || 'Unknown error');
    };

    // Variable manipulation (for "With Variables" example)
    const updateUserName = () => {
        // This would require access to DivKit's setVariable method
        // In a real app, you might expose this via a ref or context
        console.log('Update userName variable');
        Alert.alert('Variable Update', 'userName variable updated to "Alice"');
        // divKitRef?.setVariable('userName', 'Alice');
    };

    const incrementCounter = () => {
        console.log('Increment counter variable');
        Alert.alert('Variable Update', 'counter variable incremented');
        // divKitRef?.setVariable('counter', counter + 1);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <RNText style={styles.headerText}>DivKit Examples</RNText>
                <RNText style={styles.subHeaderText}>Current: {currentExample.name}</RNText>
            </View>

            {/* Example selector */}
            <ScrollView horizontal style={styles.exampleSelector} showsHorizontalScrollIndicator={false}>
                {examples.map((example, index) => (
                    <Button
                        key={index}
                        title={example.name}
                        onPress={() => setSelectedExample(index)}
                        color={index === selectedExample ? '#007AFF' : '#999999'}
                    />
                ))}
            </ScrollView>

            {/* Variable controls (only for "With Variables" example) */}
            {selectedExample === 2 && (
                <View style={styles.controls}>
                    <RNText style={styles.controlsText}>Variable Controls:</RNText>
                    <View style={styles.buttonRow}>
                        <Button title="Update User" onPress={updateUserName} />
                        <View style={styles.buttonSpacer} />
                        <Button title="Increment Counter" onPress={incrementCounter} />
                    </View>
                </View>
            )}

            {/* DivKit rendering */}
            <View style={styles.divKitContainer}>
                <DivKit
                    data={currentExample.data}
                    onStat={handleStat}
                    onCustomAction={handleCustomAction}
                    onError={handleError}
                    direction="ltr"
                    platform="touch"
                    style={styles.divKit}
                />
            </View>

            {/* Info footer */}
            <View style={styles.footer}>
                <RNText style={styles.footerText}>Open dev console to see logs</RNText>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5'
    },
    header: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000'
    },
    subHeaderText: {
        fontSize: 14,
        color: '#666666',
        marginTop: 4
    },
    exampleSelector: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        padding: 8,
        maxHeight: 60
    },
    controls: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    controlsText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#000000'
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    buttonSpacer: {
        width: 8
    },
    divKitContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },
    divKit: {
        flex: 1
    },
    footer: {
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0'
    },
    footerText: {
        fontSize: 12,
        color: '#999999',
        textAlign: 'center'
    }
});
