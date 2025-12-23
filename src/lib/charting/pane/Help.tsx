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
                    <Text className='label-mouse'>Double click on chart: </Text>
                    <Text className='label-refer'>Put a reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="B">
                    <Text className='label-mouse'>Double click on axis-y part: </Text>
                    <Text className='label-refer'>Remove reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="C">
                    <Text className='label-mouse'>Left/Right arrow: </Text>
                    <Text className='label-refer'>Keep reference cursor, move chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="D">
                    <Text className='label-mouse'>Ctrl + Left/Right arrow: </Text>
                    <Text className='label-refer'>Keep chart, move reference cursor</Text>
                </ListBoxItem>
            </ListBox>

            <ListBox layout="grid" aria-label="Refer kline" style={{ textAlign: 'left' }}>
                <ListBoxItem textValue="A">
                    <Text className='label-mouse'>ESC: </Text>
                    <Text className='label-refer'>Remove reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="B">
                    <Text className='label-mouse'>Up/Down arrow: </Text>
                    <Text className='label-refer'>Zoom in/out chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="C">
                    <Text className='label-mouse'>Space: </Text>
                    <Text className='label-refer'>Switch fast/normal moving speed</Text>
                </ListBoxItem>
                <ListBoxItem textValue="D">
                    <Text className='label-mouse'>Mouse wheel: </Text>
                    <Text className='label-refer'>Keep reference cursor, move chart</Text>
                </ListBoxItem>
            </ListBox>
        </div>

    )

}
