import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getMetricsSummary, getMetricsTimeseries, getRecentTurns, type MetricsRange } from '../../shared/api/metrics'

const opts = { refetchInterval: 20000, refetchIntervalInBackground: false, placeholderData: keepPreviousData } as const
export const useMetricsSummary = (r: MetricsRange) => useQuery({ queryKey: ['metrics', 'summary', r], queryFn: () => getMetricsSummary(r), ...opts })
export const useMetricsSeries = (r: MetricsRange) => useQuery({ queryKey: ['metrics', 'series', r], queryFn: () => getMetricsTimeseries(r), ...opts })
export const useRecentTurns = () => useQuery({ queryKey: ['metrics', 'turns'], queryFn: () => getRecentTurns(50), ...opts })
