import { Text, ListBox, ListBoxItem, Separator } from 'react-aria-components';

export const Help = () => {

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
            <ListBox layout="grid" aria-label="Mouse kline" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
                <ListBoxItem textValue="1">
                    <Text className='label-mouse'>Drag: </Text>
                    <Text className='label-refer'>Move chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="2">
                    <Text className='label-mouse'>CTRL + Drag: </Text>
                    <Text className='label-refer'>Scale chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="1">
                    <Text className='label-mouse'>DoubleClick on chart: </Text>
                    <Text className='label-refer'>Put a reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="2">
                    <Text className='label-mouse'>DoubleClick on axis-y: </Text>
                    <Text className='label-refer'>Remove reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="8">
                    <Text className='label-mouse'>Wheel: </Text>
                    <Text className='label-refer'>Move chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="8">
                    <Text className='label-mouse'>SHIFT + Wheel: </Text>
                    <Text className='label-refer'>Zoom in/out Chart</Text>
                </ListBoxItem>

                <Separator orientation="horizontal" />

                <ListBoxItem textValue="3">
                    <Text className='label-mouse'>LEFT/RIGHT arrow: </Text>
                    <Text className='label-refer'>Move chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="4">
                    <Text className='label-mouse'>CTRL + LEFT/RIGHT arrow: </Text>
                    <Text className='label-refer'>Move reference cursor</Text>
                </ListBoxItem>
                <ListBoxItem textValue="5">
                    <Text className='label-mouse'>ESC: </Text>
                    <Text className='label-refer'>Remove reference cursor / Hide crosshair</Text>
                </ListBoxItem>
                <ListBoxItem textValue="6">
                    <Text className='label-mouse'>UP/DOWN arrow: </Text>
                    <Text className='label-refer'>Zoom in/out chart</Text>
                </ListBoxItem>
                <ListBoxItem textValue="7">
                    <Text className='label-mouse'>SPACE: </Text>
                    <Text className='label-refer'>Switch fast moving speed</Text>
                </ListBoxItem>

                <Separator orientation="horizontal" />

                <ListBoxItem textValue="3">
                    <Text className='label-mouse'>Click on Drawing: </Text>
                    <Text className='label-refer'>Select it</Text>
                </ListBoxItem>
                <ListBoxItem textValue="4">
                    <Text className='label-mouse'>CTRL + Click: </Text>
                    <Text className='label-refer'>Complete variable-handle drawing</Text>
                </ListBoxItem>
                <ListBoxItem textValue="4">
                    <Text className='label-mouse'>CTRL + Click on variable-handle drawing's handle: </Text>
                    <Text className='label-refer'>Remove this handle</Text>
                </ListBoxItem>
                <ListBoxItem textValue="4">
                    <Text className='label-mouse'>CTRL + Drag on variable-handle drawing's segment: </Text>
                    <Text className='label-refer'>Insert a handle</Text>
                </ListBoxItem>

                <Separator orientation="horizontal" />

                <ListBoxItem textValue="5">
                    <Text className='label-mouse'>ESC: </Text>
                    <Text className='label-refer'>Unselect drawing</Text>
                </ListBoxItem>

                <ListBoxItem textValue="5">
                    <Text className='label-mouse'>DELETE: </Text>
                    <Text className='label-refer'>Delete selected drawing</Text>
                </ListBoxItem>
            </ListBox>
        </div>

    )

}
