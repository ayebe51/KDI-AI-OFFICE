import { SecretSanitizer } from '../security/SecretSanitizer.ts';
const DESK_SEATS = {
    farhan: { x: 9, y: 11, facing: 'up' },
    rian: { x: 14, y: 11, facing: 'up' },
    ahmad: { x: 19, y: 11, facing: 'up' },
    nadia: { x: 9, y: 18, facing: 'down' },
    maya: { x: 14, y: 18, facing: 'down' },
    naya: { x: 19, y: 18, facing: 'down' },
    orchestrator: { x: 14, y: 5, facing: 'down' },
};
export class KdiAgentAdapter {
    static resolveCharacterKey(rawId, rawRole, rawName) {
        const text = `${rawId} ${rawRole || ''} ${rawName || ''}`.toLowerCase();
        if (text.includes('farhan') || text.includes('eng-001') || text.includes('software_engineer'))
            return 'farhan';
        if (text.includes('rian') || text.includes('mgr-001') || text.includes('frontend') || text.includes('3d'))
            return 'rian';
        if (text.includes('ahmad') || text.includes('arch') || text.includes('systems_architect'))
            return 'ahmad';
        if (text.includes('nadia') || text.includes('qa') || text.includes('security'))
            return 'nadia';
        if (text.includes('maya') || text.includes('prod') || text.includes('delivery'))
            return 'maya';
        if (text.includes('naya') || text.includes('sales') || text.includes('client'))
            return 'naya';
        return 'farhan';
    }
    static normalizeStatus(rawStatus) {
        if (!rawStatus)
            return 'IDLE';
        const s = rawStatus.toUpperCase().replace(/\s+/g, '_');
        switch (s) {
            case 'IDLE':
            case 'AVAILABLE':
                return 'IDLE';
            case 'PLANNING':
                return 'PLANNING';
            case 'CODING':
            case 'BUSY':
            case 'EXECUTING':
                return 'CODING';
            case 'DEBUGGING':
                return 'DEBUGGING';
            case 'TESTING':
                return 'TESTING';
            case 'REVIEWING':
                return 'REVIEWING';
            case 'MEETING':
                return 'MEETING';
            case 'WAITING':
                return 'WAITING';
            case 'WAITING_APPROVAL':
                return 'WAITING_APPROVAL';
            case 'BLOCKED':
                return 'BLOCKED';
            case 'PRAYING':
                return 'PRAYING';
            case 'COMPLETED':
                return 'COMPLETED';
            default:
                return 'WORKING';
        }
    }
    static toProjection(raw) {
        const id = raw.agentId || raw.id || 'AGT-UNKNOWN';
        const charKey = this.resolveCharacterKey(id, raw.role, raw.name || raw.displayName);
        const seat = DESK_SEATS[charKey] || { x: 10, y: 10, facing: 'down' };
        let displayName = raw.displayName || raw.name || charKey.toUpperCase();
        if (displayName.includes('(')) {
            displayName = displayName.split('(')[0].trim();
        }
        const activity = raw.currentActivity || raw.activity;
        const sanitizedActivity = activity ? SecretSanitizer.sanitize(activity) : undefined;
        const sanitizedTaskTitle = raw.currentTaskTitle ? SecretSanitizer.sanitize(raw.currentTaskTitle) : undefined;
        return {
            id,
            displayName,
            role: raw.role || 'Autonomous AI Specialist',
            status: this.normalizeStatus(raw.currentState || raw.status),
            department: raw.department || 'Autonomous Engineering',
            room: raw.room || 'Open Engineering Floor',
            characterKey: charKey,
            currentTaskId: raw.currentTaskId,
            currentTaskTitle: sanitizedTaskTitle,
            currentProjectId: raw.currentProjectId,
            activity: sanitizedActivity,
            officeLocation: raw.room || 'Engineering Desk',
            seatLocation: seat,
            toolsInUse: raw.toolsInUse,
            lastActiveTimestamp: raw.lastActiveTimestamp || new Date().toISOString(),
            isOverloaded: raw.isOverloaded ?? (raw.utilizationPercent ? raw.utilizationPercent >= 85 : false),
            workloadLevel: raw.workloadLevel ?? (raw.utilizationPercent && raw.utilizationPercent >= 85 ? 'OVERLOADED' : 'NORMAL'),
        };
    }
    static toProjections(rawList) {
        return (rawList || []).map((item) => this.toProjection(item));
    }
}
//# sourceMappingURL=KdiAgentAdapter.js.map