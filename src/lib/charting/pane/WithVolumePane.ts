import type { ChartYControl } from "../view/ChartYControl";

export interface WithVolumePane {

  maxVolume: number

  minVolume: number

  volumeChartPane: ChartYControl
}

export function withVolumePane(view: any): view is WithVolumePane {
  return 'volumeChartPane' in view;
}

