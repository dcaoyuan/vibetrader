import { ChartPane } from "./ChartPane"

export interface WithVolumePane {

  maxVolume: number

  minVolume: number

  volumeChartPane: ChartPane
}

export function withVolumePane(view: any): view is WithVolumePane {
  return 'volumeChartPane' in view;
}

