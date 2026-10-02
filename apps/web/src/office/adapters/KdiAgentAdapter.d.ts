import type { KdiAgentProjection, OfficeAgentStatus } from '../types';
export interface RawEmployee {
    agentId?: string;
    id?: string;
    name?: string;
    displayName?: string;
    role?: string;
    department?: string;
    room?: string;
    currentState?: string;
    status?: string;
    currentTaskId?: string;
    currentTaskTitle?: string;
    currentProjectId?: string;
    currentActivity?: string;
    activity?: string;
    toolsInUse?: string[];
    lastActiveTimestamp?: string;
}
export declare class KdiAgentAdapter {
    static resolveCharacterKey(rawId: string, rawRole?: string, rawName?: string): 'farhan' | 'rian' | 'ahmad' | 'nadia' | 'maya' | 'naya';
    static normalizeStatus(rawStatus?: string): OfficeAgentStatus;
    static toProjection(raw: RawEmployee): KdiAgentProjection;
    static toProjections(rawList: RawEmployee[]): KdiAgentProjection[];
}
