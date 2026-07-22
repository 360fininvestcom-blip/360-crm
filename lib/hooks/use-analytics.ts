import useSWR from 'swr';
import { fetchAnalytics, AnalyticsData } from '@/actions/analytics';

export type { AnalyticsData };

export function useAnalytics(ownerId?: string, days: number = 7, pipelineId?: string) {
    return useSWR(
        ['dashboard-analytics', ownerId, days, pipelineId],
        () => fetchAnalytics(ownerId, days, pipelineId),
        {
            refreshInterval: 60000,
            revalidateOnFocus: false
        }
    );
}
