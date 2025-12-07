import { Text, ListBox, ListBoxItem } from 'react-aria-components';

type Props = {
    width: number,
    height: number,
}

export const Help = (props: Props) => {
    const { width, height } = props;

    const lColor = '#F00000'; // Theme.now().axisColor
    const rColor = '#00F0F0'; // 'orange'
    const mColor = '#00F000'; // Theme.now().axisColor 

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
            <ListBox layout="grid" aria-label="Mouse kline" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
                <ListBoxItem textValue="A">
                    <Text style={{ color: mColor }}>Click on chart: </Text>
                    <Text style={{ color: rColor }}>Put a reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="B">
                    <Text style={{ color: mColor }}>Click on chart view: </Text>
                    <Text style={{ color: rColor }}>Gain keyboard focus</Text>
                </ListBoxItem>
                <ListBoxItem textValue="C">
                    <Text style={{ color: mColor }}>Left/Right arrow: </Text>
                    <Text style={{ color: rColor }}>Keep reference cursor, move chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="D">
                    <Text style={{ color: mColor }}>Ctrl + Left/Right arrow: </Text>
                    <Text style={{ color: rColor }}>Keep chart, move reference cursor</Text>
                </ListBoxItem>
            </ListBox>

            <ListBox layout="grid" aria-label="Refer kline" style={{ textAlign: 'left' }}>
                <ListBoxItem textValue="A">
                    <Text style={{ color: mColor }}>ESC: </Text>
                    <Text style={{ color: rColor }}>Remove reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="B">
                    <Text style={{ color: mColor }}>Up/Down arrow: </Text>
                    <Text style={{ color: rColor }}>Zoom in/out chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="C">
                    <Text style={{ color: mColor }}>Space: </Text>
                    <Text style={{ color: rColor }}>Swich fast/normal moving speed</Text>
                </ListBoxItem>
                <ListBoxItem textValue="D">
                    <Text style={{ color: mColor }}>Mouse wheel: </Text>
                    <Text style={{ color: rColor }}>Keep reference cursor, move chart</Text>
                </ListBoxItem>
            </ListBox>
        </div>

    )

}
