import React from 'react';
import { render } from '@testing-library/react-native';
import { DivKit } from '../../src';

export function renderDivKit(json: any) {
    return render(React.createElement(DivKit, { id: 'test', data: json }));
}

export function makeCard(div: any) {
    return {
        card: {
            log_id: 'test',
            states: [{ state_id: 0, div }]
        }
    };
}
