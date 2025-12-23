import { Text, ListBox, ListBoxItem } from 'react-aria-components';

type Props = {
    width: number,
    height: number,
}

export const Help = (props: Props) => {
    const { width, height } = props;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
            <ListBox layout="grid" aria-label="Mouse kline" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
                <ListBoxItem textValue="A">
                    <Text className='value-value'>Double click on chart: </Text>
                    <Text className='value-refer'>Put a reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="B">
                    <Text className='value-value'>Double click on axis-y part: </Text>
                    <Text className='value-refer'>Remove reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="C">
                    <Text className='value-value'>Left/Right arrow: </Text>
                    <Text className='value-refer'>Keep reference cursor, move chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="D">
                    <Text className='value-value'>Ctrl + Left/Right arrow: </Text>
                    <Text className='value-refer'>Keep chart, move reference cursor</Text>
                </ListBoxItem>
            </ListBox>

            <ListBox layout="grid" aria-label="Refer kline" style={{ textAlign: 'left' }}>
                <ListBoxItem textValue="A">
                    <Text className='value-value'>ESC: </Text>
                    <Text className='value-refer'>Remove reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="B">
                    <Text className='value-value'>Up/Down arrow: </Text>
                    <Text className='value-refer'>Zoom in/out chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="C">
                    <Text className='value-value'>Space: </Text>
                    <Text className='value-refer'>Switch fast/normal moving speed</Text>
                </ListBoxItem>
                <ListBoxItem textValue="D">
                    <Text className='value-value'>Mouse wheel: </Text>
                    <Text className='value-refer'>Keep reference cursor, move chart</Text>
                </ListBoxItem>
            </ListBox>
        </div>

    )

}
