import { Divider } from '@react-spectrum/s2';

export const Help = () => {

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
            <div style={{ textAlign: 'left', fontFamily: 'monospace' }}>
                <div>
                    <span className='label-mouse'>Click on ticker: </span>
                    <span className='label-refer'>Select ticker</span>
                </div>
                <div>
                    <span className='label-mouse'>Clock on timeframe: </span>
                    <span className='label-refer'>Select timeframe</span>
                </div>

                <Divider orientation="horizontal" />

                <div>
                    <span className='label-mouse'>Drag: </span>
                    <span className='label-refer'>Move chart</span>
                </div>
                <div>
                    <span className='label-mouse'>CTRL + Drag: </span>
                    <span className='label-refer'>Scale chart</span>
                </div>
                <div>
                    <span className='label-mouse'>DoubleClick on chart: </span>
                    <span className='label-refer'>Put a reference cursor</span>
                </div>
                <div>
                    <span className='label-mouse'>DoubleClick on axis-y: </span>
                    <span className='label-refer'>Remove reference cursor</span>
                </div>
                <div>
                    <span className='label-mouse'>Wheel: </span>
                    <span className='label-refer'>Move chart</span>
                </div>
                <div>
                    <span className='label-mouse'>SHIFT + Wheel: </span>
                    <span className='label-refer'>Zoom in/out Chart</span>
                </div>

                <Divider orientation="horizontal" />

                <div>
                    <span className='label-mouse'>LEFT/RIGHT arrow: </span>
                    <span className='label-refer'>Move chart</span>
                </div>
                <div>
                    <span className='label-mouse'>CTRL + LEFT/RIGHT arrow: </span>
                    <span className='label-refer'>Move reference cursor</span>
                </div>
                <div>
                    <span className='label-mouse'>ESC: </span>
                    <span className='label-refer'>Remove reference cursor / Hide crosshair</span>
                </div>
                <div>
                    <span className='label-mouse'>UP/DOWN arrow: </span>
                    <span className='label-refer'>Zoom in/out chart</span>
                </div>
                <div>
                    <span className='label-mouse'>SPACE: </span>
                    <span className='label-refer'>Switch fast moving speed</span>
                </div>

                <Divider orientation="horizontal" />

                <div>
                    <span className='label-mouse'>Click on drawing: </span>
                    <span className='label-refer'>Select it</span>
                </div>
                <div>
                    <span className='label-mouse'>CTRL + Click: </span>
                    <span className='label-refer'>Complete variable-handle drawing</span>
                </div>
                <div>
                    <span className='label-mouse'>CTRL + Click on variable-handle drawing's handle: </span>
                    <span className='label-refer'>Remove this handle</span>
                </div>
                <div>
                    <span className='label-mouse'>CTRL + Drag on variable-handle drawing's segment: </span>
                    <span className='label-refer'>Insert a handle</span>
                </div>

                <Divider orientation="horizontal" />

                <div>
                    <span className='label-mouse'>ESC: </span>
                    <span className='label-refer'>Unselect drawing</span>
                </div>

                <div>
                    <span className='label-mouse'>DELETE: </span>
                    <span className='label-refer'>Delete selected drawing</span>
                </div>
            </div>
        </div>

    )

}
