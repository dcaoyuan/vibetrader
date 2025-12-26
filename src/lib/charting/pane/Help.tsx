import { ListBox, ListBoxItem, Separator } from 'react-aria-components';

export const Help = () => {

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
            <ListBox layout="grid" aria-label="Mouse kline" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
                <ListBoxItem textValue="DRAG">
                    <span className='label-mouse'>Drag: </span>
                    <span className='label-refer'>Move chart</span>
                </ListBoxItem>
                <ListBoxItem textValue="CDRAG">
                    <span className='label-mouse'>CTRL + Drag: </span>
                    <span className='label-refer'>Scale chart</span>
                </ListBoxItem>
                <ListBoxItem textValue="DCLICK">
                    <span className='label-mouse'>DoubleClick on chart: </span>
                    <span className='label-refer'>Put a reference cursor</span>
                </ListBoxItem>
                <ListBoxItem textValue="DCLICK2">
                    <span className='label-mouse'>DoubleClick on axis-y: </span>
                    <span className='label-refer'>Remove reference cursor</span>
                </ListBoxItem>
                <ListBoxItem textValue="WHEEL">
                    <span className='label-mouse'>Wheel: </span>
                    <span className='label-refer'>Move chart</span>
                </ListBoxItem>
                <ListBoxItem textValue="SWHEEL">
                    <span className='label-mouse'>SHIFT + Wheel: </span>
                    <span className='label-refer'>Zoom in/out Chart</span>
                </ListBoxItem>

                <Separator orientation="horizontal" />

                <ListBoxItem textValue="LRARROW">
                    <span className='label-mouse'>LEFT/RIGHT arrow: </span>
                    <span className='label-refer'>Move chart</span>
                </ListBoxItem>
                <ListBoxItem textValue="CLRARROW">
                    <span className='label-mouse'>CTRL + LEFT/RIGHT arrow: </span>
                    <span className='label-refer'>Move reference cursor</span>
                </ListBoxItem>
                <ListBoxItem textValue="ESC">
                    <span className='label-mouse'>ESC: </span>
                    <span className='label-refer'>Remove reference cursor / Hide crosshair</span>
                </ListBoxItem>
                <ListBoxItem textValue="UDARROW">
                    <span className='label-mouse'>UP/DOWN arrow: </span>
                    <span className='label-refer'>Zoom in/out chart</span>
                </ListBoxItem>
                <ListBoxItem textValue="SPACE">
                    <span className='label-mouse'>SPACE: </span>
                    <span className='label-refer'>Switch fast moving speed</span>
                </ListBoxItem>

                <Separator orientation="horizontal" />

                <ListBoxItem textValue="CDRAWING">
                    <span className='label-mouse'>Click on drawing: </span>
                    <span className='label-refer'>Select it</span>
                </ListBoxItem>
                <ListBoxItem textValue="CCDRAWING">
                    <span className='label-mouse'>CTRL + Click: </span>
                    <span className='label-refer'>Complete variable-handle drawing</span>
                </ListBoxItem>
                <ListBoxItem textValue="CCDRAWINGH">
                    <span className='label-mouse'>CTRL + Click on variable-handle drawing's handle: </span>
                    <span className='label-refer'>Remove this handle</span>
                </ListBoxItem>
                <ListBoxItem textValue="CCDRAWINGS">
                    <span className='label-mouse'>CTRL + Drag on variable-handle drawing's segment: </span>
                    <span className='label-refer'>Insert a handle</span>
                </ListBoxItem>

                <Separator orientation="horizontal" />

                <ListBoxItem textValue="ESC2">
                    <span className='label-mouse'>ESC: </span>
                    <span className='label-refer'>Unselect drawing</span>
                </ListBoxItem>

                <ListBoxItem textValue="DEL">
                    <span className='label-mouse'>DELETE: </span>
                    <span className='label-refer'>Delete selected drawing</span>
                </ListBoxItem>
            </ListBox>
        </div>

    )

}
