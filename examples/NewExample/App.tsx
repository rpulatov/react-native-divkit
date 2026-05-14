import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import DivKit from the library
// In a real project, you would use:
// import { DivKit } from 'react-native-divkit';
import {
  DivKit,
  createGlobalVariablesController,
  createVariable,
} from '../../src';
import type { DivKitProps } from '../../src';
import { useCallback, useMemo, useRef, useState } from 'react';

import startJson from './sample-divs/start.json';
import storiesJson from './sample-divs/fullscreen-stories.json';
import containerLayoutJson from './sample-divs/container-layout.json';
import withVariablesJson from './sample-divs/with-variables.json';
import stateSwitchingJson from './sample-divs/state-switching.json';
import withImageJson from './sample-divs/with-image.json';
import withActionsJson from './sample-divs/with-actions.json';
import tapAnimationsJson from './sample-divs/tap-animations.json';
import pagerWithIndicatorJson from './sample-divs/pager-with-indicator.json';
import transitionChangeJson from './sample-divs/transition_change.json';
import transitionInOutVisibilityJson from './sample-divs/transition_in_out_visibility.json';

import type { DivJson } from '../../src';

// Example configurations
const examples = [
  {
    name: 'Start',
    data: startJson,
    description: 'Intro to templates and actions',
  },
  {
    name: 'Stories',
    data: storiesJson,
    description: 'Complex layout with templates and variables',
  },
  {
    name: 'Container',
    data: containerLayoutJson,
    description: 'Container layouts',
  },
  {
    name: 'Variables',
    data: withVariablesJson,
    description: 'Variable substitution',
  },
  { name: 'State', data: stateSwitchingJson, description: 'State switching' },
  { name: 'Image', data: withImageJson, description: 'Image loading' },
  { name: 'Actions', data: withActionsJson, description: 'Action handling' },
  {
    name: 'Tap Animations',
    data: tapAnimationsJson,
    description: 'Tap animations',
  },
  {
    name: 'Pager + Indicator',
    data: pagerWithIndicatorJson,
    description: 'Pager with indicator dots',
  },
  {
    name: 'Transition Change',
    data: transitionChangeJson,
    description:
      'transition_change (change_bounds) — FLIP-анимация изменений размеров/позиций',
  },
  {
    name: 'Transition In/Out Visibility',
    data: transitionInOutVisibilityJson,
    description: 'transition_in / transition_out по смене visibility',
  },
];

const getExampleTestID = (name: string) =>
  `example-tab-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

type AppInitialProps = {
  snapshotMode?: boolean;
  initialExample?: string;
};

function AppContent({ snapshotMode = false, initialExample }: AppInitialProps) {
  const [selectedExample, setSelectedExample] = useState(() => {
    const initialIndex = examples.findIndex(
      example => example.name === initialExample,
    );

    return initialIndex >= 0 ? initialIndex : 0;
  });
  const [logs, setLogs] = useState<string[]>([]);
  const logCounterRef = useRef(0);

  const currentExample = examples[selectedExample];

  // Global variables controller — shared between two DivKit instances
  const globalController = useMemo(() => {
    const controller = createGlobalVariablesController();
    controller.setVariable(createVariable('safeAreaTop', 'integer', 50));
    controller.setVariable(createVariable('scaleFactor', 'number', 0.8));
    return controller;
  }, []);

  // Add log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${++logCounterRef.current}] ${timestamp}: ${message}`;
    setLogs(prev => [...prev.slice(-9), logEntry]);
    console.log(logEntry);
  }, []);

  // Callbacks
  const handleStat = useCallback<NonNullable<DivKitProps['onStat']>>(
    stat => {
      addLog(`Stat: ${stat.type} - ${stat.action.log_id}`);
    },
    [addLog],
  );

  const handleCustomAction = useCallback<
    NonNullable<DivKitProps['onCustomAction']>
  >(
    action => {
      addLog(`Custom Action: ${action.url}`);
      Alert.alert('Custom Action', `URL: ${action.url}`);
    },
    [addLog],
  );

  const handleError = useCallback<NonNullable<DivKitProps['onError']>>(
    error => {
      addLog(`Error: ${error.message}`);
      console.error('[DivKit Error]', error);
    },
    [addLog],
  );

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    logCounterRef.current = 0;
  }, []);

  const divKitView = (
    <DivKit
      key={selectedExample} // Force re-mount on example change
      data={currentExample.data as DivJson}
      onStat={handleStat}
      onCustomAction={handleCustomAction}
      onError={handleError}
      direction="ltr"
      platform="touch"
      style={snapshotMode ? styles.divKitSnapshot : styles.divKit}
      globalVariablesController={globalController}
      typefaceProvider={(fontFamily, opts) => {
        if (fontFamily === 'display') return '';
        if (fontFamily === 'text') {
          return opts?.fontWeight && opts.fontWeight >= 700
            ? 'MyCustomText-Bold'
            : 'MyCustomText-Regular';
        }
        return '';
      }}
    />
  );

  if (snapshotMode) {
    return (
      <ScrollView
        testID="divkit-snapshot-area"
        style={styles.snapshotContainer}
        contentContainerStyle={styles.snapshotContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {divKitView}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <RNText style={styles.headerText}>DivKit Examples</RNText>
        <RNText style={styles.subHeaderText}>
          {currentExample.name}: {currentExample.description}
        </RNText>
      </View>

      {/* Example selector */}
      <ScrollView
        testID="example-selector"
        horizontal
        style={styles.exampleSelector}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContent}
      >
        {examples.map((example, index) => (
          <TouchableOpacity
            key={index}
            testID={getExampleTestID(example.name)}
            accessibilityLabel={`Example ${example.name}`}
            style={[
              styles.selectorButton,
              index === selectedExample && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedExample(index)}
          >
            <RNText
              style={[
                styles.selectorText,
                index === selectedExample && styles.selectorTextActive,
              ]}
            >
              {example.name}
            </RNText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* DivKit rendering */}
      <ScrollView
        testID="divkit-snapshot-area"
        style={styles.divKitContainer}
        contentContainerStyle={styles.divKitContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {divKitView}
      </ScrollView>

      {/* Log panel */}
      <View style={styles.logPanel}>
        <View style={styles.logHeader}>
          <RNText style={styles.logTitle}>Event Log</RNText>
          <TouchableOpacity onPress={clearLogs}>
            <RNText style={styles.clearButton}>Clear</RNText>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logScroll}>
          {logs.length === 0 ? (
            <RNText style={styles.logPlaceholder}>
              Interact with components to see events...
            </RNText>
          ) : (
            logs.map((log, index) => (
              <RNText key={index} style={styles.logEntry}>
                {log}
              </RNText>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  snapshotContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  snapshotContentContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  subHeaderText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  exampleSelector: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    maxHeight: 52,
  },
  selectorContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  selectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    marginRight: 8,
  },
  selectorButtonActive: {
    backgroundColor: '#007AFF',
  },
  selectorText: {
    fontSize: 14,
    color: '#666666',
  },
  selectorTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  divKitContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  divKitContentContainer: {
    flexGrow: 1,
  },
  divKit: {
    flex: 1,
  },
  divKitSnapshot: {
    flex: 1,
  },
  logPanel: {
    height: 140,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  logTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  clearButton: {
    fontSize: 12,
    color: '#007AFF',
  },
  logScroll: {
    flex: 1,
    padding: 8,
  },
  logPlaceholder: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  logEntry: {
    fontSize: 11,
    color: '#00FF00',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default function App(props: AppInitialProps) {
  return (
    <SafeAreaProvider>
      <AppContent {...props} />
    </SafeAreaProvider>
  );
}
