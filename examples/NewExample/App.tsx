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
import { DivKit } from '../../src';
import type { DivKitProps } from '../../src';
import { useCallback, useRef, useState } from 'react';

// Sample DivKit JSON configurations
const simpleTextJson = {
  card: {
    log_id: 'simple_text',
    states: [
      {
        state_id: 0,
        div: {
          type: 'text',
          text: 'Hello, DivKit!',
          font_size: 34,
          font_weight: 'bold',
          text_color: '#000000',
          text_alignment_horizontal: 'center',
          paddings: { top: 16, bottom: 16, left: 16, right: 16 },
        },
      },
    ],
  },
};

const startJson = {
  templates: {
    tutorialCard: {
      type: 'container',
      items: [
        {
          type: 'text',
          font_size: 21,
          font_weight: 'bold',
          margins: {
            bottom: 16,
          },
          $text: 'title',
        },
        {
          type: 'text',
          font_size: 16,
          margins: {
            bottom: 16,
          },
          $text: 'body',
        },
        {
          type: 'container',
          $items: 'links',
        },
      ],
      margins: {
        bottom: 6,
      },
      orientation: 'vertical',
      paddings: {
        top: 10,
        bottom: 0,
        left: 30,
        right: 30,
      },
    },
    link: {
      type: 'text',
      actions: [
        {
          $url: 'link',
          $log_id: 'log',
        },
      ],
      font_size: 14,
      margins: {
        bottom: 2,
      },
      text_color: '#0000ff',
      underline: 'single',
      $text: 'link_text',
    },
  },
  card: {
    log_id: 'div2_sample_card',
    states: [
      {
        state_id: 0,
        div: {
          type: 'container',
          items: [
            {
              type: 'image',
              image_url: 'https://yastatic.net/s3/home/divkit/logo.png',
              aspect: {
                ratio: 3.9,
              },
              margins: {
                top: 10,
                right: 60,
                bottom: 10,
                left: 60,
              },
            },
            {
              type: 'tutorialCard',
              title: 'DivKit',
              body: 'What is DivKit and why did I get here?\n\nDivKit is a new Yandex open source framework that helps speed up mobile development.\n\niOS, Android, Web — update the interface of any applications directly from the server, without publishing updates.\n\nFor 5 years we have been using DivKit in the Yandex search app, Alice, Edadeal, Market, and now we are sharing it with you.\n\nThe source code is published on GitHub under the Apache 2.0 license.',
              links: [
                {
                  type: 'link',
                  link_text: 'More about DivKit',
                  link: 'https://divkit.tech/',
                  log: 'landing',
                },
                {
                  type: 'link',
                  link_text: 'Documentation',
                  link: 'https://divkit.tech/doc/',
                  log: 'docs',
                },
                {
                  type: 'link',
                  link_text: 'EN Community chat',
                  link: 'https://t.me/divkit_community_en',
                  log: 'tg_en_chat',
                },
                {
                  type: 'link',
                  link_text: 'RU Community chat',
                  link: 'https://t.me/divkit_community_ru',
                  log: 'tg_ru_chat',
                },
              ],
            },
          ],
        },
      },
    ],
  },
};

const storiesJson = {
  card: {
    log_id: 'div2_sample_card',
    states: [
      {
        state_id: 0,
        div: {
          type: 'container',
          orientation: 'vertical',
          paddings: {
            left: 20,
            right: 20,
          },
          background: [
            {
              type: 'radial_gradient',
              colors: ['#000000', '#555555'],
            },
          ],
          items: [
            {
              text: 'Все удобно',
              type: 'text',
              width: {
                type: 'wrap_content',
                constrained: true,
              },
              margins: {
                bottom: 30,
              },
              font_size: 36,
              text_color: '#ffffff',
              alignment_vertical: 'center',
              alignment_horizontal: 'left',
            },
            {
              type: 'container',
              items: [
                {
                  type: '_template_list_item',
                  list_text: 'Авторская кухня от лучших шефов',
                  list_color: '#fff50a',
                  list_text_size: 24,
                  list_font_weight: 'medium',
                  alignment_vertical: 'center',
                  alignment_horizontal: 'left',
                },
                {
                  type: '_template_list_item',
                  list_text: 'Свежие морепродукты и локальные продукты',
                  list_color: '#fff50a',
                  list_text_size: 24,
                  list_font_weight: 'medium',
                  alignment_vertical: 'center',
                  alignment_horizontal: 'left',
                },
                {
                  type: '_template_list_item',
                  list_text: 'Вид на море, горы и виноградники',
                  list_color: '#fff50a',
                  list_text_size: 24,
                  list_font_weight: 'medium',
                  alignment_vertical: 'center',
                  alignment_horizontal: 'left',
                },
                {
                  type: '_template_list_item',
                  list_text: 'Рестораны для особых вечеров и путешествий',
                  list_color: '#fff50a',
                  list_text_size: 24,
                  list_font_weight: 'medium',
                  alignment_vertical: 'center',
                  alignment_horizontal: 'left',
                },
              ],
              width: {
                type: 'match_parent',
              },
              height: {
                type: 'wrap_content',
              },
              alignment_vertical: 'center',
              alignment_horizontal: 'left',
              content_alignment_vertical: 'center',
              content_alignment_horizontal: 'left',
            },
            {
              text: 'Вкус, атмосфера и крымское гостеприимство',
              type: 'text',
              width: {
                type: 'match_parent',
              },
              margins: {
                top: 20,
              },
              font_size: 26,
              text_color: '#ffffff',
              alignment_vertical: 'center',
              alignment_horizontal: 'center',
            },
          ],
          visibility_action: {
            log_id: 'visible',
          },
          content_alignment_vertical: 'center',
          content_alignment_horizontal: 'center',
        },
      },
    ],
  },
  templates: {
    _template_list_item: {
      type: 'container',
      items: [
        {
          type: 'image',
          width: {
            type: 'fixed',
            unit: 'sp',
            value: 24,
          },
          height: {
            type: 'fixed',
            unit: 'sp',
            value: 24,
          },
          margins: {
            top: 2,
            right: 12,
            bottom: 2,
          },
          image_url:
            'https://yastatic.net/s3/home/div/div_fullscreens/hyphen.4.png',
          $tint_color: 'list_color',
        },
        {
          type: 'text',
          $text: 'list_text',
          width: {
            type: 'match_parent',
          },
          $font_size: 'list_text_size',
          $text_color: 'list_color',
          line_height: 32,
          $font_weight: 'list_font_weight',
        },
      ],
      orientation: 'horizontal',
    },
  },
};

const containerLayoutJson = {
  card: {
    log_id: 'container_layout',
    states: [
      {
        state_id: 0,
        div: {
          type: 'container',
          orientation: 'vertical',
          background: [{ type: 'solid', color: '#bbfec3' }],
          paddings: { top: 16, bottom: 16, left: 16, right: 16 },
          items: [
            {
              type: 'text',
              text: 'Header',
              font_size: 20,
              font_weight: 'bold',
              text_color: '#333333',
              margins: { bottom: 12 },
              background: [{ type: 'solid', color: '#1a74a8' }],
            },
            {
              type: 'container',
              orientation: 'horizontal',
              background: [{ type: 'solid', color: '#12415c' }],
              items: [
                {
                  type: 'text',
                  text: 'Left',
                  text_color: '#007AFF',
                  width: { type: 'fixed', value: 100 },
                  background: [{ type: 'solid', color: '#29aaf5' }],
                },
                {
                  type: 'text',
                  text: 'Right',
                  text_color: '#FF3B30',
                  width: { type: 'fixed', value: 100 },
                  background: [{ type: 'solid', color: '#341aa8' }],
                },
              ],
            },
            {
              type: 'text',
              text: 'Footer',
              font_size: 14,
              text_color: '#999999',
              margins: { top: 12 },
            },
          ],
        },
      },
    ],
  },
};

const withVariablesJson = {
  card: {
    log_id: 'with_variables',
    states: [
      {
        state_id: 0,
        div: {
          type: 'container',
          orientation: 'vertical',
          paddings: { top: 16, bottom: 16, left: 16, right: 16 },
          items: [
            {
              type: 'text',
              text: 'Hello, @{userName}!',
              font_size: 20,
              text_color: '@{textColor}',
            },
            {
              type: 'text',
              text: 'Counter: @{counter}',
              font_size: 16,
              text_color: '#666666',
              margins: { top: 8 },
            },
          ],
        },
      },
    ],
    variables: [
      { type: 'string', name: 'userName', value: 'World' },
      { type: 'color', name: 'textColor', value: '#007AFF' },
      { type: 'integer', name: 'counter', value: 0 },
    ],
  },
};

const stateSwitchingJson = {
  card: {
    log_id: 'state_switching',
    states: [
      {
        state_id: 0,
        div: {
          type: 'state',
          id: 'my_state',
          default_state_id: 'state1',
          states: [
            {
              state_id: 'state1',
              div: {
                type: 'container',
                orientation: 'vertical',
                background: [{ type: 'solid', color: '#E3F2FD' }],
                paddings: { top: 24, bottom: 24, left: 16, right: 16 },
                items: [
                  {
                    type: 'text',
                    text: 'State 1 - Blue',
                    font_size: 18,
                    text_color: '#1976D2',
                    text_alignment_horizontal: 'center',
                  },
                  {
                    type: 'text',
                    text: 'Tap to switch',
                    font_size: 14,
                    text_color: '#666666',
                    text_alignment_horizontal: 'center',
                    margins: { top: 8 },
                  },
                ],
                actions: [
                  {
                    log_id: 'switch_to_state2',
                    typed: {
                      type: 'set_state',
                      state_id: 'my_state',
                      temporary_state_id: 'state2',
                    },
                  },
                ],
              },
            },
            {
              state_id: 'state2',
              div: {
                type: 'container',
                orientation: 'vertical',
                background: [{ type: 'solid', color: '#FFEBEE' }],
                paddings: { top: 24, bottom: 24, left: 16, right: 16 },
                items: [
                  {
                    type: 'text',
                    text: 'State 2 - Red',
                    font_size: 18,
                    text_color: '#D32F2F',
                    text_alignment_horizontal: 'center',
                  },
                  {
                    type: 'text',
                    text: 'Tap to switch back',
                    font_size: 14,
                    text_color: '#666666',
                    text_alignment_horizontal: 'center',
                    margins: { top: 8 },
                  },
                ],
                actions: [
                  {
                    log_id: 'switch_to_state1',
                    typed: {
                      type: 'set_state',
                      state_id: 'my_state',
                      temporary_state_id: 'state1',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
};

const withImageJson = {
  card: {
    log_id: 'with_image',
    states: [
      {
        state_id: 0,
        div: {
          type: 'container',
          orientation: 'vertical',
          content_alignment_horizontal: 'center',
          paddings: { top: 16, bottom: 16, left: 16, right: 16 },
          items: [
            {
              type: 'image',
              image_url: 'https://picsum.photos/300/200',
              width: { type: 'fixed', value: 300 },
              height: { type: 'fixed', value: 200 },
              scale: 'fill',
              border: { corner_radius: 12 },
            },
            {
              type: 'text',
              text: 'Random Image from Picsum',
              font_size: 14,
              text_color: '#666666',
              text_alignment_horizontal: 'center',
              margins: { top: 12 },
            },
          ],
        },
      },
    ],
  },
};

const withActionsJson = {
  card: {
    log_id: 'with_actions',
    states: [
      {
        state_id: 0,
        div: {
          type: 'container',
          orientation: 'vertical',
          paddings: { top: 16, bottom: 16, left: 16, right: 16 },
          items: [
            {
              type: 'text',
              text: 'Tap me for custom action',
              font_size: 16,
              text_color: '#FFFFFF',
              text_alignment_horizontal: 'center',
              background: [{ type: 'solid', color: '#007AFF' }],
              paddings: { top: 12, bottom: 12, left: 24, right: 24 },
              border: { corner_radius: 8 },
              actions: [
                {
                  log_id: 'custom_tap',
                  url: 'divkit://custom_action?param=value',
                },
              ],
            },
            {
              type: 'text',
              text: 'Counter: @{counter}',
              font_size: 18,
              text_color: '#333333',
              text_alignment_horizontal: 'center',
              margins: { top: 16 },
            },
            {
              type: 'text',
              text: 'Increment Counter',
              font_size: 14,
              text_color: '#FFFFFF',
              text_alignment_horizontal: 'center',
              background: [{ type: 'solid', color: '#34C759' }],
              paddings: { top: 10, bottom: 10, left: 20, right: 20 },
              border: { corner_radius: 8 },
              margins: { top: 12 },
              actions: [
                {
                  log_id: 'increment',
                  typed: {
                    type: 'set_variable',
                    variable_name: 'counter',
                    value: { type: 'integer', value: '@{counter + 1}' },
                  },
                },
              ],
            },
          ],
        },
      },
    ],
    variables: [{ type: 'integer', name: 'counter', value: 0 }],
  },
};

// Example configurations
const examples = [
  {
    name: 'Stories',
    data: storiesJson,
    description: 'Complex layout with templates and variables',
  },
  {
    name: 'Start',
    data: startJson,
    description: 'Intro to templates and actions',
  },
  { name: 'Text', data: simpleTextJson, description: 'Basic text component' },
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
];

function AppContent() {
  const [selectedExample, setSelectedExample] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logCounterRef = useRef(0);

  const currentExample = examples[selectedExample];

  // Add log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${++logCounterRef.current}] ${timestamp}: ${message}`;
    setLogs(prev => [...prev.slice(-9), logEntry]);
    console.log(logEntry);
  }, []);

  // Callbacks
  const handleStat: DivKitProps['onStat'] = useCallback(
    stat => {
      addLog(`Stat: ${stat.type} - ${stat.action.log_id}`);
    },
    [addLog],
  );

  const handleCustomAction: DivKitProps['onCustomAction'] = useCallback(
    action => {
      addLog(`Custom Action: ${action.url}`);
      Alert.alert('Custom Action', `URL: ${action.url}`);
    },
    [addLog],
  );

  const handleError: DivKitProps['onError'] = useCallback(
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
        horizontal
        style={styles.exampleSelector}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContent}
      >
        {examples.map((example, index) => (
          <TouchableOpacity
            key={index}
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
        style={styles.divKitContainer}
        contentContainerStyle={styles.divKitContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <DivKit
          key={selectedExample} // Force re-mount on example change
          data={currentExample.data}
          onStat={handleStat}
          onCustomAction={handleCustomAction}
          onError={handleError}
          direction="ltr"
          platform="touch"
          style={styles.divKit}
        />
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

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
